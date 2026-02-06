export interface LearnerProfile {
  id: string;
  gradeLevel: number;
  learningPreferences: LearningPreferences;
  regulationProfile: RegulationProfile;
  accommodations: Accommodation[];
}

export interface LearningPreferences {
  modalities: ('visual' | 'auditory' | 'kinesthetic' | 'reading')[];
  pacing: 'slow' | 'moderate' | 'fast';
  scaffoldingLevel: 'high' | 'medium' | 'low';
  fontPreference: 'default' | 'dyslexic';
  colorMode: 'default' | 'high-contrast' | 'dark';
  reducedMotion: boolean;
}

export interface RegulationProfile {
  baselineLevel: number;
  knownTriggers: string[];
  preferredStrategies: string[];
  breakFrequency: number; // minutes
}

export interface Accommodation {
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  active: boolean;
}
