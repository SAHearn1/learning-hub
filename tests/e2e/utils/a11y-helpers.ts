import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface A11yCheckOptions {
  /**
   * Specific WCAG tags to check (e.g., ['wcag2a', 'wcag2aa', 'wcag21aa'])
   */
  tags?: string[];
  /**
   * Elements to exclude from checking (CSS selectors)
   */
  exclude?: string[];
  /**
   * Specific rules to disable
   */
  disableRules?: string[];
}

/**
 * Initialize axe-core on the page
 * Note: With @axe-core/playwright, axe is automatically injected when you run analyze()
 */
export async function setupAccessibilityChecks(page: Page): Promise<void> {
  // No setup needed with @axe-core/playwright - axe is injected automatically
  // This function is kept for API compatibility
}

/**
 * Run accessibility checks on the current page
 */
export async function checkAccessibility(
  page: Page,
  options: A11yCheckOptions = {}
): Promise<void> {
  const {
    tags = ['wcag2a', 'wcag2aa', 'wcag21aa'],
    exclude = [],
    disableRules = [],
  } = options;

  let builder = new AxeBuilder({ page }).withTags(tags);
  
  if (disableRules.length > 0) {
    builder = builder.disableRules(disableRules);
  }
  
  if (exclude.length > 0) {
    exclude.forEach(selector => {
      builder = builder.exclude(selector);
    });
  }

  const results = await builder.analyze();
  
  expect(results.violations).toEqual([]);
}

/**
 * Get detailed accessibility violations
 */
export async function getAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
}

/**
 * Check color contrast for specific elements
 */
export async function checkColorContrast(page: Page, selector: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withRules(['color-contrast'])
    .analyze();
  
  expect(results.violations).toEqual([]);
}

/**
 * Check keyboard navigation for interactive elements
 */
export async function checkKeyboardNavigation(
  page: Page,
  interactiveElements: string[]
): Promise<void> {
  for (const selector of interactiveElements) {
    const element = page.locator(selector).first();
    
    // Check if element is focusable
    await element.focus();
    const isFocused = await element.evaluate((el) => el === document.activeElement);
    
    if (!isFocused) {
      throw new Error(`Element ${selector} is not keyboard focusable`);
    }

    // Check for visible focus indicator
    const outlineStyle = await element.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineColor: styles.outlineColor,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    const hasFocusIndicator = 
      (outlineStyle.outline && outlineStyle.outline !== 'none') ||
      (outlineStyle.boxShadow && outlineStyle.boxShadow !== 'none');

    if (!hasFocusIndicator) {
      console.warn(`Element ${selector} may not have a visible focus indicator`);
    }
  }
}

/**
 * Verify page has proper heading hierarchy
 */
export async function checkHeadingHierarchy(page: Page): Promise<void> {
  const headings = await page.evaluate(() => {
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headingElements.map((h) => ({
      level: parseInt(h.tagName.substring(1)),
      text: h.textContent?.trim() || '',
    }));
  });

  // Check for h1
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    throw new Error('Page must have at least one h1 heading');
  }
  if (h1Count > 1) {
    console.warn('Page has multiple h1 headings, consider using only one');
  }

  // Check for heading hierarchy gaps
  for (let i = 1; i < headings.length; i++) {
    const prevLevel = headings[i - 1].level;
    const currLevel = headings[i].level;
    
    if (currLevel > prevLevel + 1) {
      console.warn(
        `Heading hierarchy skip detected: h${prevLevel} followed by h${currLevel} (${headings[i].text})`
      );
    }
  }
}

/**
 * Check for proper ARIA labels and roles
 */
export async function checkAriaLabels(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withRules([
      'aria-allowed-attr',
      'aria-required-attr',
      'aria-required-children',
      'aria-required-parent',
      'aria-roles',
      'aria-valid-attr',
      'aria-valid-attr-value',
      'button-name',
      'input-button-name',
      'link-name',
    ])
    .analyze();
  
  expect(results.violations).toEqual([]);
}
