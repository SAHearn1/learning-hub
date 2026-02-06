// Single source of truth for all brand constants

export const BRAND = {
  name: 'RootWork',
  tagline: 'Grow Your Thinking',
  organization: "Community Exceptional Children's Services",

  phases: {
    ROOT: {
      name: 'Root',
      description: 'Grounding & Foundation',
      action: 'Establish safety, assess readiness, set intentions',
      icon: 'root-icon',
      cssVar: '--phase-root',
    },
    REGULATE: {
      name: 'Regulate',
      description: 'Co-Regulation & Stabilization',
      action: 'Support return to window of tolerance',
      icon: 'regulate-icon',
      cssVar: '--phase-regulate',
    },
    REFLECT: {
      name: 'Reflect',
      description: 'Active Learning & Metacognition',
      action: 'Engage in learning with awareness',
      icon: 'reflect-icon',
      cssVar: '--phase-reflect',
    },
    RESTORE: {
      name: 'Restore',
      description: 'Error Recovery & Growth',
      action: 'Reframe mistakes as learning',
      icon: 'restore-icon',
      cssVar: '--phase-restore',
    },
    RECONNECT: {
      name: 'Reconnect',
      description: 'Application & Integration',
      action: 'Apply learning to real-world contexts',
      icon: 'reconnect-icon',
      cssVar: '--phase-reconnect',
    },
  },

  subjects: {
    MATH: {
      name: 'Mathematics',
      shortName: 'Math',
      icon: 'math-icon',
      color: '#3B82F6',
    },
    SCIENCE: {
      name: 'Science',
      shortName: 'Science',
      icon: 'science-icon',
      color: '#10B981',
    },
    LANGUAGE_ARTS: {
      name: 'Language Arts',
      shortName: 'ELA',
      icon: 'language-arts-icon',
      color: '#8B5CF6',
    },
  },

  engagementModes: {
    FORWARD: { name: 'Solving', icon: 'arrow-right' },
    REVERSE: { name: 'Reconstructing', icon: 'arrow-left' },
    ERROR_ANALYSIS: { name: 'Analyzing', icon: 'search' },
    MULTIPLE_PATHWAYS: { name: 'Exploring', icon: 'git-branch' },
    PROBLEM_POSING: { name: 'Creating', icon: 'sparkles' },
  },
} as const;

export type Phase = keyof typeof BRAND.phases;
export type Subject = keyof typeof BRAND.subjects;
export type EngagementMode = keyof typeof BRAND.engagementModes;
