export const REGULATION_LEVELS = {
  CRISIS: { min: 0, max: 20, label: 'Crisis', action: 'Immediate support needed' },
  DYSREGULATED: { min: 21, max: 40, label: 'Dysregulated', action: 'Move to REGULATE phase' },
  EMERGING: { min: 41, max: 60, label: 'Emerging', action: 'Monitor closely' },
  REGULATED: { min: 61, max: 80, label: 'Regulated', action: 'Proceed with learning' },
  OPTIMAL: { min: 81, max: 100, label: 'Optimal', action: 'Full engagement possible' },
} as const;

export const DYSREGULATION_SIGNALS = [
  'rapid_short_responses',
  'increased_errors_after_success',
  'negative_self_talk',
  'off_topic_deflection',
  'aggressive_punctuation',
  'long_pause_then_frustration',
  'avoidance_behavior',
  'all_caps',
] as const;
