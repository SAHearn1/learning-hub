import { describe, expect, it } from 'vitest';
import {
  AppError,
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitError,
  ValidationError,
} from '../api-errors';

describe('AppError', () => {
  it('carries statusCode, code, and message', () => {
    const err = new AppError('boom', 500, 'INTERNAL_ERROR');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.details).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
  });

  it('accepts optional details', () => {
    const details = [{ field: 'email', message: 'required' }];
    const err = new AppError('bad', 400, 'VALIDATION_ERROR', details);
    expect(err.details).toEqual(details);
  });
});

describe('ValidationError', () => {
  it('defaults to 400 / VALIDATION_ERROR', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Invalid request');
    expect(err.name).toBe('ValidationError');
  });

  it('accepts a custom message and details', () => {
    const err = new ValidationError('bad email', { field: 'email' });
    expect(err.message).toBe('bad email');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('AuthenticationError', () => {
  it('defaults to 401 / AUTHENTICATION_ERROR', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('defaults to 403 / FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
  });

  it('accepts a custom message', () => {
    const err = new ForbiddenError('Not your resource');
    expect(err.message).toBe('Not your resource');
  });
});

describe('NotFoundError', () => {
  it('defaults to 404 / NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Not found');
  });
});

describe('PaymentRequiredError', () => {
  it('defaults to 402 / PAYMENT_REQUIRED', () => {
    const err = new PaymentRequiredError();
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe('PAYMENT_REQUIRED');
  });
});

describe('ConflictError', () => {
  it('defaults to 409 / CONFLICT', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('defaults to 429 / RATE_LIMIT_EXCEEDED', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfterSeconds).toBeUndefined();
  });

  it('carries retryAfterSeconds', () => {
    const err = new RateLimitError('slow down', 30);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.message).toBe('slow down');
  });
});

describe('instanceof hierarchy', () => {
  it('all subclasses are instanceof AppError and Error', () => {
    const errors = [
      new ValidationError(),
      new AuthenticationError(),
      new ForbiddenError(),
      new NotFoundError(),
      new PaymentRequiredError(),
      new ConflictError(),
      new RateLimitError(),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    }
  });
});
