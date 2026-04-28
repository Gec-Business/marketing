import fs from 'fs';
import path from 'path';

let cachedFont: Buffer | null = null;

export function getGeorgianFont(): Buffer {
  if (cachedFont) return cachedFont;
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGeorgian.ttf');
  cachedFont = fs.readFileSync(fontPath);
  return cachedFont;
}
