#!/bin/bash
# ERA-SALES Mac Sync Setup
# Jalankan SEKALI: bash setup-mac.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Setup ERA-SALES Mac Sync..."
echo "Script dir: $SCRIPT_DIR"

# 1. Install dependencies
echo ""
echo "[1/3] Install Node.js packages..."
cd "$SCRIPT_DIR"
npm install imapflow mailparser xlsx @supabase/supabase-js

# 2. Buat file .env jika belum ada
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  echo ""
  echo "[2/3] File .env dibuat dari template."
  echo "      ⚠️  Edit file ini sebelum lanjut:"
  echo "      $SCRIPT_DIR/.env"
  echo ""
  echo "Isi dengan:"
  echo "  IMAP_USER = email erajaya kamu"
  echo "  IMAP_PASS = password email erajaya"
  echo "  SUPABASE_URL = URL project Supabase"
  echo "  SUPABASE_SERVICE_KEY = service_role key Supabase"
else
  echo "[2/3] File .env sudah ada, skip."
fi

# 3. Setup LaunchAgent (cron macOS) — setiap 1 jam sekali
echo ""
echo "[3/3] Setup LaunchAgent untuk auto-run setiap 1 jam..."

NODE_PATH=$(which node)
PLIST_PATH="$HOME/Library/LaunchAgents/com.erasales.sync.plist"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.erasales.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$SCRIPT_DIR/mac-sync.js</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>$SCRIPT_DIR/sync.log</string>
    <key>StandardErrorPath</key>
    <string>$SCRIPT_DIR/sync.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLIST

# Load LaunchAgent
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo ""
echo "✅ Setup selesai!"
echo ""
echo "LaunchAgent terdaftar: $PLIST_PATH"
echo "Script: $SCRIPT_DIR/mac-sync.js"
echo "Log: $SCRIPT_DIR/sync.log"
echo ""
echo "─────────────────────────────────────"
echo "TEST sekarang: node $SCRIPT_DIR/mac-sync.js"
echo "─────────────────────────────────────"
