const express = require('express');
const nodemailer = require('nodemailer');
const { verifyToken, getFileSHAAndContent } = require('../utils');

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  try {
    const auth = req.headers.authorization?.split(' ')[1];
    const payload = verifyToken(auth);
    if (!payload) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { number } = req.body;
    if (!number) return res.status(400).json({ success: false, message: 'Nomor belum diisi' });

    const { contentB64 } = await getFileSHAAndContent();
    const users = JSON.parse(Buffer.from(contentB64, 'base64').toString('utf8')) || {};
    const user = users[payload.telegramId];
    if (!user) return res.status(403).json({ success: false, message: 'Belum menambahkan Gmail (gunakan /addgmail di bot)' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.email, pass: user.appPassword }
    });

    await transporter.sendMail({
      from: user.email,
      to: 'smb@support.whatsapp.com',
      subject: 'Question about WhatsApp Business for Android',
      text: `Halo Tim WhatsApp Support,\n\nSaya ingin melaporkan masalah dengan nomor ${number}.\nSetiap kali saya mencoba login muncul pesan “Login Tidak Tersedia Saat Ini”. Mohon bantuannya agar akun saya bisa dipulihkan.\n\nTerima kasih.`
    });

    res.json({ success: true, message: '✅ Email berhasil dikirim ke WhatsApp Support!' });
  } catch (err) {
    console.error('sendmail error:', err);
    res.status(500).json({ success: false, message: '❌ Gagal mengirim email.' });
  }
});

module.exports = app;