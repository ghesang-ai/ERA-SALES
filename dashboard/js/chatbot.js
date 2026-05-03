// ERA-SALES ChatBot — Floating Assistant
// Vanilla JS, no dependencies. Reads window.ERA_DASHBOARD_CONTEXT for page data.

(function () {
  'use strict';

  const API = '/.netlify/functions/chat-bot';

  let isOpen    = false;
  let isLoading = false;
  let messages  = []; // { role: 'user'|'assistant', content: string }

  // ─── Inject DOM ─────────────────────────────────────────────
  function inject() {
    const root = document.createElement('div');
    root.id = 'era-chatbot';
    root.innerHTML = `
      <button id="chatbot-fab" aria-label="ERA-SALES Assistant">
        <span id="chatbot-fab-icon">💬</span>
      </button>

      <div id="chatbot-panel" class="chatbot-panel" aria-hidden="true" role="dialog" aria-label="ERA-SALES Chat Assistant">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">✦</div>
            <div>
              <div class="chatbot-title">ERA-SALES Assistant</div>
              <div class="chatbot-status" id="chatbot-status">Claude · Siap membantu</div>
            </div>
          </div>
          <div class="chatbot-header-actions">
            <button class="chatbot-clear-btn" id="chatbot-clear-btn" title="Hapus percakapan" aria-label="Hapus percakapan">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
            <button class="chatbot-close-btn" id="chatbot-close-btn" aria-label="Tutup chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chatbot-messages" id="chatbot-messages">
          <div class="chatbot-welcome" id="chatbot-welcome">
            <div class="chatbot-welcome-icon">✦</div>
            <div class="chatbot-welcome-text">
              <strong>ERA-SALES Assistant</strong>
              <p>Tanya saya tentang data penjualan, target, achievement TSH, atau performa brand di Region 5.</p>
            </div>
          </div>
        </div>

        <div class="chatbot-typing hidden" id="chatbot-typing">
          <div class="chatbot-typing-bubble">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div class="chatbot-input-area">
          <div class="chatbot-suggestions" id="chatbot-suggestions">
            <button class="chatbot-chip" data-q="Bagaimana performa TSH terbaik bulan ini?">🏆 TSH Terbaik</button>
            <button class="chatbot-chip" data-q="Berapa achievement penjualan saat ini?">📊 Achievement</button>
            <button class="chatbot-chip" data-q="Brand apa yang performanya paling bagus?">📱 Top Brand</button>
            <button class="chatbot-chip" data-q="Apa rekomendasi untuk meningkatkan penjualan?">💡 Rekomendasi</button>
          </div>
          <div class="chatbot-input-row">
            <textarea
              id="chatbot-input"
              class="chatbot-textarea"
              placeholder="Tanya tentang data sales..."
              rows="1"
              maxlength="600"
              aria-label="Pesan ke assistant"
            ></textarea>
            <button id="chatbot-send-btn" class="chatbot-send-btn" disabled aria-label="Kirim pesan">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  // ─── Open / Close ────────────────────────────────────────────
  function open() {
    isOpen = true;
    const panel = document.getElementById('chatbot-panel');
    const fab   = document.getElementById('chatbot-fab');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.classList.add('active');
    document.getElementById('chatbot-fab-icon').textContent = '✕';
    if (messages.length > 0) hideSuggestions();
    setTimeout(() => document.getElementById('chatbot-input')?.focus(), 300);
  }

  function close() {
    isOpen = false;
    const panel = document.getElementById('chatbot-panel');
    const fab   = document.getElementById('chatbot-fab');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.classList.remove('active');
    document.getElementById('chatbot-fab-icon').textContent = '💬';
  }

  function toggle() { isOpen ? close() : open(); }

  // ─── Suggestions ─────────────────────────────────────────────
  function hideSuggestions() {
    const el = document.getElementById('chatbot-suggestions');
    if (el) el.style.display = 'none';
  }

  function showSuggestions() {
    const el = document.getElementById('chatbot-suggestions');
    if (el) el.style.display = '';
  }

  // ─── Render ──────────────────────────────────────────────────
  function renderMessages() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    container.querySelectorAll('.chatbot-msg').forEach(el => el.remove());

    messages.forEach(msg => {
      const el = document.createElement('div');
      el.className = `chatbot-msg chatbot-msg-${msg.role}`;

      if (msg.role === 'assistant') {
        el.innerHTML = `
          <div class="chatbot-msg-avatar">✦</div>
          <div class="chatbot-msg-bubble">${renderMarkdown(msg.content)}</div>
        `;
      } else {
        el.innerHTML = `<div class="chatbot-msg-bubble">${esc(msg.content)}</div>`;
      }

      container.appendChild(el);
    });

    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 40);
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderMarkdown(raw) {
    return esc(raw)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^#### (.+)$/gm, '<h4 style="margin:.4rem 0 .15rem;font-size:.8rem;color:#1428A0">$1</h4>')
      .replace(/^### (.+)$/gm, '<h4 style="margin:.4rem 0 .15rem;font-size:.82rem;color:#1428A0">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="margin:.4rem 0 .15rem;font-size:.85rem;color:#1428A0">$1</h3>')
      .replace(/^# (.+)$/gm, '<h3 style="margin:.4rem 0 .15rem;font-size:.85rem;color:#1428A0">$1</h3>')
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[^]*?<\/li>\n?)+/g, s => `<ul style="padding-left:.9rem;margin:.2rem 0">${s}</ul>`)
      .replace(/\n{2,}/g, '</p><p style="margin:.3rem 0">')
      .replace(/\n/g, '<br>');
  }

  // ─── Send ────────────────────────────────────────────────────
  async function send(text) {
    text = text.trim();
    if (!text || isLoading) return;

    const input   = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');

    messages.push({ role: 'user', content: text });
    renderMessages();

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    hideSuggestions();

    isLoading = true;
    document.getElementById('chatbot-typing').classList.remove('hidden');
    document.getElementById('chatbot-status').textContent = 'Claude sedang mengetik...';
    const container = document.getElementById('chatbot-messages');
    if (container) container.scrollTop = container.scrollHeight;

    try {
      const context   = window.ERA_DASHBOARD_CONTEXT || {};
      const pageTitle = document.title || 'ERA-SALES';

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-16),
          context,
          pageTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const reply = data.content || '(Tidak ada respons)';
      messages.push({ role: 'assistant', content: reply });
      renderMessages();

      const shortModel = data.model
        ? (data.model.includes('sonnet') ? 'Sonnet' : data.model.includes('opus') ? 'Opus' : 'Haiku')
        : 'AI';
      document.getElementById('chatbot-status').textContent = `Claude ${shortModel} · Siap`;

    } catch (err) {
      const errMsg = `Maaf, ada kendala: ${err.message}. Silakan coba lagi.`;
      messages.push({ role: 'assistant', content: errMsg });
      renderMessages();
      document.getElementById('chatbot-status').textContent = 'Claude · Error – coba lagi';
    } finally {
      isLoading = false;
      document.getElementById('chatbot-typing').classList.add('hidden');
      sendBtn.disabled = !input.value.trim();
    }
  }

  // ─── Events ──────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById('chatbot-fab').addEventListener('click', toggle);
    document.getElementById('chatbot-close-btn').addEventListener('click', close);

    document.getElementById('chatbot-clear-btn').addEventListener('click', () => {
      messages = [];
      document.getElementById('chatbot-messages')
        .querySelectorAll('.chatbot-msg').forEach(el => el.remove());
      showSuggestions();
      document.getElementById('chatbot-status').textContent = 'Claude · Siap membantu';
    });

    const input   = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim() || isLoading;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 112) + 'px';
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });

    sendBtn.addEventListener('click', () => send(input.value));

    document.getElementById('chatbot-suggestions').addEventListener('click', e => {
      const chip = e.target.closest('.chatbot-chip');
      if (chip) send(chip.dataset.q);
    });

    // Close panel on outside click
    document.addEventListener('click', e => {
      if (isOpen) {
        const root = document.getElementById('era-chatbot');
        if (root && !root.contains(e.target)) close();
      }
    }, true);

    // Escape key closes
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  // ─── Init ────────────────────────────────────────────────────
  function init() {
    inject();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
