import { describe, it, expect } from 'vitest';
import { featureFlags } from '../feature-flags';
import { phaseOrder, phaseTransitions } from '../five-rs';
import { studentNavItems, getStudentNavItems, educatorNavItems, parentNavItems, adminNavItems } from '../navigation';
import { pricingPlans } from '../pricing';
import { siteConfig } from '../site';
import { gradeSubjectMap } from '../subjects';

describe('featureFlags', () => {
  it('has all expected flags defined', () => {
    expect(featureFlags).toHaveProperty('enableVoiceInput');
    expect(featureFlags).toHaveProperty('enableCalmCorner');
    expect(featureFlags).toHaveProperty('enableIepTracking');
    expect(featureFlags).toHaveProperty('enableStripePayments');
    expect(featureFlags).toHaveProperty('enableDarkMode');
    expect(featureFlags).toHaveProperty('enableDyslexicFont');
  });

  it('has voice input disabled', () => {
    expect(featureFlags.enableVoiceInput).toBe(false);
  });

  it('has calm corner enabled', () => {
    expect(featureFlags.enableCalmCorner).toBe(true);
  });
});

describe('phaseOrder', () => {
  it('contains all five R phases in correct order', () => {
    expect(phaseOrder).toEqual(['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT']);
  });

  it('has exactly 5 phases', () => {
    expect(phaseOrder).toHaveLength(5);
  });
});

describe('phaseTransitions', () => {
  it('has transitions defined', () => {
    expect(phaseTransitions.length).toBeGreaterThan(0);
  });

  it('all transitions have from, to, trigger, and conditions', () => {
    for (const transition of phaseTransitions) {
      expect(transition).toHaveProperty('from');
      expect(transition).toHaveProperty('to');
      expect(transition).toHaveProperty('trigger');
      expect(transition).toHaveProperty('conditions');
      expect(transition.conditions.length).toBeGreaterThan(0);
    }
  });

  it('ROOT can transition to REFLECT', () => {
    const rootToReflect = phaseTransitions.find(
      (t) => t.from === 'ROOT' && t.to === 'REFLECT'
    );
    expect(rootToReflect).toBeDefined();
  });

  it('ROOT can transition to REGULATE on dysregulation', () => {
    const rootToRegulate = phaseTransitions.find(
      (t) => t.from === 'ROOT' && t.to === 'REGULATE'
    );
    expect(rootToRegulate).toBeDefined();
  });

  it('REFLECT can transition to RECONNECT when objective met', () => {
    const reflectToReconnect = phaseTransitions.find(
      (t) => t.from === 'REFLECT' && t.to === 'RECONNECT'
    );
    expect(reflectToReconnect).toBeDefined();
  });
});

describe('navigation', () => {
  it('student nav has 10 items total including grade-gated items', () => {
    expect(studentNavItems).toHaveLength(10);
  });


  it('hides grade-gated Financial Literacy learn link for grades below 9', () => {
    const items = getStudentNavItems(8);
    const finlitLearnItem = items.find((i) => i.href === '/learn?subject=FINANCIAL_LITERACY');
    expect(finlitLearnItem).toBeUndefined();
  });

  it('shows Financial Literacy for grade 9 and above', () => {
    const labels = getStudentNavItems(9).map((i) => i.label);
    expect(labels).toContain('Financial Literacy');
  });

  it('student nav includes Learn and Calm Corner', () => {
    const labels = studentNavItems.map((i) => i.label);
    expect(labels).toContain('Learn');
    expect(labels).toContain('Calm Corner');
  });

  it('educator nav has 4 items', () => {
    expect(educatorNavItems).toHaveLength(4);
  });

  it('educator nav includes Compliance', () => {
    const labels = educatorNavItems.map((i) => i.label);
    expect(labels).toContain('Compliance');
  });

  it('parent nav has 2 items', () => {
    expect(parentNavItems).toHaveLength(3);
  });

  it('admin nav has 2 items', () => {
    expect(adminNavItems).toHaveLength(2);
  });

  it('all nav items have label, href, and icon', () => {
    const allItems = [...studentNavItems, ...educatorNavItems, ...parentNavItems, ...adminNavItems];
    for (const item of allItems) {
      expect(item.label).toBeTruthy();
      expect(item.href).toMatch(/^\//);
      expect(item.icon).toBeTruthy();
    }
  });
});

describe('pricingPlans', () => {
  it('has 4 plans', () => {
    expect(pricingPlans).toHaveLength(4);
  });

  it('plans are free, starter, professional, enterprise', () => {
    const ids = pricingPlans.map((p) => p.id);
    expect(ids).toEqual(['free', 'starter', 'professional', 'enterprise']);
  });

  it('free plan has price 0', () => {
    const free = pricingPlans.find((p) => p.id === 'free');
    expect(free?.price).toBe(0);
  });

  it('enterprise plan has null price', () => {
    const enterprise = pricingPlans.find((p) => p.id === 'enterprise');
    expect(enterprise?.price).toBeNull();
  });

  it('all plans have features array', () => {
    for (const plan of pricingPlans) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('free plan limits sessions to 5 per month', () => {
    const free = pricingPlans.find((p) => p.id === 'free');
    expect(free?.limits.sessionsPerMonth).toBe(5);
  });

  it('starter plan has unlimited sessions', () => {
    const starter = pricingPlans.find((p) => p.id === 'starter');
    expect(starter?.limits.sessionsPerMonth).toBe(-1);
  });
});

describe('siteConfig', () => {
  it('has the correct brand name', () => {
    expect(siteConfig.name).toBe('RootWork');
  });

  it('has a tagline', () => {
    expect(siteConfig.tagline).toBe('Grow Your Thinking');
  });

  it('has required links', () => {
    expect(siteConfig.links).toHaveProperty('support');
    expect(siteConfig.links).toHaveProperty('methodology');
    expect(siteConfig.links).toHaveProperty('privacy');
    expect(siteConfig.links).toHaveProperty('terms');
    expect(siteConfig.links).toHaveProperty('dataRetention');
  });
});

describe('gradeSubjectMap', () => {
  it('covers grades 1 through 12', () => {
    for (let grade = 1; grade <= 12; grade++) {
      expect(gradeSubjectMap[grade]).toBeDefined();
    }
  });

  it('grades 1-2 have MATH and LANGUAGE_ARTS only', () => {
    expect(gradeSubjectMap[1]).toEqual(['MATH', 'LANGUAGE_ARTS']);
    expect(gradeSubjectMap[2]).toEqual(['MATH', 'LANGUAGE_ARTS']);
  });

  it('grades 3+ include SCIENCE', () => {
    for (let grade = 3; grade <= 12; grade++) {
      expect(gradeSubjectMap[grade]).toContain('SCIENCE');
    }
  });
});
