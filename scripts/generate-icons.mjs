#!/usr/bin/env node
/**
 * 生成学习台图标：奶油底 + 橙色书桌色块。无外部依赖。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'assets/images');
mkdirSync(dir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(width, height, paint) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = paint(x, y, width, height);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function roundedRect(x, y, w, h, radius, px, py) {
  const dx = Math.max(Math.max(radius - px, px - (w - radius)), 0);
  const dy = Math.max(Math.max(radius - py, py - (h - radius)), 0);
  if (px < 0 || py < 0 || px >= w || py >= h) return false;
  if (px >= radius && px < w - radius) return true;
  if (py >= radius && py < h - radius) return true;
  return dx * dx + dy * dy <= radius * radius;
}

function deskIcon(x, y, size) {
  const bg = [255, 246, 235];
  const orange = [224, 122, 61];
  const cream = [255, 255, 255];
  const wood = [139, 90, 43];
  const inset = size * 0.12;
  const pad = 4;
  const localX = x;
  const localY = y;
  if (!roundedRect(0, 0, size, size, size * 0.22, localX, localY)) {
    return [0, 0, 0, 0];
  }
  if (!roundedRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.2, localX, localY)) {
    return [...bg, 255];
  }
  const dx = localX - inset;
  const dy = localY - inset;
  const inner = size - inset * 2;
  if (dx >= inner * 0.15 && dx <= inner * 0.85 && dy >= inner * 0.38 && dy <= inner * 0.55) {
    return wood;
  }
  if (dx >= inner * 0.22 && dx <= inner * 0.78 && dy >= inner * 0.22 && dy <= inner * 0.42) {
    return cream;
  }
  if (dx >= inner * 0.3 && dx <= inner * 0.7 && dy >= inner * 0.16 && dy <= inner * 0.28) {
    return orange;
  }
  return bg;
}

const icon = png(1024, 1024, (x, y, w) => deskIcon(x, y, w));
writeFileSync(join(dir, 'icon.png'), icon);
writeFileSync(join(dir, 'splash-icon.png'), png(512, 512, (x, y, w) => deskIcon(x, y, w)));
writeFileSync(join(dir, 'favicon.png'), png(64, 64, (x, y, w) => deskIcon(x, y, w)));
writeFileSync(
  join(dir, 'android-icon-foreground.png'),
  png(1024, 1024, (x, y, w) => deskIcon(x, y, w)),
);
writeFileSync(
  join(dir, 'android-icon-background.png'),
  png(1024, 1024, () => [255, 246, 235, 255]),
);

console.log('wrote assets/images');
