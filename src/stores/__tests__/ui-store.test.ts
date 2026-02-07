import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      theme: 'default',
      fontSize: 'medium',
      dyslexicFont: false,
      reducedMotion: false,
    });
  });

  it('initializes with default values', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.theme).toBe('default');
    expect(state.fontSize).toBe('medium');
    expect(state.dyslexicFont).toBe(false);
    expect(state.reducedMotion).toBe(false);
  });

  describe('toggleSidebar', () => {
    it('toggles from open to closed', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggles back to open', () => {
      useUIStore.getState().toggleSidebar();
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('sets dark theme', () => {
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('sets high-contrast theme', () => {
      useUIStore.getState().setTheme('high-contrast');
      expect(useUIStore.getState().theme).toBe('high-contrast');
    });
  });

  describe('setFontSize', () => {
    it('sets small font', () => {
      useUIStore.getState().setFontSize('small');
      expect(useUIStore.getState().fontSize).toBe('small');
    });

    it('sets large font', () => {
      useUIStore.getState().setFontSize('large');
      expect(useUIStore.getState().fontSize).toBe('large');
    });
  });

  describe('toggleDyslexicFont', () => {
    it('toggles on', () => {
      useUIStore.getState().toggleDyslexicFont();
      expect(useUIStore.getState().dyslexicFont).toBe(true);
    });

    it('toggles off', () => {
      useUIStore.getState().toggleDyslexicFont();
      useUIStore.getState().toggleDyslexicFont();
      expect(useUIStore.getState().dyslexicFont).toBe(false);
    });
  });

  describe('toggleReducedMotion', () => {
    it('toggles on', () => {
      useUIStore.getState().toggleReducedMotion();
      expect(useUIStore.getState().reducedMotion).toBe(true);
    });
  });
});
