import {
  BloomsLevel,
  ConsentStatus,
  EnrollmentStatus,
  Prisma,
  PrismaClient,
  ProblemType,
  ReasoningMove,
  StandardFramework,
  Subject,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'rootwork-demo';
const SCHOOL_NAME = 'RootWork Academy';
const ACADEMIC_YEAR = '2025-2026';

const educatorSeed = {
  clerkUserId: 'clerk_educator_demo_001',
  email: 'educator@rootwork.demo',
  firstName: 'Avery',
  lastName: 'Morgan',
};

const studentSeeds = [
  {
    clerkUserId: 'clerk_student_demo_001',
    email: 'student1@rootwork.demo',
    firstName: 'Jordan',
    lastName: 'Lee',
    gradeLevel: 7,
    learningPreferences: {
      preferredModality: ['visual', 'hands-on'],
      pacing: 'guided',
      collaborationStyle: 'pair',
    },
    regulationProfile: {
      baselineState: 'focused',
      triggers: ['multi-step anxiety'],
      supports: ['chunking', 'breathing prompts'],
    },
  },
  {
    clerkUserId: 'clerk_student_demo_002',
    email: 'student2@rootwork.demo',
    firstName: 'Sam',
    lastName: 'Patel',
    gradeLevel: 8,
    learningPreferences: {
      preferredModality: ['verbal', 'interactive'],
      pacing: 'self-paced',
      collaborationStyle: 'small-group',
    },
    regulationProfile: {
      baselineState: 'curious',
      triggers: ['time pressure'],
      supports: ['extended think time', 'reflective check-ins'],
    },
  },
] as const;

const curriculumStandards = [
  {
    code: 'CCSS.MATH.7.RP.A.2',
    framework: StandardFramework.COMMON_CORE,
    subject: Subject.MATH,
    gradeLevel: [7],
    domain: 'Ratios and Proportional Relationships',
    cluster: 'Analyze proportional relationships',
    description: 'Recognize and represent proportional relationships between quantities.',
    fullText:
      'Recognize and represent proportional relationships between quantities using tables, graphs, equations, and verbal descriptions.',
  },
  {
    code: 'NGSS.MS-PS1-2',
    framework: StandardFramework.NGSS,
    subject: Subject.SCIENCE,
    gradeLevel: [6, 7, 8],
    domain: 'Matter and Its Interactions',
    cluster: 'Chemical Reactions',
    description: 'Analyze and interpret data on properties of substances before and after interactions.',
    fullText:
      'Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred.',
  },
  {
    code: 'GA.ELA.7.RI.2',
    framework: StandardFramework.GEORGIA,
    subject: Subject.LANGUAGE_ARTS,
    gradeLevel: [7],
    domain: 'Reading Informational Text',
    cluster: 'Key Ideas and Details',
    description: 'Determine central ideas and summarize informational text objectively.',
    fullText:
      'Determine two or more central ideas in a text and analyze their development over the course of the text; provide an objective summary of the text.',
  },
] as const;

type TopicSeed = {
  name: string;
  subject: Subject;
  gradeLevel: number[];
  description: string;
  conceptualUnderstanding: string;
  commonMisconceptions: string[];
  realWorldConnections: string[];
  estimatedDuration: number;
  standardCodes: string[];
  learningObjectives: Array<{ description: string; bloomsLevel: BloomsLevel }>;
  problems: Array<{
    stem: string;
    scaffold: Prisma.InputJsonValue;
    solutionPaths: Prisma.InputJsonValue;
    commonErrors: Prisma.InputJsonValue;
    rubric: Prisma.InputJsonValue;
    difficulty: number;
    bloomsLevel: BloomsLevel;
    type: ProblemType;
  }>;
};

const topicSeeds: TopicSeed[] = [
  {
    name: 'Unit Rates in Everyday Contexts',
    subject: Subject.MATH,
    gradeLevel: [7],
    description: 'Students develop fluency with unit rates and proportional relationships in real-world settings.',
    conceptualUnderstanding:
      'A proportional relationship has a constant of proportionality that can be interpreted as a unit rate.',
    commonMisconceptions: [
      'Believing any linear relationship is proportional.',
      'Confusing additive patterns with multiplicative relationships.',
    ],
    realWorldConnections: ['Shopping discounts', 'Speed comparisons', 'Recipe scaling'],
    estimatedDuration: 90,
    standardCodes: ['CCSS.MATH.7.RP.A.2'],
    learningObjectives: [
      {
        description: 'Represent proportional relationships in tables and coordinate graphs.',
        bloomsLevel: BloomsLevel.APPLY,
      },
      {
        description: 'Justify whether a relationship is proportional using multiple representations.',
        bloomsLevel: BloomsLevel.EVALUATE,
      },
    ],
    problems: [
      {
        stem: 'A bike travels 42 miles in 3 hours. What is the unit rate and how far will it travel in 5.5 hours?',
        scaffold: {
          hints: ['Find miles per 1 hour first.', 'Use multiplication to scale to 5.5 hours.'],
        },
        solutionPaths: {
          methodA: '42 ÷ 3 = 14 miles/hour; 14 × 5.5 = 77 miles',
          methodB: 'Set up ratio table from 3 to 1 then to 5.5',
        },
        commonErrors: {
          errors: ['Dividing 3 by 42', 'Adding instead of multiplying to scale'],
        },
        rubric: {
          points: [
            { criteria: 'Correct unit rate', score: 2 },
            { criteria: 'Correct distance at 5.5 hours', score: 2 },
            { criteria: 'Reasoning explained', score: 1 },
          ],
        },
        difficulty: 2,
        bloomsLevel: BloomsLevel.APPLY,
        type: ProblemType.PRACTICE,
      },
    ],
  },
  {
    name: 'Evidence of Chemical Reactions',
    subject: Subject.SCIENCE,
    gradeLevel: [7, 8],
    description: 'Students interpret evidence to determine if chemical changes occurred.',
    conceptualUnderstanding:
      'Chemical reactions form new substances with properties different from the reactants.',
    commonMisconceptions: [
      'Any color change means a chemical reaction.',
      'Dissolving is always chemical change.',
    ],
    realWorldConnections: ['Cooking', 'Rusting metals', 'Baking soda and vinegar labs'],
    estimatedDuration: 75,
    standardCodes: ['NGSS.MS-PS1-2'],
    learningObjectives: [
      {
        description: 'Analyze data tables to identify likely chemical changes.',
        bloomsLevel: BloomsLevel.ANALYZE,
      },
    ],
    problems: [
      {
        stem: 'A student mixes two clear liquids and observes bubbles and temperature drop. Explain whether a chemical reaction likely occurred using evidence.',
        scaffold: {
          prompts: ['Identify observations', 'Connect each observation to possible particle-level changes'],
        },
        solutionPaths: {
          evidenceClaimReasoning: 'Gas formation and temperature change suggest new substances and energy transfer.',
        },
        commonErrors: {
          errors: ['Claiming certainty without evidence', 'Ignoring energy change'],
        },
        rubric: {
          criteria: ['Uses at least two observations', 'Links evidence to claim', 'Uses scientific vocabulary'],
        },
        difficulty: 3,
        bloomsLevel: BloomsLevel.ANALYZE,
        type: ProblemType.REAL_WORLD,
      },
    ],
  },
];

async function upsertTopic(topicSeed: TopicSeed, standardIds: string[]) {
  const existingTopic = await prisma.topic.findFirst({
    where: {
      name: topicSeed.name,
      subject: topicSeed.subject,
    },
  });

  const topic = existingTopic
    ? await prisma.topic.update({
        where: { id: existingTopic.id },
        data: {
          gradeLevel: topicSeed.gradeLevel,
          description: topicSeed.description,
          conceptualUnderstanding: topicSeed.conceptualUnderstanding,
          commonMisconceptions: topicSeed.commonMisconceptions,
          realWorldConnections: topicSeed.realWorldConnections,
          estimatedDuration: topicSeed.estimatedDuration,
          standards: {
            set: standardIds.map((id) => ({ id })),
          },
        },
      })
    : await prisma.topic.create({
        data: {
          name: topicSeed.name,
          subject: topicSeed.subject,
          gradeLevel: topicSeed.gradeLevel,
          description: topicSeed.description,
          conceptualUnderstanding: topicSeed.conceptualUnderstanding,
          commonMisconceptions: topicSeed.commonMisconceptions,
          realWorldConnections: topicSeed.realWorldConnections,
          estimatedDuration: topicSeed.estimatedDuration,
          standards: {
            connect: standardIds.map((id) => ({ id })),
          },
        },
      });

  await prisma.learningObjective.deleteMany({ where: { topicId: topic.id } });
  await prisma.problem.deleteMany({ where: { topicId: topic.id } });

  await prisma.learningObjective.createMany({
    data: topicSeed.learningObjectives.map((objective) => ({
      topicId: topic.id,
      description: objective.description,
      bloomsLevel: objective.bloomsLevel,
    })),
  });

  await prisma.problem.createMany({
    data: topicSeed.problems.map((problem) => ({
      topicId: topic.id,
      stem: problem.stem,
      scaffold: problem.scaffold,
      solutionPaths: problem.solutionPaths,
      commonErrors: problem.commonErrors,
      rubric: problem.rubric,
      difficulty: problem.difficulty,
      bloomsLevel: problem.bloomsLevel,
      type: problem.type,
      validated: true,
    })),
  });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      name: 'RootWork Demo District',
      domain: 'demo.rootwork.local',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      settings: {
        region: 'US',
        timezone: 'America/New_York',
      },
    },
    create: {
      name: 'RootWork Demo District',
      slug: TENANT_SLUG,
      domain: 'demo.rootwork.local',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      settings: {
        region: 'US',
        timezone: 'America/New_York',
      },
    },
  });

  const school = await prisma.school.upsert({
    where: {
      id: (await prisma.school.findFirst({ where: { tenantId: tenant.id, name: SCHOOL_NAME } }))?.id ?? 'missing',
    },
    update: {
      name: SCHOOL_NAME,
      gradeRange: [6, 7, 8],
      settings: {
        bellSchedule: 'middle-school-standard',
      },
    },
    create: {
      tenantId: tenant.id,
      name: SCHOOL_NAME,
      gradeRange: [6, 7, 8],
      settings: {
        bellSchedule: 'middle-school-standard',
      },
    },
  });

  const educatorUser = await prisma.user.upsert({
    where: { clerkUserId: educatorSeed.clerkUserId },
    update: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: educatorSeed.email,
      firstName: educatorSeed.firstName,
      lastName: educatorSeed.lastName,
      role: UserRole.EDUCATOR,
      isMinor: false,
      consentStatus: null,
    },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      clerkUserId: educatorSeed.clerkUserId,
      email: educatorSeed.email,
      firstName: educatorSeed.firstName,
      lastName: educatorSeed.lastName,
      role: UserRole.EDUCATOR,
      isMinor: false,
    },
  });

  await prisma.educator.upsert({
    where: { userId: educatorUser.id },
    update: {
      certifications: ['GaTAPP', 'Middle Grades Mathematics'],
      specializations: ['Project-based learning', 'SEL integration'],
    },
    create: {
      userId: educatorUser.id,
      certifications: ['GaTAPP', 'Middle Grades Mathematics'],
      specializations: ['Project-based learning', 'SEL integration'],
    },
  });

  const seededStudents = [] as Array<{ id: string; studentId: string; gradeLevel: number }>;

  for (const studentSeed of studentSeeds) {
    const user = await prisma.user.upsert({
      where: { clerkUserId: studentSeed.clerkUserId },
      update: {
        tenantId: tenant.id,
        schoolId: school.id,
        email: studentSeed.email,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        role: UserRole.STUDENT,
        isMinor: true,
        consentStatus: ConsentStatus.GRANTED,
      },
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        clerkUserId: studentSeed.clerkUserId,
        email: studentSeed.email,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        role: UserRole.STUDENT,
        isMinor: true,
        consentStatus: ConsentStatus.GRANTED,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        gradeLevel: studentSeed.gradeLevel,
        learningPreferences: studentSeed.learningPreferences,
        regulationProfile: studentSeed.regulationProfile,
      },
      create: {
        userId: user.id,
        gradeLevel: studentSeed.gradeLevel,
        learningPreferences: studentSeed.learningPreferences,
        regulationProfile: studentSeed.regulationProfile,
      },
    });

    seededStudents.push({ id: user.id, studentId: student.id, gradeLevel: student.gradeLevel });
  }

  const mathClass = await prisma.class.upsert({
    where: {
      id:
        (await prisma.class.findFirst({
          where: {
            tenantId: tenant.id,
            schoolId: school.id,
            name: 'Foundations of Proportional Reasoning',
            academicYear: ACADEMIC_YEAR,
          },
        }))?.id ?? 'missing',
    },
    update: {
      subject: Subject.MATH,
      gradeLevel: 7,
      educatorId: educatorUser.id,
    },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      name: 'Foundations of Proportional Reasoning',
      subject: Subject.MATH,
      gradeLevel: 7,
      academicYear: ACADEMIC_YEAR,
      educatorId: educatorUser.id,
    },
  });

  for (const seededStudent of seededStudents) {
    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: {
          classId: mathClass.id,
          studentId: seededStudent.studentId,
        },
      },
      update: {
        tenantId: tenant.id,
        status: EnrollmentStatus.ACTIVE,
      },
      create: {
        tenantId: tenant.id,
        classId: mathClass.id,
        studentId: seededStudent.studentId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  const standardIdByCode = new Map<string, string>();

  for (const standardSeed of curriculumStandards) {
    const standard = await prisma.standard.upsert({
      where: { code: standardSeed.code },
      update: {
        framework: standardSeed.framework,
        subject: standardSeed.subject,
        gradeLevel: standardSeed.gradeLevel,
        domain: standardSeed.domain,
        cluster: standardSeed.cluster,
        description: standardSeed.description,
        fullText: standardSeed.fullText,
      },
      create: standardSeed,
    });

    standardIdByCode.set(standard.code, standard.id);
  }

  for (const topicSeed of topicSeeds) {
    const standardIds = topicSeed.standardCodes
      .map((code) => standardIdByCode.get(code))
      .filter((id): id is string => Boolean(id));

    await upsertTopic(topicSeed, standardIds);
  }

  const starterReasoningMoves: ReasoningMove[] = [
    ReasoningMove.DECOMPOSE,
    ReasoningMove.IDENTIFY,
    ReasoningMove.QUESTION,
    ReasoningMove.VERIFY,
    ReasoningMove.REFLECT,
  ];

  for (const seededStudent of seededStudents) {
    for (const move of starterReasoningMoves) {
      await prisma.reasoningMoveProgress.upsert({
        where: {
          studentId_move: {
            studentId: seededStudent.studentId,
            move,
          },
        },
        update: {
          proficiencyLevel: 1,
        },
        create: {
          studentId: seededStudent.studentId,
          move,
          introducedAt: new Date(),
          usageCount: 0,
          promptedUsage: 0,
          spontaneousUsage: 0,
          proficiencyLevel: 1,
        },
      });
    }
  }

  console.log('✅ Seeded tenant, school, users, classes, enrollments, curriculum, and reasoning progress.');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
