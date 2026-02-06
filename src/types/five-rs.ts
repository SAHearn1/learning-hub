export type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';

export interface PhaseConfig {
  name: string;
  description: string;
  action: string;
  icon: string;
  cssVar: string;
}

export interface PhaseTransition {
  from: FiveRPhase;
  to: FiveRPhase;
  trigger: string;
  conditions: string[];
}

export interface RegulationState {
  level: number; // 0-100
  signals: string[];
  interventionCount: number;
  lastCheckTimestamp: Date;
}
