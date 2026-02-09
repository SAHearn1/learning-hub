import { describe, expect, it, vi, beforeEach } from 'vitest';
import { anonymizeForLlm, decryptAtRest, encryptAtRest, reattachPii } from '@/lib/privacy';

describe('privacy controls', () => {
  beforeEach(() => {
    vi.stubEnv('DATA_ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'));
  });

  it('encrypts and decrypts payloads for at-rest storage', () => {
    const payload = encryptAtRest('sensitive student record');
    const plaintext = decryptAtRest(payload);
    expect(plaintext).toBe('sensitive student record');
  });

  it('anonymizes PII before LLM calls and can reattach tokens', () => {
    const input = 'Student Jane Doe has IEP goal: extra time on tests.';
    const { sanitizedText, tokenMap } = anonymizeForLlm(input);

    expect(sanitizedText).not.toContain('Jane Doe');
    expect(sanitizedText).not.toContain('IEP goal: extra time on tests');

    const restored = reattachPii(sanitizedText, tokenMap);
    expect(restored).toContain('Jane Doe');
    expect(restored).toContain('IEP goal');
  });
});
