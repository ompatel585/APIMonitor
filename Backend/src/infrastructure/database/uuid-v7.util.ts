import { randomBytes } from 'node:crypto';

export function uuidV7(): string {
  const timestamp = BigInt(Date.now());
  const timestampBytes = Buffer.alloc(6);
  timestampBytes.writeUIntBE(Number(timestamp & 0xffffffffffffn), 0, 6);

  const randomPart = randomBytes(10);

  randomPart[0] = (randomPart[0] & 0x0f) | 0x70;
  randomPart[2] = (randomPart[2] & 0x3f) | 0x80;

  const bytes = Buffer.concat([timestampBytes, randomPart]);
  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
