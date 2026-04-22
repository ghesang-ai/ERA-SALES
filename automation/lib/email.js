// Membaca email terbaru dari Melati via IMAP dan extract link + password
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

async function getLatestEmail() {
  const client = new ImapFlow({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    logger: false,
    tls: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    await client.mailboxOpen('INBOX');

    // Cari email dari Melati yang masuk hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uids = await client.search(
      { from: process.env.EMAIL_FROM, since: today, subject: 'Sales vs Stock B2C Region 5' },
      { uid: true }
    );

    if (!uids || uids.length === 0) {
      return null;
    }

    // Ambil email paling baru (UID terbesar)
    const latestUid = uids[uids.length - 1];

    let emailData = null;
    for await (const msg of client.fetch([latestUid], { source: true }, { uid: true })) {
      const parsed = await simpleParser(msg.source);
      const body = parsed.text || '';

      // Extract link Nextcloud
      const linkMatch = body.match(/https:\/\/drive\.erajaya\.com\/index\.php\/s\/([A-Za-z0-9]+)/);
      // Extract password (bisa berupa kombinasi huruf, angka, simbol umum)
      const passwordMatch = body.match(/Password\s*[:\s]+([^\s\n\r]+)/i);

      if (linkMatch && passwordMatch) {
        emailData = {
          subject: parsed.subject || '',
          link: linkMatch[0],
          token: linkMatch[1],
          password: passwordMatch[1].trim()
        };
      }
    }

    // Tandai email sebagai sudah dibaca supaya besok tidak terproses ulang
    if (emailData) {
      await client.messageFlagsAdd([latestUid], ['\\Seen'], { uid: true });
      console.log(`   Subjek: ${emailData.subject}`);
    }

    return emailData;

  } finally {
    await client.logout();
  }
}

module.exports = { getLatestEmail };
