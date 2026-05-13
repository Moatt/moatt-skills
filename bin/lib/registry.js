

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const REPO = 'Karmable-AI/moatt-skills';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const INDEX_URL = `${RAW_BASE}/skills-index.json`;

const LOCAL_ROOT = process.env.MOATT_SKILLS_LOCAL || null;

let cachedIndex = null;

function fetch(url) {
  if (url.startsWith('file://')) {
    return Promise.resolve(fs.readFileSync(url.slice('file://'.length), 'utf8'));
  }
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https
        .get(u, { headers: { 'User-Agent': 'moatt-cli' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    };
    get(url);
  });
}

async function fetchBuffer(url) {
  if (url.startsWith('file://')) {
    return fs.readFileSync(url.slice('file://'.length));
  }
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https
        .get(u, { headers: { 'User-Agent': 'moatt-cli' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            return;
          }
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    };
    get(url);
  });
}

async function fetchIndex() {
  if (cachedIndex) return cachedIndex;
  try {
    if (LOCAL_ROOT) {
      const data = fs.readFileSync(path.join(LOCAL_ROOT, 'skills-index.json'), 'utf8');
      cachedIndex = JSON.parse(data);
      return cachedIndex;
    }
    const data = await fetch(INDEX_URL);
    cachedIndex = JSON.parse(data);
    return cachedIndex;
  } catch (err) {
    throw new Error(
      `Failed to fetch skill index: ${err.message}. Check your internet connection or set MOATT_SKILLS_LOCAL to a local checkout.`
    );
  }
}

async function getSkillBySlug(slug) {
  const index = await fetchIndex();
  return (index.skills || []).find((s) => s.slug === slug) || null;
}

async function getKitBySlug(slug) {
  const index = await fetchIndex();
  return (index.kits || []).find((p) => p.slug === slug) || null;
}

function rawUrl(repoRelPath) {
  if (LOCAL_ROOT) {

    return `file://${path.join(LOCAL_ROOT, repoRelPath)}`;
  }
  return `${RAW_BASE}/${repoRelPath}`;
}

module.exports = {
  REPO,
  BRANCH,
  RAW_BASE,
  INDEX_URL,
  fetch,
  fetchBuffer,
  fetchIndex,
  getSkillBySlug,
  getKitBySlug,
  rawUrl,
};
