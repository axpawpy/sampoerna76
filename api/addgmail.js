// api/addgmail.js
const express = require('express');
const { verifyToken, getFileSHAAndContent, putFileContent } = require('../utils');

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  try {
    // === Authorization Check ===
    const auth = req.headers.authorization?.split(' ')[1];
    if (!auth) return res.status(401).json({ success: false, message: 'Missing Authorization header' });

    const payload = verifyToken(auth);
    if (!payload) return res.status(401).json({ success: false, message: 'Invalid or expired token' });

    // === Data Validation ===
    const { email, appPassword } = req.body;
    if (!email || !appPassword)
      return res.status(400).json({ success: false, message: 'Missing email or appPassword' });

    // === Read existing data from GitHub ===
    const { sha, contentB64 } = await getFileSHAAndContent();
    const users = contentB64
      ? JSON.parse(Buffer.from(contentB64, 'base64').toString('utf8'))
      : {};

    // === Update user data ===
    users[payload.telegramId] = {
      email,
      appPassword,
      updated: new Date().toISOString(),
    };

    // === Push back to GitHub ===
    await putFileContent(users, sha, `update gmail for ${payload.telegramId}`);

    res.json({ success: true, message: '✅ Email & App Password berhasil disimpan' });
  } catch (e) {
    console.error('addgmail error:', e);
    res.status(500).json({ success: false, message: e.message || 'Internal Server Error' });
  }
});

// Port opsional (kalau run manual)
if (require.main === module) {
  app.listen(3001, () => console.log('✅ addgmail.js running on port 3001'));
}

module.exports = app;
