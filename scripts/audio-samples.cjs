// Renders the music and the match-result sounds to WAV files for listening (DESIGN 13.5a).
// Usage: npx vite --port 5199 &  then  NODE_PATH=$(npm root -g) node scripts/audio-samples.cjs http://127.0.0.1:5199/ out-dir
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:5199/';
  const out = process.argv[3] || 'audio-samples';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(url);
  await p.waitForTimeout(1500);
  const jobs = [['music', 40], ['cheer', 2.5], ['hmm', 2], ['boo', 2.5], ['win', 1.5], ['loss', 1.5]];
  for (const [what, secs] of jobs) {
    const b64 = await p.evaluate(async ([w, s]) => {
      const m = await import('/src/ui/audio.ts');
      const buf = await m.renderPreview(w, s);
      const n = buf.length, ch = buf.numberOfChannels, bytes = new DataView(new ArrayBuffer(44 + n * ch * 2));
      const str = (o, t) => { for (let i = 0; i < t.length; i++) bytes.setUint8(o + i, t.charCodeAt(i)); };
      str(0, 'RIFF'); bytes.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt '); bytes.setUint32(16, 16, true);
      bytes.setUint16(20, 1, true); bytes.setUint16(22, ch, true); bytes.setUint32(24, buf.sampleRate, true);
      bytes.setUint32(28, buf.sampleRate * ch * 2, true); bytes.setUint16(32, ch * 2, true); bytes.setUint16(34, 16, true);
      str(36, 'data'); bytes.setUint32(40, n * ch * 2, true);
      const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
      let peak = 0;
      for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) { const v = Math.max(-1, Math.min(1, data[c][i])); peak = Math.max(peak, Math.abs(v)); bytes.setInt16(o, v * 32767, true); }
      let bin = ''; const u8 = new Uint8Array(bytes.buffer);
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return [btoa(bin), peak];
    }, [what, secs]);
    fs.writeFileSync(path.join(out, `${what}.wav`), Buffer.from(b64[0], 'base64'));
    console.log(what, 'peak', b64[1].toFixed(3));
  }
  await b.close();
})();
