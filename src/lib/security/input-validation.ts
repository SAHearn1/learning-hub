/**
 * Input Validation & Sanitization
 * Security utilities for validating and sanitizing user inputs
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // User input
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  age: z.number().int().min(5).max(18),
  gradeLevel: z.number().int().min(0).max(12),

  // IDs
  cuid: z.string().cuid(),
  uuid: z.string().uuid(),

  // Content
  message: z.string().min(1).max(5000).trim(),
  notes: z.string().max(2000).trim().optional(),

  // Numbers
  percentage: z.number().min(0).max(100),
  difficulty: z.number().min(0).max(1),

  // Dates
  dateOfBirth: z.string().datetime().or(z.date()),
  timestamp: z.string().datetime(),

  // URLs
  url: z.string().url().max(2048),

  // File uploads
  fileName: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
  fileSize: z.number().int().min(0).max(10 * 1024 * 1024), // 10MB max
};

/**
 * SQL Injection Prevention
 * Validate input to prevent SQL injection attacks
 */
export function preventSqlInjection(input: string): boolean {
  // Check for common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(;|--|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*|\bAND\b.*=.*)/i,
    /(UNION.*SELECT)/i,
  ];

  return !sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * XSS Prevention
 * Sanitize input to prevent cross-site scripting attacks
 */
export function sanitizeHtml(input: string): string {
  // Remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

/**
 * Path Traversal Prevention
 * Validate file paths to prevent directory traversal attacks
 */
export function preventPathTraversal(path: string): boolean {
  // Check for path traversal patterns
  const pathTraversalPatterns = [
    /\.\./,
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/,
    /%252e%252e/,
    /\0/,
  ];

  return !pathTraversalPatterns.some((pattern) => pattern.test(path));
}

/**
 * Command Injection Prevention
 * Validate input to prevent command injection attacks
 */
export function preventCommandInjection(input: string): boolean {
  // Check for shell command patterns
  const commandPatterns = [
    /[;&|`$(){}[\]<>]/,
    /\n|\r/,
    /\s(sudo|su|rm|mv|cp|chmod|chown|wget|curl|nc|bash|sh|powershell|cmd)\s/i,
  ];

  return !commandPatterns.some((pattern) => pattern.test(input));
}

/**
 * NoSQL Injection Prevention
 * Validate input for MongoDB/NoSQL queries
 */
export function preventNoSqlInjection(input: any): boolean {
  if (typeof input !== 'string') {
    return true; // Non-string inputs handled by Prisma/type system
  }

  // Check for NoSQL operators
  const noSqlPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$or/i,
    /\$and/i,
    /\$regex/i,
  ];

  return !noSqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Email Header Injection Prevention
 * Validate email addresses to prevent header injection
 */
export function preventEmailHeaderInjection(email: string): boolean {
  // Check for newline characters that could inject headers
  return !/[\r\n]/.test(email);
}

/**
 * Validate student message content
 * Ensures safe educational content
 */
export function validateStudentMessage(message: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];

  // Check length
  if (message.length === 0) {
    errors.push('Message cannot be empty');
  }
  if (message.length > 5000) {
    errors.push('Message exceeds maximum length (5000 characters)');
  }

  // Check for malicious patterns
  if (!preventSqlInjection(message)) {
    errors.push('Message contains potentially malicious SQL patterns');
  }

  if (!preventCommandInjection(message)) {
    errors.push('Message contains potentially malicious command patterns');
  }

  // Sanitize HTML
  const sanitized = sanitizeHtml(message.trim());

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Validate educator notes
 */
export function validateEducatorNotes(notes: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];

  if (notes.length > 2000) {
    errors.push('Notes exceed maximum length (2000 characters)');
  }

  if (!preventSqlInjection(notes)) {
    errors.push('Notes contain potentially malicious SQL patterns');
  }

  const sanitized = sanitizeHtml(notes.trim());

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  fileName: string,
  fileSize: number,
  allowedExtensions: string[] = ['.pdf', '.png', '.jpg', '.jpeg', '.txt']
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check file name
  if (!preventPathTraversal(fileName)) {
    errors.push('File name contains invalid characters');
  }

  // Check extension
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
  }

  // Check size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (fileSize > maxSize) {
    errors.push(`File size exceeds maximum (${maxSize / 1024 / 1024}MB)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate API request parameters
 */
export function validateApiParams(params: Record<string, any>, schema: z.ZodSchema): {
  valid: boolean;
  data?: any;
  errors: string[];
} {
  try {
    const data = schema.parse(params);
    return {
      valid: true,
      data,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }

    return {
      valid: false,
      errors: ['Invalid parameters'],
    };
  }
}

/**
 * Rate limiting helper
 * Track and limit request rates per user/IP
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Create new window
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Clean up old rate limit records periodically
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Validate COPPA age
 */
export function validateCoppaAge(dateOfBirth: Date): {
  isMinor: boolean;
  age: number;
} {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return {
    isMinor: age < 13,
    age,
  };
}
