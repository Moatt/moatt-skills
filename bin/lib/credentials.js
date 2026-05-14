

const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR_NAME = '.moatt';
const FILE_NAME = 'credentials.json';

function credentialsDir() {
  return path.join(os.homedir(), DIR_NAME);
}

function credentialsPath() {
  return path.join(credentialsDir(), FILE_NAME);
}

function read() {
  const file = credentialsPath();
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${file}: ${err.message}`);
  }
}

function write(obj) {
  const dir = credentialsDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  try { fs.chmodSync(dir, 0o700); } catch {}

  const file = credentialsPath();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), { mode: 0o600 });
  try { fs.chmodSync(tmp, 0o600); } catch {}
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch {}
}

function clear() {
  const file = credentialsPath();
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

function requireCreds() {
  const creds = read();
  if (!creds || !creds.api_key) {
    throw new Error(
      'Not logged in. Run "npx moatt login" first.'
    );
  }
  return creds;
}

module.exports = {
  credentialsDir,
  credentialsPath,
  read,
  write,
  clear,
  requireCreds,
};
