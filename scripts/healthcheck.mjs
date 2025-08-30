import fetch from 'node-fetch';

const origin = process.env.HEALTHCHECK_ORIGIN || 'http://localhost:3000';
const college = process.env.HEALTHCHECK_COLLEGE || 'example';

async function main() {
  try {
    const res = await fetch(`${origin}/api/auth/resolve-college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collegeUsername: college })
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    if (!ok || json.success === false) {
      console.error('Healthcheck failed', res.status, json);
      process.exit(1);
    }
    console.log('Healthcheck ok');
  } catch (e) {
    console.error('Healthcheck error', e);
    process.exit(1);
  }
}

main();
