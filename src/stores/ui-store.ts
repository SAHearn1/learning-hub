import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  theme: 'default' | 'dark' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
  dyslexicFont: boolean;
  reducedMotion: boolean;

  toggleSidebar: () => void;
  setTheme: (theme: 'default' | 'dark' | 'high-contrast') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  toggleDyslexicFont: () => void;
  toggleReducedMotion: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'default',
  fontSize: 'medium',
  dyslexicFont: false,
  reducedMotion: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  toggleDyslexicFont: () => set((state) => ({ dyslexicFont: !state.dyslexicFont })),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
}));
