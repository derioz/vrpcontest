import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 1. Locate environment file (.env.local or .env)
const cwd = process.cwd();
const envPath = fs.existsSync(path.join(cwd, '.env.local'))
  ? path.join(cwd, '.env.local')
  : path.join(cwd, '.env');

if (!fs.existsSync(envPath)) {
  console.error('No environment file found (.env.local or .env)');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const lines = env.split(/\r?\n/);
const saLine = lines.find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

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

// 2. Read entries from ChangelogTab.tsx
const tabPath = path.join(cwd, 'src/components/admin/ChangelogTab.tsx');
const tabFile = fs.readFileSync(tabPath, 'utf8');
const startMarker = 'export const INITIAL_CHANGELOG_ENTRIES: ChangelogItem[] = [';
const startIndex = tabFile.indexOf(startMarker);
const endMarker = '];\n\nexport function ChangelogTab()';
const endIndex = tabFile.indexOf(endMarker, startIndex);

const entriesCode = tabFile.substring(startIndex + startMarker.length - 1, endIndex + 1);
const entries = eval(`(${entriesCode.replace(/as const/g, '')})`);

console.log(`[Changelog Sync] Loaded ${entries.length} entries from ChangelogTab.tsx.`);

function parseTimestamp(entry) {
  const timeClean = entry.timeStr.trim();
  const dateClean = entry.dateKey.trim();
  const d = new Date(`${dateClean} ${timeClean} GMT-0500`);
  if (isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

function getGoogleAccessToken(serviceAccount) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  const b64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64Url(header)}.${b64Url(payload)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, 'base64url');

  return `${unsignedToken}.${signature}`;
}

async function run() {
  const jwt = getGoogleAccessToken(sa);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  if (!token) {
    console.error('Failed to authenticate with Google OAuth:', tokenData);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const createdAtIso = parseTimestamp(entry);

    const firestoreFields = {
      author: { stringValue: entry.author || 'Damon' },
      createdAt: { timestampValue: createdAtIso },
      dateKey: { stringValue: entry.dateKey },
      timeStr: { stringValue: entry.timeStr },
      fullTimestamp: { stringValue: entry.fullTimestamp },
      title: { stringValue: entry.title },
      labels: {
        arrayValue: {
          values: entry.labels.map((l) => ({ stringValue: l })),
        },
      },
      bullets: {
        arrayValue: {
          values: entry.bullets.map((b) => ({ stringValue: b })),
        },
      },
    };

    const docId = entry.id;
    const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/changelogs/${docId}`;

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: firestoreFields }),
      });

      if (res.ok) {
        successCount++;
      } else {
        failCount++;
        const err = await res.text();
        console.error(`Failed to sync ${docId}:`, err);
      }
    } catch (err) {
      failCount++;
      console.error(`Error syncing ${docId}:`, err.message);
    }
  }

  console.log(`[Changelog Sync] Successfully synced ${successCount} of ${entries.length} entries to Firestore changelogs collection.`);
  if (failCount > 0) {
    console.error(`[Changelog Sync] Encountered ${failCount} errors.`);
  }
}

run().catch((err) => {
  console.error('[Changelog Sync Fatal Error]', err);
  process.exit(1);
});
