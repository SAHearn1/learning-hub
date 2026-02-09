import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('DATA_ENCRYPTION_KEY must be configured for encryption at rest');
  }

  const raw = Buffer.from(key, 'base64');
  if (raw.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64)');
  }

  return raw;
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptAtRest(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptAtRest(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64'),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

type PiiTokenMap = Record<string, string>;

const PATTERNS = {
  studentName: /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
  iepTerm: /\b(IEP\s*(?:goal|plan|details|accommodation)?\s*[:\-]?\s*[^\n,.]{3,120})/gi,
};

export function anonymizeForLlm(text: string): { sanitizedText: string; tokenMap: PiiTokenMap } {
  const tokenMap: PiiTokenMap = {};
  let counter = 1;

  const replaceWithToken = (input: string, regex: RegExp, label: string) =>
    input.replace(regex, (match) => {
      if (Object.values(tokenMap).includes(match)) {
        const existing = Object.entries(tokenMap).find(([, value]) => value === match);
        return existing ? existing[0] : match;
      }

      const token = `[${label}_${counter}]`;
      tokenMap[token] = match;
      counter += 1;
      return token;
    });

  let sanitizedText = text;
  sanitizedText = replaceWithToken(sanitizedText, PATTERNS.iepTerm, 'IEP_REDACTED');
  sanitizedText = replaceWithToken(sanitizedText, PATTERNS.studentName, 'STUDENT_REDACTED');

  return { sanitizedText, tokenMap };
}

export function reattachPii(text: string, tokenMap: PiiTokenMap): string {
  return Object.entries(tokenMap).reduce((result, [token, value]) => result.split(token).join(value), text);
}


export function anonymizeForLlmWithMap(text: string, tokenMap: Record<string, string>): { sanitizedText: string; tokenMap: Record<string, string> } {
  let counter = Object.keys(tokenMap).length + 1;

  const replaceWithToken = (input: string, regex: RegExp, label: string) =>
    input.replace(regex, (match) => {
      const existing = Object.entries(tokenMap).find(([, value]) => value === match);
      if (existing) {
        return existing[0];
      }

      const token = `[${label}_${counter}]`;
      tokenMap[token] = match;
      counter += 1;
      return token;
    });

  let sanitizedText = text;
  sanitizedText = replaceWithToken(sanitizedText, PATTERNS.iepTerm, 'IEP_REDACTED');
  sanitizedText = replaceWithToken(sanitizedText, PATTERNS.studentName, 'STUDENT_REDACTED');
  return { sanitizedText, tokenMap };
}
