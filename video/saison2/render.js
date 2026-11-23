// Rend un épisode en vidéo : node render.js <num> [stills t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30;
const num = process.argv[2];
const mode = process.argv[3];
const dir = path.join(__dirname, 'build', 'ep' + num);
const outDir = path.join(__dirname, 'final');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(tl => setTimeline(tl), tl);
  await page.evaluate(async () => { render(1); await document.fonts.ready; });

  if (mode === 'stills') {
    const times = process.argv[4].split(',').map(Number);
    fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
    for (const t of times) {
      await page.evaluate(t => render(t), t);
      await page.screenshot({ path: path.join(dir, 'stills', `t${t}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close();
    return;
  }

  // couverture
  await page.evaluate(() => renderCover());
  await page.screenshot({ path: path.join(outDir, `Partie-${num}-couverture.png`) });
  if (mode === 'cover') { await browser.close(); return; }

  const out = path.join(outDir, `Partie-${num}-${tl.title.replace(/[^A-Za-zÀ-ÿ]+/g, '-').replace(/-+$/, '')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(dir, 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.ceil(tl.total * FPS);
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    await page.evaluate(t => render(t), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`ép ${num} : ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('OK', out);
})();
