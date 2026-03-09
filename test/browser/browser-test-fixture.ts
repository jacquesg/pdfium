import { readFile } from 'node:fs/promises';

let cachedFixturePdfBytes: number[] | null = null;

export async function getFixturePdfBytes(): Promise<number[]> {
  if (cachedFixturePdfBytes) {
    return cachedFixturePdfBytes;
  }

  const buffer = await readFile('test/fixtures/test_1.pdf');
  cachedFixturePdfBytes = Array.from(
    new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  );
  return cachedFixturePdfBytes;
}
