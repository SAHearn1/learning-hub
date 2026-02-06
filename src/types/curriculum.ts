export interface StandardReference {
  code: string;
  framework: 'GEORGIA' | 'COMMON_CORE' | 'NGSS';
  subject: string;
  gradeLevel: number[];
  domain: string;
  description: string;
}

export interface TopicReference {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number[];
  prerequisites: string[];
  estimatedDuration: number;
}

export type BloomsLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
