

const http = require('node:http');
const crypto = require('node:crypto');
const os = require('node:os');
const { spawn } = require('node:child_process');

const credentials = require('./credentials');

const DEFAULT_API_BASE = process.env.MOATT_API_BASE || 'https://moatt.com';
const TIMEOUT_MS = 5 * 60 * 1000;

function openBrowser(url) {

  let cmd;
  let args;
  if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    cmd = 'cmd';

    args = ['/c', 'start', '""', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {  });
    child.unref();
  } catch {

  }
}

function applyCors(res, origin) {

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 256 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

async function login(opts = {}) {
  const apiBase = (opts.apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
  const platform = `${process.platform}-${os.hostname().slice(0, 24)}`;

  const sid = crypto.randomBytes(16).toString('hex');
  const state = crypto.randomBytes(32).toString('hex');

  const result = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {

      if (req.method === 'OPTIONS') {
        applyCors(res, apiBase);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== 'POST' || (req.url !== '/' && req.url !== '/cb')) {
        applyCors(res, apiBase);
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      try {
        const body = await readJsonBody(req);

        if (!body || typeof body !== 'object') {
          throw new Error('Invalid payload');
        }
        if (body.state !== state) {
          throw new Error('State mismatch');
        }
        if (typeof body.apiKey !== 'string' || !body.apiKey.startsWith('mk_')) {
          throw new Error('Missing or malformed apiKey');
        }

        applyCors(res, apiBase);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));

        resolve(body);
      } catch (err) {
        applyCors(res, apiBase);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));

      }
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `${apiBase}/cli-login?sid=${sid}&port=${port}&state=${state}&platform=${encodeURIComponent(platform)}`;

      console.log('');
      console.log('  Opening your browser to authorize the moatt CLI...');
      console.log(`  ${url}`);
      console.log('');
      console.log('  Waiting for you to sign in and pick a project...');
      openBrowser(url);

      server._moattPort = port;
    });

    const timer = setTimeout(() => {
      reject(new Error('Login timed out after 5 minutes. Run "npx moatt login" again.'));
    }, TIMEOUT_MS);

    const onSignal = () => {
      clearTimeout(timer);
      try { server.close(); } catch {}
      reject(new Error('Login cancelled.'));
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);

    const origResolve = resolve;
    resolve = (val) => {
      clearTimeout(timer);
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      try { server.close(); } catch {}
      origResolve(val);
    };
    const origReject = reject;
    reject = (err) => {
      clearTimeout(timer);
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      try { server.close(); } catch {}
      origReject(err);
    };
  });

  const currentProjectSlug =
    result.currentProject && typeof result.currentProject.slug === 'string'
      ? result.currentProject.slug
      : null;

  const projectsArr = Array.isArray(result.projects)
    ? result.projects
        .filter((p) => p && typeof p.slug === 'string')
        .map((p) => ({ id: p.id || null, slug: p.slug, name: p.name || p.slug }))
    : [];

  const record = {
    api_key: result.apiKey,
    api_base: apiBase,
    email: result.email || '',
    userId: result.userId || '',
    clerkOrgId: result.clerkOrgId || '',
    orgName: result.orgName || '',
    currentProject: currentProjectSlug,
    projects: projectsArr,
    loggedInAt: new Date().toISOString(),
  };

  credentials.write(record);

  console.log('');
  console.log(`  Logged in${record.email ? ` as ${record.email}` : ''}`);
  if (record.orgName) {
    console.log(`  Org: ${record.orgName}`);
  }
  if (record.currentProject) {
    console.log(`  Current project: ${record.currentProject}`);
  }
  console.log(`  Wrote ${credentials.credentialsPath()}`);
  console.log('');

  return record;
}

module.exports = { login };
