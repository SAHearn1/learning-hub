import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import * as PrismaExports from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// Schema Structure Validation
// Verifies the generated Prisma client matches the expected schema
// ═══════════════════════════════════════════════════════════════

describe('Prisma schema — models', () => {
  const expectedModels = [
    'Tenant',
    'School',
    'Class',
    'ClassEnrollment',
    'User',
    'Student',
    'Educator',
    'Parent',
    'IepAccommodation',
    'ItemCalibration',
    'StudentAbility',
    'ResponseData',
    'ReviewSchedule',
    'ReviewHistory',
    'Session',
    'Message',
    'Assessment',
    'Progress',
    'ThinkingAssessment',
    'ReasoningMoveProgress',
    'Standard',
    'Topic',
    'LearningObjective',
    'Problem',
    'AIUsageLedger',
    'AuditLog',
    'IngestLog',
    'PlatformConfig',
    'NVCQualityEvaluation',
    'Term',
    'Course',
    'Assignment',
    'Submission',
    'Grade',
    'FiveRTemplate',
    'AiSuggestionReview',
    // IDEA Compliance Kernel models
    'IepGoal',
    'GoalProgressEntry',
    'ProgressReport',
    'EvaluationCase',
    'EvalStateTransition',
    'EvaluationPlan',
    'EvaluationAssignment',
    'EvalAssessmentRecord',
    'EvalConsentRecord',
    'EligibilityMeeting',
    'EligibilityDecision',
    'DisciplineCase',
    'ManifestDetermination',
    'ProceduralEvent',
    'SafeguardsNotice',
    // Notifications & Messaging
    'Notification',
    'MessageThread',
    'DirectMessage',
  ];

  it('generates all 54 expected models', () => {
    const modelNames = Object.values(Prisma.ModelName);
    expect(modelNames).toHaveLength(54);
  });

  it.each(expectedModels)('includes model %s', (model) => {
    expect(Object.values(Prisma.ModelName)).toContain(model);
  });
});

describe('Prisma schema — multi-tenancy models', () => {
  it('Tenant has required scalar fields', () => {
    const fields = Object.values(Prisma.TenantScalarFieldEnum);
    expect(fields).toContain('id');
    expect(fields).toContain('name');
    expect(fields).toContain('slug');
    expect(fields).toContain('subscriptionTier');
    expect(fields).toContain('subscriptionStatus');
    expect(fields).toContain('stripeCustomerId');
    expect(fields).toContain('stripeSubscriptionId');
    expect(fields).toContain('settings');
  });

  it('School has tenantId for multi-tenancy', () => {
    const fields = Object.values(Prisma.SchoolScalarFieldEnum);
    expect(fields).toContain('tenantId');
    expect(fields).toContain('name');
    expect(fields).toContain('gradeRange');
  });

  it('Class links to school and educator', () => {
    const fields = Object.values(Prisma.ClassScalarFieldEnum);
    expect(fields).toContain('schoolId');
    expect(fields).toContain('educatorId');
    expect(fields).toContain('subject');
    expect(fields).toContain('gradeLevel');
    expect(fields).toContain('academicYear');
  });

  it('ClassEnrollment links class and student', () => {
    const fields = Object.values(Prisma.ClassEnrollmentScalarFieldEnum);
    expect(fields).toContain('classId');
    expect(fields).toContain('studentId');
    expect(fields).toContain('status');
    expect(fields).toContain('tenantId');
  });
});

describe('Prisma schema — user models', () => {
  it('User has clerkUserId and role', () => {
    const fields = Object.values(Prisma.UserScalarFieldEnum);
    expect(fields).toContain('clerkUserId');
    expect(fields).toContain('email');
    expect(fields).toContain('firstName');
    expect(fields).toContain('lastName');
    expect(fields).toContain('role');
    expect(fields).toContain('tenantId');
    expect(fields).toContain('isMinor');
    expect(fields).toContain('consentStatus');
  });

  it('Student has learning profile fields', () => {
    const fields = Object.values(Prisma.StudentScalarFieldEnum);
    expect(fields).toContain('userId');
    expect(fields).toContain('gradeLevel');
    expect(fields).toContain('learningPreferences');
    expect(fields).toContain('regulationProfile');
  });

  it('Educator has credentials fields', () => {
    const fields = Object.values(Prisma.EducatorScalarFieldEnum);
    expect(fields).toContain('userId');
    expect(fields).toContain('certifications');
    expect(fields).toContain('specializations');
  });

  it('Parent has communication prefs', () => {
    const fields = Object.values(Prisma.ParentScalarFieldEnum);
    expect(fields).toContain('userId');
    expect(fields).toContain('childrenIds');
    expect(fields).toContain('communicationPrefs');
  });
});

describe('Prisma schema — IEP accommodations', () => {
  it('IepAccommodation has required fields', () => {
    const fields = Object.values(Prisma.IepAccommodationScalarFieldEnum);
    expect(fields).toContain('studentId');
    expect(fields).toContain('type');
    expect(fields).toContain('description');
    expect(fields).toContain('parameters');
    expect(fields).toContain('active');
    expect(fields).toContain('startDate');
    expect(fields).toContain('endDate');
  });
});

describe('Prisma schema — session & message models', () => {
  it('Session tracks Five R phase and engagement mode', () => {
    const fields = Object.values(Prisma.SessionScalarFieldEnum);
    expect(fields).toContain('studentId');
    expect(fields).toContain('subject');
    expect(fields).toContain('currentPhase');
    expect(fields).toContain('engagementMode');
    expect(fields).toContain('regulationState');
    expect(fields).toContain('tenantId');
  });

  it('Message has role and content', () => {
    const fields = Object.values(Prisma.MessageScalarFieldEnum);
    expect(fields).toContain('sessionId');
    expect(fields).toContain('role');
    expect(fields).toContain('content');
  });
});

describe('Prisma schema — assessment & progress models', () => {
  it('Assessment has Blooms level and scoring', () => {
    const fields = Object.values(Prisma.AssessmentScalarFieldEnum);
    expect(fields).toContain('sessionId');
    expect(fields).toContain('bloomsLevel');
    expect(fields).toContain('difficulty');
    expect(fields).toContain('question');
    expect(fields).toContain('studentResponse');
    expect(fields).toContain('isCorrect');
    expect(fields).toContain('score');
    expect(fields).toContain('feedback');
  });

  it('Progress tracks mastery per standard', () => {
    const fields = Object.values(Prisma.ProgressScalarFieldEnum);
    expect(fields).toContain('studentId');
    expect(fields).toContain('standardId');
    expect(fields).toContain('masteryLevel');
    expect(fields).toContain('assessmentCount');
    expect(fields).toContain('tenantId');
  });

  it('ThinkingAssessment has thinking quality and creativity scores', () => {
    const fields = Object.values(Prisma.ThinkingAssessmentScalarFieldEnum);
    expect(fields).toContain('reasoningArticulation');
    expect(fields).toContain('assumptionAwareness');
    expect(fields).toContain('evidenceEvaluation');
    expect(fields).toContain('fluency');
    expect(fields).toContain('flexibility');
    expect(fields).toContain('originality');
    expect(fields).toContain('elaboration');
    expect(fields).toContain('modeUsed');
    expect(fields).toContain('reasoningMovesUsed');
  });

  it('ReasoningMoveProgress tracks prompted vs spontaneous usage', () => {
    const fields = Object.values(Prisma.ReasoningMoveProgressScalarFieldEnum);
    expect(fields).toContain('studentId');
    expect(fields).toContain('move');
    expect(fields).toContain('usageCount');
    expect(fields).toContain('promptedUsage');
    expect(fields).toContain('spontaneousUsage');
    expect(fields).toContain('proficiencyLevel');
  });
});

describe('Prisma schema — curriculum models', () => {
  it('Standard has code, framework, and grade level', () => {
    const fields = Object.values(Prisma.StandardScalarFieldEnum);
    expect(fields).toContain('code');
    expect(fields).toContain('framework');
    expect(fields).toContain('subject');
    expect(fields).toContain('gradeLevel');
    expect(fields).toContain('domain');
    expect(fields).toContain('description');
  });

  it('Topic has conceptual understanding and misconceptions', () => {
    const fields = Object.values(Prisma.TopicScalarFieldEnum);
    expect(fields).toContain('name');
    expect(fields).toContain('subject');
    expect(fields).toContain('conceptualUnderstanding');
    expect(fields).toContain('commonMisconceptions');
    expect(fields).toContain('realWorldConnections');
    expect(fields).toContain('estimatedDuration');
  });

  it('Problem has scaffold and solution paths', () => {
    const fields = Object.values(Prisma.ProblemScalarFieldEnum);
    expect(fields).toContain('stem');
    expect(fields).toContain('scaffold');
    expect(fields).toContain('solutionPaths');
    expect(fields).toContain('commonErrors');
    expect(fields).toContain('rubric');
    expect(fields).toContain('bloomsLevel');
    expect(fields).toContain('type');
  });
});

describe('Prisma schema — AI usage & compliance', () => {
  it('AIUsageLedger tracks token usage and cost', () => {
    const fields = Object.values(Prisma.AIUsageLedgerScalarFieldEnum);
    expect(fields).toContain('tenantId');
    expect(fields).toContain('requestType');
    expect(fields).toContain('model');
    expect(fields).toContain('inputTokens');
    expect(fields).toContain('outputTokens');
    expect(fields).toContain('totalTokens');
    expect(fields).toContain('costUSD');
    expect(fields).toContain('latencyMs');
    expect(fields).toContain('feature');
  });

  it('AuditLog tracks FERPA/COPPA compliance events', () => {
    const fields = Object.values(Prisma.AuditLogScalarFieldEnum);
    expect(fields).toContain('tenantId');
    expect(fields).toContain('userId');
    expect(fields).toContain('action');
    expect(fields).toContain('resource');
    expect(fields).toContain('resourceId');
    expect(fields).toContain('ipAddress');
    expect(fields).toContain('previousHash');
    expect(fields).toContain('chainHash');
    expect(fields).toContain('timestamp');
  });
});

describe('Prisma schema — enums', () => {
  it('UserRole has 6 roles', () => {
    const values = Object.values(PrismaExports.UserRole);
    expect(values).toEqual([
      'STUDENT', 'EDUCATOR', 'PARENT',
      'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
    ]);
  });

  it('Subject has 3 subjects', () => {
    const values = Object.values(PrismaExports.Subject);
    expect(values).toEqual(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']);
  });

  it('FiveRPhase has 5 phases in correct order', () => {
    const values = Object.values(PrismaExports.FiveRPhase);
    expect(values).toEqual(['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT']);
  });

  it('EngagementMode has 5 modes', () => {
    const values = Object.values(PrismaExports.EngagementMode);
    expect(values).toEqual([
      'FORWARD', 'REVERSE', 'ERROR_ANALYSIS',
      'MULTIPLE_PATHWAYS', 'PROBLEM_POSING',
    ]);
  });

  it('BloomsLevel follows Blooms taxonomy order', () => {
    const values = Object.values(PrismaExports.BloomsLevel);
    expect(values).toEqual([
      'REMEMBER', 'UNDERSTAND', 'APPLY',
      'ANALYZE', 'EVALUATE', 'CREATE',
    ]);
  });

  it('SubscriptionTier has 4 tiers', () => {
    const values = Object.values(PrismaExports.SubscriptionTier);
    expect(values).toEqual(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
  });

  it('AccommodationType has 10 IEP accommodation types', () => {
    const values = Object.values(PrismaExports.AccommodationType);
    expect(values).toHaveLength(10);
    expect(values).toContain('EXTENDED_TIME');
    expect(values).toContain('TEXT_TO_SPEECH');
    expect(values).toContain('FREQUENT_BREAKS');
    expect(values).toContain('VISUAL_SUPPORTS');
  });

  it('ReasoningMove has 22 moves', () => {
    const values = Object.values(PrismaExports.ReasoningMove);
    expect(values).toHaveLength(22);
    expect(values).toContain('DECOMPOSE');
    expect(values).toContain('HYPOTHESIZE');
    expect(values).toContain('REFLECT');
    expect(values).toContain('PLAN');
  });

  it('MessageRole matches USER, ASSISTANT, SYSTEM', () => {
    const values = Object.values(PrismaExports.MessageRole);
    expect(values).toEqual(['USER', 'ASSISTANT', 'SYSTEM']);
  });

  it('AssessmentType has 4 types', () => {
    const values = Object.values(PrismaExports.AssessmentType);
    expect(values).toEqual(['DIAGNOSTIC', 'FORMATIVE', 'SUMMATIVE', 'PRACTICE']);
  });

  it('StandardFramework has 3 frameworks', () => {
    const values = Object.values(PrismaExports.StandardFramework);
    expect(values).toEqual(['GEORGIA', 'COMMON_CORE', 'NGSS']);
  });

  it('AIRequestType has 7 request types', () => {
    const values = Object.values(PrismaExports.AIRequestType);
    expect(values).toHaveLength(7);
    expect(values).toContain('TUTOR_CONVERSATION');
    expect(values).toContain('REGULATION_DETECTION');
    expect(values).toContain('THINKING_ANALYSIS');
  });

  it('AIFeature has 7 features', () => {
    const values = Object.values(PrismaExports.AIFeature);
    expect(values).toHaveLength(7);
    expect(values).toContain('CORE_TUTORING');
    expect(values).toContain('ADAPTIVE_ASSESSMENT');
    expect(values).toContain('REGULATION_SUPPORT');
  });
});

describe('Prisma schema — enum consistency with app constants', () => {
  it('UserRole enum matches ROLES constant', async () => {
    const { ROLES } = await import('@/constants/roles');
    const prismaRoles = Object.values(PrismaExports.UserRole);
    const appRoles = Object.values(ROLES);
    expect(prismaRoles).toEqual(expect.arrayContaining(appRoles as string[]));
    expect(appRoles).toEqual(expect.arrayContaining(prismaRoles as string[]));
  });

  it('Subject enum matches SUBJECTS constant', async () => {
    const { SUBJECTS } = await import('@/constants/subjects');
    const prismaSubjects = Object.values(PrismaExports.Subject);
    const appSubjects = Object.values(SUBJECTS);
    expect(prismaSubjects).toEqual(expect.arrayContaining(appSubjects as string[]));
    expect(appSubjects).toEqual(expect.arrayContaining(prismaSubjects as string[]));
  });
});
