import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const cwd = process.cwd();
const envPath = fs.existsSync(path.join(cwd, '.env.local'))
  ? path.join(cwd, '.env.local')
  : path.join(cwd, '.env');

if (!fs.existsSync(envPath)) {
  console.error('No environment file found (.env.local or .env)');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const saLine = env.split(/\r?\n/).find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));
if (!saLine) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
  process.exit(1);
}

const prefix = 'FIREBASE_SERVICE_ACCOUNT_KEY=';
let raw = saLine.slice(prefix.length).trim();
if (raw.startsWith('"') && raw.endsWith('"')) {
  raw = raw.slice(1, -1);
}
const cleaned = raw.replace(/\\n(?=[\s"}{])/g, ' ');
const jsonPortion = cleaned.slice(0, cleaned.lastIndexOf('}') + 1);
const sa = JSON.parse(jsonPortion);
sa.private_key = sa.private_key.replace(/\\n/g, '\n');

function getGoogleAccessToken(serviceAccount) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimSet = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  })).toString('base64url');
  const signInput = header + '.' + claimSet;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');
  const jwt = signInput + '.' + signature;

  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  }).then(r => r.json()).then(d => d.access_token);
}

async function deployRules() {
  const rulesPath = path.join(cwd, 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    console.error('firestore.rules file not found');
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  const token = await getGoogleAccessToken(sa);

  console.log('[Firestore Rules] 1. Creating new ruleset...');
  const createRes = await fetch('https://firebaserules.googleapis.com/v1/projects/' + sa.project_id + '/rulesets', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    })
  });
  const createData = await createRes.json();
  if (createData.error) {
    console.error('[Firestore Rules] Error creating ruleset:', JSON.stringify(createData.error, null, 2));
    process.exit(1);
  }
  console.log('[Firestore Rules] Created ruleset:', createData.name);

  console.log('[Firestore Rules] 2. Updating release to active ruleset...');
  const updateRes = await fetch('https://firebaserules.googleapis.com/v1/projects/' + sa.project_id + '/releases/cloud.firestore', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      release: {
        name: 'projects/' + sa.project_id + '/releases/cloud.firestore',
        rulesetName: createData.name
      }
    })
  });
  const updateData = await updateRes.json();
  if (updateData.error) {
    console.error('[Firestore Rules] Error updating release:', JSON.stringify(updateData.error, null, 2));
    process.exit(1);
  }
  console.log('[Firestore Rules] Successfully released ruleset to cloud.firestore!');
}

deployRules().catch(err => {
  console.error('[Firestore Rules] Fatal error:', err);
  process.exit(1);
});
