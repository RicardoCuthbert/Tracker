import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('illustrations are local passive assets; all twelve sources have an optimized counterpart', async () => {
  const inventory: { source: string; sourceSha256: string; file: string; originalBytes: number }[] = JSON.parse(await readFile('public/illustrations/inventory.json', 'utf8'));
  assert.equal(inventory.length, 12);
  assert.equal(new Set(inventory.map(a => a.file)).size, 12);
  for (const asset of inventory) {
    const source = await readFile(`Asset lucu lucu/svg/${asset.source}`);
    assert.equal(createHash('sha256').update(source).digest('hex'), asset.sourceSha256, 'Source remains unchanged');
    const bytes = await readFile(`public/illustrations/${asset.file}`);
    assert.ok(bytes.length < asset.originalBytes, `${asset.file} must shrink`);
    if (asset.file.endsWith('.svg')) {
      const svg = bytes.toString();
      assert.match(svg, /viewBox=/);
      assert.doesNotMatch(svg, /<\s*(?:script|foreignObject|image|style|animate|set)\b|\bon\w+\s*=|(?:href\s*=|url\(\s*(?!#))|<!DOCTYPE|<!ENTITY/i);
    } else assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  }
  assert.equal((await readdir('Asset lucu lucu/svg')).filter(f => f.endsWith('.svg')).length, 12);
});

test('Next file convention icons include real 16px and 32px ICO entries', async () => {
  const ico = await readFile('src/app/favicon.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16]);
  assert.ok(sizes.includes(16)); assert.ok(sizes.includes(32));
  for (const name of ['icon.png', 'apple-icon.png']) assert.deepEqual([...((await readFile(`src/app/${name}`)).subarray(0, 8))], [137,80,78,71,13,10,26,10]);
});
