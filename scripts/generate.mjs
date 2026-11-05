// Generates one example on fal and saves generated.jpg beside its layout.json.
// Usage: FAL_KEY=your-key node scripts/generate.mjs examples/quote-card
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const key = process.env.FAL_KEY;
if (!dir || !key) {
  console.error('Usage: FAL_KEY=your-key node scripts/generate.mjs examples/<name>');
  process.exit(1);
}

const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
const layout = JSON.parse(readFileSync(join(dir, 'layout.json'), 'utf8'));
const { width, height, ...settings } = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'));

// The layout goes in as a one-line JSON string, in the prompt field.
const submit = await fetch('https://queue.fal.run/fal-ai/moss-image', {
  method: 'POST',
  headers,
  body: JSON.stringify({ prompt: JSON.stringify(layout), image_size: { width, height }, ...settings }),
});
if (!submit.ok) throw new Error(`fal said ${submit.status}: ${await submit.text()}`);
const job = await submit.json();

for (;;) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const status = await (await fetch(job.status_url, { headers })).json();
  if (status.status === 'COMPLETED') break;
}

const result = await (await fetch(job.response_url, { headers })).json();
const image = await fetch(result.images[0].url);
const file = join(dir, 'generated.jpg');
writeFileSync(file, Buffer.from(await image.arrayBuffer()));
console.log(`Saved ${file} (seed ${result.seed})`);
