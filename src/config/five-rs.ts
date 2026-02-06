import { BRAND } from '@/brand/brand';
import type { FiveRPhase, PhaseTransition } from '@/types/five-rs';

export const phaseConfig = BRAND.phases;

export const phaseOrder: FiveRPhase[] = [
  'ROOT',
  'REGULATE',
  'REFLECT',
  'RESTORE',
  'RECONNECT',
];

export const phaseTransitions: PhaseTransition[] = [
  {
    from: 'ROOT',
    to: 'REFLECT',
    trigger: 'Student demonstrates readiness',
    conditions: ['Grounding check completed', 'Regulation level > 60'],
  },
  {
    from: 'ROOT',
    to: 'REGULATE',
    trigger: 'Student shows dysregulation',
    conditions: ['Regulation level < 40', 'Distress signals detected'],
  },
  {
    from: 'REGULATE',
    to: 'ROOT',
    trigger: 'Regulation restored',
    conditions: ['Regulation level > 60', 'Student confirms readiness'],
  },
  {
    from: 'REFLECT',
    to: 'REGULATE',
    trigger: 'Dysregulation detected during learning',
    conditions: ['Regulation level drops below 40'],
  },
  {
    from: 'REFLECT',
    to: 'RESTORE',
    trigger: 'Error occurs during learning',
    conditions: ['Student makes error', 'Error requires reframing'],
  },
  {
    from: 'RESTORE',
    to: 'REFLECT',
    trigger: 'Error addressed, continue learning',
    conditions: ['Student acknowledges learning', 'Ready to continue'],
  },
  {
    from: 'REFLECT',
    to: 'RECONNECT',
    trigger: 'Learning objective met',
    conditions: ['Mastery demonstrated', 'Session nearing end'],
  },
  {
    from: 'RECONNECT',
    to: 'ROOT',
    trigger: 'Session complete, begin new cycle',
    conditions: ['Application exercise completed'],
  },
];
