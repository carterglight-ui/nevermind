// Turns the single-file build into an artifact page body (the host adds <html>/<head>/<body>).
import fs from 'node:fs';

const html = fs.readFileSync('preview-dist/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const out = [
  '<title>Nevermind</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  pick(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g),
  pick(/<style[\s\S]*?<\/style>/g),
  '<div id="root"></div>',
  pick(/<script type="module"[\s\S]*?<\/script>/g),
].join('\n');
fs.mkdirSync('preview-dist', { recursive: true });
fs.writeFileSync('preview-dist/nevermind.html', out);
console.log('preview page', (out.length / 1024).toFixed(0), 'KB');
