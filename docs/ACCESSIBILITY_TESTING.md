# Accessibility Testing Guide

This document describes our accessibility testing strategy and how to run accessibility tests.

## Overview

We use axe-core with Playwright to ensure WCAG 2.1 AA compliance across our application.

## Running Tests

### All Accessibility Tests
```bash
npm run test:a11y
```

### Specific Test File
```bash
npx playwright test tests/e2e/a11y/keyboard-navigation.spec.ts
```

### With HTML Report
```bash
npm run test:a11y:report
npx playwright show-report
```

## Test Categories

### 1. WCAG Compliance Tests
- Automated checks for WCAG 2.1 Level A and AA criteria
- Covers: perceivable, operable, understandable, robust principles

### 2. Color Contrast Tests
- Validates 4.5:1 ratio for normal text
- Validates 3:1 ratio for large text and UI components

### 3. Keyboard Navigation Tests
- Tab order verification
- Skip to main content functionality
- Modal focus trapping
- Dropdown/menu navigation
- Form keyboard accessibility

### 4. Semantic HTML & ARIA Tests
- Proper heading hierarchy
- ARIA labels and roles
- Button and link names
- Form labels and descriptions

## Common Issues and Fixes

### Color Contrast Failures
- Check text/background color combinations in Tailwind config
- Use color contrast checker: https://webaim.org/resources/contrastchecker/

### Missing ARIA Labels
- Add `aria-label` to icon-only buttons
- Ensure all form inputs have associated labels
- Use `aria-describedby` for additional context

### Keyboard Navigation Issues
- Ensure all interactive elements are keyboard accessible
- Add `tabindex="0"` for custom interactive elements
- Implement focus management for modals and dropdowns

### Heading Hierarchy
- Use only one `<h1>` per page
- Don't skip heading levels (h1 -> h3)
- Use headings for structure, not styling

## CI/CD Integration

Accessibility tests run automatically on:
- Every pull request
- Main branch commits
- Before deployment

Failed accessibility tests will block merging.

## Manual Testing

In addition to automated tests, manually test with:
1. **Keyboard only**: Navigate without mouse
2. **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac)
3. **Browser zoom**: Test at 200% zoom level
4. **Reduced motion**: Test with `prefers-reduced-motion`

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
