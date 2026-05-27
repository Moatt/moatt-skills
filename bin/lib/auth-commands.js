

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

const credentials = require('./credentials');

function apiRequest(method, urlString, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'moatt-cli',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); }
            catch (err) { reject(new Error(`Invalid JSON from ${urlString}: ${err.message}`)); }
          } else {
            reject(new Error(`HTTP ${res.statusCode} from ${urlString}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function whoami() {
  const creds = credentials.read();
  if (!creds) {
    console.log('Not logged in. Run "npx moatt login" to authenticate.');
    process.exit(1);
  }
  console.log('');
  console.log(`  Email:           ${creds.email || '(unknown)'}`);
  console.log(`  Organization:    ${creds.orgName || creds.clerkOrgId || '(none)'}`);
  console.log(`  Current project: ${creds.currentProject || '(none)'}`);
  console.log(`  API base:        ${creds.api_base}`);
  console.log(`  Logged in at:    ${creds.loggedInAt || '(unknown)'}`);
  console.log('');
}

async function fetchMe() {
  const creds = credentials.requireCreds();
  return apiRequest('GET', `${creds.api_base}/api/cli/me`, creds.api_key);
}

async function status() {
  const creds = credentials.requireCreds();
  whoami();
  let remote;
  try {
    remote = await fetchMe();
  } catch (err) {
    console.error(`  Could not reach server: ${err.message}`);
    process.exit(1);
  }
  console.log('  Credits:');
  if (remote.credits) {
    console.log(`    Subscription: ${remote.credits.subscription}`);
    console.log(`    Purchased:    ${remote.credits.purchased}`);
    console.log(`    Total:        ${remote.credits.total}`);
  } else {
    console.log('    (unavailable)');
  }
  if (remote.key) {
    console.log('');
    console.log('  Key:');
    console.log(`    Label:       ${remote.key.label || '(unlabeled)'}`);
    console.log(`    Prefix:      ${remote.key.prefix}`);
    console.log(`    Last used:   ${remote.key.lastUsedAt || 'never'}`);
    console.log(`    Created at:  ${remote.key.createdAt}`);
  }
  console.log('');
}

async function credits({ human = false } = {}) {
  let remote;
  try {
    remote = await fetchMe();
  } catch (err) {
    console.error(`Could not reach server: ${err.message}`);
    process.exit(1);
  }
  if (human) {
    if (remote.credits) {
      console.log(`Subscription: ${remote.credits.subscription}`);
      console.log(`Purchased:    ${remote.credits.purchased}`);
      console.log(`Total:        ${remote.credits.total}`);
    } else {
      console.log('Credits unavailable');
    }
    return;
  }
  console.log(JSON.stringify(remote.credits ?? null));
}

function projectsList() {
  const creds = credentials.requireCreds();
  if (!creds.projects || creds.projects.length === 0) {
    console.log('No projects — you are using the CLI standalone. Run "npx moatt credits" to manage your wallet, or visit https://cli.moatt.com.');
    return;
  }
  console.log('');
  for (const p of creds.projects) {
    const marker = p.slug === creds.currentProject ? '*' : ' ';
    console.log(`  ${marker} ${p.slug.padEnd(30)} ${p.name}`);
  }
  console.log('');
  console.log('  * current project. Use "moatt switch <slug>" to change.');
  console.log('');
}

function switchProject(slug) {
  if (!slug) {
    console.error('Usage: npx moatt switch <project-slug>');
    process.exit(1);
  }
  const creds = credentials.requireCreds();
  const match = (creds.projects || []).find((p) => p.slug === slug);
  if (!match) {
    console.error(`Project "${slug}" is not in your credentials.`);
    console.error('Run "npx moatt projects list" to see what you have, or "npx moatt login" to refresh.');
    process.exit(1);
  }
  credentials.write({ ...creds, currentProject: match.slug });
  console.log(`  Switched to ${match.slug} (${match.name})`);
}

async function logout({ all = false } = {}) {
  const creds = credentials.read();
  if (!creds) {
    console.log('Not logged in — nothing to do.');
    return;
  }

  if (all) {

    try {
      await apiRequest('POST', `${creds.api_base}/api/cli/logout`, creds.api_key);
    } catch (err) {

      console.warn(`  Note: server revoke failed (${err.message}). Wiping local credentials anyway.`);
    }
    credentials.clear();
    console.log('  Logged out. Credentials removed and key revoked.');
    return;
  }

  credentials.clear();
  console.log('  Local credentials cleared. The key remains valid on the server.');
  console.log('  Use "npx moatt logout --all" to also revoke the key.');
}

module.exports = {
  whoami,
  status,
  credits,
  projectsList,
  switchProject,
  logout,
};
