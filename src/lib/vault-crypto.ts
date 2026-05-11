import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_BYTES = 32;

function dataDir(): string {
  return path.join(process.cwd(), "data");
}

export function getMasterKey(): Buffer {
  const fromEnv = process.env.SSH_TERMINAL_MASTER_KEY?.trim();
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64");
    if (key.length !== KEY_BYTES) {
      throw new Error(`SSH_TERMINAL_MASTER_KEY must be ${KEY_BYTES} bytes in base64 encoding`);
    }
    return key;
  }

  mkdirSync(dataDir(), { recursive: true });
  const keyPath = path.join(dataDir(), ".vault-key");
  if (existsSync(keyPath)) {
    const key = readFileSync(keyPath);
    if (key.length !== KEY_BYTES) {
      throw new Error("Corrupted encryption key file (.vault-key)");
    }
    return key;
  }

  const key = randomBytes(KEY_BYTES);
  writeFileSync(keyPath, key, { mode: 0o600 });
  return key;
}

export function encryptJson(value: unknown): Buffer {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptJson<T>(blob: Buffer): T {
  const key = getMasterKey();
  if (blob.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted data");
  }
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = blob.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}
