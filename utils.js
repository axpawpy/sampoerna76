const crypto = require('crypto');
const fetch = require('node-fetch');

const CONFIG = {
  GITHUB_OWNER: process.env.GITHUB_OWNER || "axpawpy",
  GITHUB_REPO: process.env.GITHUB_REPO || "pandahpeler",
  GITHUB_PATH: process.env.GITHUB_PATH || "users.json",
  GITHUB_BRANCH: process.env.GITHUB_BRANCH || "main",
  SIGNING_SECRET: process.env.SIGNING_SECRET || "secret123"
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

function signToken(payload) {
  const b = Buffer.from(JSON.stringify(payload)).toString('base64');
  const mac = crypto.createHmac('sha256', CONFIG.SIGNING_SECRET).update(b).digest('hex');
  return `${b}.${mac}`;
}

function verifyToken(token) {
  try {
    const [b, mac] = (token || '').split('.');
    if (!b || !mac) return null;
    const expected = crypto.createHmac('sha256', CONFIG.SIGNING_SECRET).update(b).digest('hex');
    if (expected !== mac) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getFileSHAAndContent() {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${CONFIG.GITHUB_PATH}?ref=${CONFIG.GITHUB_BRANCH}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (!r.ok) throw new Error(`GitHub GET failed: ${r.status}`);
  const j = await r.json();
  return { sha: j.sha, contentB64: j.content };
}

async function putFileContent(newUsers, sha, commitMessage) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${CONFIG.GITHUB_PATH}`;
  const contentB64 = Buffer.from(JSON.stringify(newUsers, null, 2)).toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: commitMessage,
      branch: CONFIG.GITHUB_BRANCH,
      content: contentB64,
      sha
    })
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`);
  return await res.json();
}

module.exports = { CONFIG, signToken, verifyToken, getFileSHAAndContent, putFileContent };