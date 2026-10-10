// Generates one mp3 per line in audio/inventory.csv using ElevenLabs, skipping clips that already exist.
// Run by the "Generate audio" GitHub Action. Needs env ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const KEY = process.env.ELEVENLABS_API_KEY, VOICE = process.env.ELEVENLABS_VOICE_ID;
const LIMIT = parseInt(process.env.LIMIT || '100000', 10);
const ONLY = process.env.CATEGORIES ? process.env.CATEGORIES.split(',') : null;
if (!KEY || !VOICE) { console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID'); process.exit(1); }
const root = path.join(__dirname, '..', 'audio');
const clipsDir = path.join(root, 'clips'); fs.mkdirSync(clipsDir, { recursive: true });
function parseCSV(s) { const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i+1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; }
  if (f || r.length) { r.push(f); rows.push(r); } return rows; }
const norm = t => t.trim().toLowerCase().replace(/\s+/g, ' ');
const rows = parseCSV(fs.readFileSync(path.join(root, 'inventory.csv'), 'utf8')).slice(1).filter(r => r[0]);
const manifestPath = path.join(root, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
async function tts(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_96`, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.MODEL_ID || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.2, speed: 0.9 } }) });
  if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
  return Buffer.from(await res.arrayBuffer());
}
(async () => { let made = 0, skipped = 0;
  for (const [id, text, cat] of rows) {
    if (ONLY && !ONLY.includes(cat)) continue;
    const file = id + '.mp3', fp = path.join(clipsDir, file);
    if (fs.existsSync(fp)) { manifest[norm(text)] = file; skipped++; continue; }
    if (made >= LIMIT) break;
    try { fs.writeFileSync(fp, await tts(text)); manifest[norm(text)] = file; made++; console.log('made', cat, text); }
    catch (e) { console.error('FAILED', text, e.message); if (/401|402|429/.test(e.message)) break; }
    await new Promise(r => setTimeout(r, 250));
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log(`done: ${made} new, ${skipped} existing, ${Object.keys(manifest).length} in manifest`);
})();
