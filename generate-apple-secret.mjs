// يولّد Apple "Sign in with Apple" Client Secret (JWT موقّع ES256) محليًا فقط،
// باستخدام وحدة crypto المدمجة في Node — بدون أي package خارجي.
//
// المفتاح الخاص (.p8) لا يغادر هذا الجهاز أبدًا، ولا يُرفَع لأي مكان،
// ولا تُطبَع قيمته أو قيمة JWT الناتج في الطرفية.
//
// الاستخدام (macOS/Linux):
//   node generate-apple-secret.mjs /path/to/AuthKey_52VJV7V438.p8
//
// الاستخدام (Windows PowerShell):
//   node .\generate-apple-secret.mjs "C:\path\to\AuthKey_52VJV7V438.p8"
//
// الناتج: apple-client-secret.txt بجانب هذا السكربت (صلاحيات 600).
// انسخ محتواه يدويًا إلى Supabase Dashboard → Authentication → Providers
// → Apple → Secret Key. الملف مُستثنى من Git (راجع .gitignore).

import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TEAM_ID = '63384BZGL5';
const KEY_ID = '52VJV7V438';
const SERVICES_ID = 'com.hemma.himah.login';
const AUDIENCE = 'https://appleid.apple.com';

const p8Path = process.argv[2];
if (!p8Path) {
  console.error('الاستخدام: node generate-apple-secret.mjs /path/to/AuthKey.p8');
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(scriptDir, 'apple-client-secret.txt');

const privateKey = readFileSync(p8Path, 'utf8');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const now = Math.floor(Date.now() / 1000);
// أقصى ما تسمح به آبل هو 6 أشهر (15777000 ثانية) — نطرح ساعة كهامش أمان
// حتى لا يُرفض الطلب لو اختلفت ساعة خادم آبل قليلًا عن ساعتنا.
const SIX_MONTHS_MINUS_BUFFER = 15777000 - 3600;

const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + SIX_MONTHS_MINUS_BUFFER,
  aud: AUDIENCE,
  sub: SERVICES_ID,
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

const signer = createSign('SHA256');
signer.update(signingInput);
signer.end();
// dsaEncoding: 'ieee-p1363' ينتج توقيع r||s الخام مباشرة، وهو ما يتطلبه
// JWS لخوارزمية ES256 (بعكس ترميز DER الافتراضي في crypto.sign).
const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });

const jwt = `${signingInput}.${base64url(signature)}`;

writeFileSync(outPath, jwt, { mode: 0o600 });

console.log('تم إنشاء Apple Client Secret JWT بنجاح.');
console.log('محفوظ في:', outPath);
console.log('صالح حتى (UTC):', new Date((now + SIX_MONTHS_MINUS_BUFFER) * 1000).toISOString());
console.log('لن تُطبَع قيمة JWT هنا — افتح الملف يدويًا وانسخ محتواه إلى Supabase.');
