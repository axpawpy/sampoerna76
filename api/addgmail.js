const express = require('express');
const { verifyToken, getFileSHAAndContent, putFileContent } = require('../utils');

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  const payload = verifyToken(auth);
  if (!payload) return res.status(401).json({ success: false, message: 'Invalid or expired token' });

  const { email, appPassword } = req.body;
  if (!email || !appPassword)
    return res.status(400).json({ success: false, message: 'Missing email or appPassword' });

  try {
    const { sha, contentB64 } = await getFileSHAAndContent();
    const users = JSON.parse(Buffer.from(contentB64, 'base64').toString('utf8')) || {};
    users[payload.telegramId] = {
      email,
      appPassword,
      updated: new Date().toISOString()
    };

    await putFileContent(users, sha, `update gmail for ${payload.telegramId}`);
    res.json({ success: true, message: '✅ Email & appPassword berhasil disimpan!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = app;