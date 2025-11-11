// api/sendmail.js
const nodemailer = require('nodemailer');
const { getFileSHAAndContent, verifyToken } = require('../utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const payload = verifyToken(token);
    if (!payload?.telegramId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { number } = req.body || {};
    if (!number) return res.status(400).json({ success: false, message: 'Nomor WhatsApp belum diisi!' });

    const { contentB64 } = await getFileSHAAndContent();
    const users = JSON.parse(Buffer.from(contentB64, 'base64').toString('utf8')) || {};
    const user = users[payload.telegramId];
    if (!user) return res.status(403).json({ success: false, message: 'Silakan /addgmail dulu di bot.' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.email, pass: user.appPassword }
    });

    await transporter.sendMail({
      from: user.email,
      to: 'smb@support.whatsapp.com',
      subject: 'Question about WhatsApp Business for Android',
      text: `Halo Tim Dukungan WhatsApp,
      
      Saya ingin melaporkan masalah terkait nomor WhatsApp saya.
      Saat mencoba melakukan pendaftaran, setiap kali saya ingin masuk selalu muncul pesan “Login Tidak Tersedia Saat Ini”.
      
      Saya sangat berharap pihak WhatsApp dapat membantu agar saya bisa menggunakan kembali nomor saya ${number} tanpa muncul kendala tersebut.
      Terima kasih atas perhatian dan bantuannya.`
    });

    res.json({ success: true, message: '✅ Email berhasil dikirim ke WhatsApp Support!' });
  } catch (err) {
    res.status(500).json({ success: false, message: '❌ Gagal mengirim email.' });
  }
};
