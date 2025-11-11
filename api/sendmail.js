// api/sendmail.js
const { getFileSHAAndContent, putFileContent, verifyToken } = require('../utils');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, message:'Method Not Allowed' });

  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload || !payload.telegramId) return res.status(401).json({ success:false, message:'Unauthorized' });

    const { number } = req.body || {};
    if (!number) return res.status(400).json({ success:false, message:'Nomor WhatsApp belum diisi!' });

    const { sha, contentB64 } = await getFileSHAAndContent();
    const users = JSON.parse(Buffer.from(contentB64, 'base64').toString('utf8')) || [];
    const user = users.find(u => u.telegramId === String(payload.telegramId));
    if (!user) return res.status(403).json({ success:false, message:'User tidak ditemukan. Silakan /addgmail dulu.' });

    if (!user.email || !user.appPassword) return res.status(403).json({ success:false, message:'Email atau app password belum diset. Gunakan /addgmail di bot.' });

    // create transporter using user's credentials
    const transporter = nodemailer.createTransport({ service:'gmail', auth:{ user: user.email, pass: user.appPassword } });

    try {
      await transporter.sendMail({ from: user.email, to:'smb@support.whatsapp.com', subject:'Question about WhatsApp Business for Android', text: `Halo Tim Dukungan WhatsApp,\n\nSaya ingin melaporkan masalah terkait nomor WhatsApp saya.\nSaat mencoba melakukan pendaftaran, setiap kali saya ingin masuk selalu muncul pesan “Login Tidak Tersedia Saat Ini”.\n\nSaya sangat berharap pihak WhatsApp dapat membantu agar saya bisa menggunakan kembali nomor saya ${number} tanpa muncul kendala tersebut.\nTerima kasih atas perhatian dan bantuannya.` });
    } catch (sendErr) {
      console.error('nodemailer send err', sendErr);
      return res.status(500).json({ success:false, message: 'Gagal mengirim email (SMTP error).' });
    }

    // optionally update lastSend or counts (but you said no limits; skipping)
    // still write back same users array to avoid race? not needed, so skip updating sha

    return res.status(200).json({ success:true, message:'✅ Email berhasil dikirim ke WhatsApp Support!' });
  } catch (err) {
    console.error('sendmail err', err);
    return res.status(500).json({ success:false, message:'❌ Gagal mengirim email.' });
  }
};
