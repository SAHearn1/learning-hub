import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // ═══════════════════════════════════════════════════════════════
  // 1. CREATE TENANT
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating tenant...');
  
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-district' },
    update: {},
    create: {
      name: 'Demo School District',
      slug: 'demo-district',
      domain: 'demo.rootwork.edu',
      subscriptionTier: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      settings: JSON.stringify({
        features: {
          aiTutoring: true,
          reverseEngineering: true,
          errorAnalysis: true,
        },
      }),
    },
  });

  console.log(`✅ Tenant created: ${tenant.name}`);

  // ═══════════════════════════════════════════════════════════════
  // 2. CREATE SCHOOL
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating school...');
  
  const school = await prisma.school.upsert({
    where: { id: 'demo-middle-school-1' },
    update: {},
    create: {
      id: 'demo-middle-school-1',
      tenantId: tenant.id,
      name: 'Roosevelt Middle School',
      address: '123 Learning Lane, Education City, EC 12345',
      gradeRange: [6, 7, 8],
      settings: JSON.stringify({
        academicYear: '2025-2026',
        timezone: 'America/New_York',
      }),
    },
  });

  console.log(`✅ School created: ${school.name}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. CREATE USERS (Educator & Students)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating users...');

  // Create Educator
  const educatorUser = await prisma.user.upsert({
    where: { clerkUserId: 'clerk_educator_demo_001' },
    update: {},
    create: {
      clerkUserId: 'clerk_educator_demo_001',
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'ms.johnson@demo.rootwork.edu',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'EDUCATOR',
      dateOfBirth: new Date('1985-04-15'),
      isMinor: false,
    },
  });

  const educator = await prisma.educator.upsert({
    where: { userId: educatorUser.id },
    update: {},
    create: {
      userId: educatorUser.id,
      certifications: ['Mathematics Education', 'Special Education'],
      specializations: ['Middle School Math', 'Differentiated Instruction'],
    },
  });

  console.log(`✅ Educator created: ${educatorUser.firstName} ${educatorUser.lastName}`);

  // Create Students
  const studentData = [
    {
      clerkUserId: 'clerk_student_demo_001',
      email: 'alex.martinez@demo.rootwork.edu',
      firstName: 'Alex',
      lastName: 'Martinez',
      gradeLevel: 7,
      learningPreferences: {
        visualLearner: true,
        preferredPacing: 'moderate',
        interestAreas: ['space', 'technology', 'art'],
      },
      regulationProfile: {
        baselineEngagement: 'high',
        stressIndicators: ['rushing', 'minimal responses'],
        preferredBreakActivities: ['stretching', 'deep breathing'],
      },
    },
    {
      clerkUserId: 'clerk_student_demo_002',
      email: 'jordan.lee@demo.rootwork.edu',
      firstName: 'Jordan',
      lastName: 'Lee',
      gradeLevel: 7,
      learningPreferences: {
        kinestheticLearner: true,
        preferredPacing: 'fast',
        interestAreas: ['sports', 'music', 'nature'],
      },
      regulationProfile: {
        baselineEngagement: 'moderate',
        stressIndicators: ['asking to stop', 'off-topic'],
        preferredBreakActivities: ['movement break', 'joke time'],
      },
    },
    {
      clerkUserId: 'clerk_student_demo_003',
      email: 'taylor.smith@demo.rootwork.edu',
      firstName: 'Taylor',
      lastName: 'Smith',
      gradeLevel: 6,
      learningPreferences: {
        auditoryLearner: true,
        preferredPacing: 'slow',
        interestAreas: ['reading', 'animals', 'cooking'],
      },
      regulationProfile: {
        baselineEngagement: 'moderate',
        stressIndicators: ['long pauses', 'self-doubt statements'],
        preferredBreakActivities: ['positive affirmations', 'progressive muscle relaxation'],
      },
    },
  ];

  const students = [];
  for (const data of studentData) {
    const user = await prisma.user.upsert({
      where: { clerkUserId: data.clerkUserId },
      update: {},
      create: {
        clerkUserId: data.clerkUserId,
        tenantId: tenant.id,
        schoolId: school.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'STUDENT',
        dateOfBirth: new Date('2012-06-15'),
        isMinor: true,
        consentStatus: 'GRANTED',
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        gradeLevel: data.gradeLevel,
        learningPreferences: data.learningPreferences,
        regulationProfile: data.regulationProfile,
      },
    });

    students.push({ user, student });
    console.log(`✅ Student created: ${user.firstName} ${user.lastName}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. CREATE CLASS
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating class...');

  const mathClass = await prisma.class.upsert({
    where: { id: 'class-7th-grade-math-001' },
    update: {},
    create: {
      id: 'class-7th-grade-math-001',
      tenantId: tenant.id,
      schoolId: school.id,
      name: '7th Grade Mathematics - Period 3',
      subject: 'MATH',
      gradeLevel: 7,
      academicYear: '2025-2026',
      educatorId: educatorUser.id,
    },
  });

  console.log(`✅ Class created: ${mathClass.name}`);

  // ═══════════════════════════════════════════════════════════════
  // 5. CREATE CLASS ENROLLMENTS
  // ═══════════════════════════════════════════════════════════════
  console.log('Enrolling students in class...');

  for (const { student } of students.filter((s) => s.user.firstName !== 'Taylor')) {
    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: {
          classId: mathClass.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        classId: mathClass.id,
        studentId: student.id,
        status: 'ACTIVE',
      },
    });
  }

  console.log(`✅ Students enrolled`);

  // ═══════════════════════════════════════════════════════════════
  // 5.5. CREATE PARENT & ADMIN USERS
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating parent and admin users...');

  // Create Parent User (linked to Alex Martinez)
  const parentUser = await prisma.user.upsert({
    where: { clerkUserId: 'clerk_parent_demo_001' },
    update: {},
    create: {
      clerkUserId: 'clerk_parent_demo_001',
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'parent@demo.rootwork.edu',
      firstName: 'Maria',
      lastName: 'Martinez',
      role: 'PARENT',
      dateOfBirth: new Date('1980-03-20'),
      isMinor: false,
    },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      communicationPrefs: {
        email: true,
        sms: false,
        weeklyReports: true,
      },
    },
  });

  // Link parent to Alex Martinez (first student)
  if (students.length > 0) {
    await prisma.parentStudentRelationship.upsert({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: students[0].student.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        parentId: parent.id,
        studentId: students[0].student.id,
        relationshipType: 'PARENT',
        isPrimary: true,
      },
    });
  }

  console.log(`✅ Parent created: ${parentUser.firstName} ${parentUser.lastName}`);

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { clerkUserId: 'clerk_admin_demo_001' },
    update: {},
    create: {
      clerkUserId: 'clerk_admin_demo_001',
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'admin@demo.rootwork.edu',
      firstName: 'Robert',
      lastName: 'Admin',
      role: 'ADMIN',
      dateOfBirth: new Date('1975-07-10'),
      isMinor: false,
    },
  });

  console.log(`✅ Admin created: ${adminUser.firstName} ${adminUser.lastName}`);

  // ═══════════════════════════════════════════════════════════════
  // 6. CREATE STANDARDS
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating academic standards...');

  const standards = [
    {
      code: 'MGSE7.NS.1',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'The Number System',
      cluster: 'Apply and extend previous understandings of operations with fractions',
      description: 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers',
      fullText: 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers; represent addition and subtraction on a horizontal or vertical number line diagram.',
    },
    {
      code: 'MGSE7.NS.2',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'The Number System',
      cluster: 'Apply and extend previous understandings of operations with fractions',
      description: 'Apply and extend previous understandings of multiplication and division with fractions',
      fullText: 'Apply and extend previous understandings of multiplication and division and of fractions to multiply and divide rational numbers.',
    },
    {
      code: 'MGSE7.EE.1',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Expressions and Equations',
      cluster: 'Use properties of operations to generate equivalent expressions',
      description: 'Apply properties of operations as strategies to add, subtract, factor, and expand linear expressions with rational coefficients',
      fullText: 'Apply properties of operations as strategies to add, subtract, factor, and expand linear expressions with rational coefficients.',
    },
    {
      code: 'MGSE7.EE.4',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Expressions and Equations',
      cluster: 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations',
      description: 'Use variables to represent quantities in a real-world or mathematical problem',
      fullText: 'Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations and inequalities to solve problems by reasoning about the quantities.',
    },
  ];

  const createdStandards = [];
  for (const stdData of standards) {
    const standard = await prisma.standard.upsert({
      where: { code: stdData.code },
      update: {},
      create: stdData,
    });
    createdStandards.push(standard);
    console.log(`✅ Standard created: ${standard.code}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. CREATE TOPICS
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating topics...');

  const topics = [
    {
      id: 'topic-rational-numbers-001',
      name: 'Adding and Subtracting Rational Numbers',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Understanding how to add and subtract positive and negative fractions, decimals, and integers',
      conceptualUnderstanding: 'Rational numbers extend the number system to include negatives. Operations with rational numbers follow consistent rules based on understanding magnitude and direction.',
      commonMisconceptions: [
        'Students think two negatives always make a positive',
        'Confusion about when to add vs subtract when signs differ',
        'Difficulty visualizing operations on a number line',
      ],
      realWorldConnections: [
        'Temperature changes (above/below zero)',
        'Bank account deposits and withdrawals',
        'Elevation changes (above/below sea level)',
      ],
      estimatedDuration: 45,
    },
    {
      id: 'topic-linear-expressions-001',
      name: 'Simplifying Linear Expressions',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Combining like terms and using properties of operations to simplify algebraic expressions',
      conceptualUnderstanding: 'Algebraic expressions represent patterns and relationships. Simplifying expressions makes them easier to work with while preserving their meaning.',
      commonMisconceptions: [
        'Thinking 2x + 3y = 5xy',
        'Not recognizing like terms',
        'Confusion with negative coefficients',
      ],
      realWorldConnections: [
        'Calculating total costs with variables',
        'Representing patterns in tables',
        'Formulas in science and engineering',
      ],
      estimatedDuration: 40,
    },

    {
      id: 'topic-finlit-ch-i-001',
      name: 'Financial Literacy Chapter I: Foundations',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Foundational financial decision-making, values, and goal setting.',
      conceptualUnderstanding: 'Financial choices are shaped by priorities, tradeoffs, and time horizon.',
      commonMisconceptions: ['Money habits are fixed', 'Financial planning is only for adults'],
      realWorldConnections: ['Personal spending choices', 'Short- and long-term goal planning'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-ii-001',
      name: 'Financial Literacy Chapter II: Budgeting and Cash Flow',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Budget construction and cash-flow tracking.',
      conceptualUnderstanding: 'Budgets align spending with priorities and constraints.',
      commonMisconceptions: ['Budgets are restrictive only'],
      realWorldConnections: ['Allowance, paychecks, subscriptions'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-iii-001',
      name: 'Financial Literacy Chapter III: Banking',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Bank accounts, fees, and account security.',
      conceptualUnderstanding: 'Banks provide services that support liquidity and safety.',
      commonMisconceptions: ['All accounts are the same'],
      realWorldConnections: ['Debit cards and direct deposit'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-iv-001',
      name: 'Financial Literacy Chapter IV: Credit and Debt',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Credit scores, APR, and healthy borrowing.',
      conceptualUnderstanding: 'Credit is a tool that can help or harm depending on usage.',
      commonMisconceptions: ['Minimum payments are enough'],
      realWorldConnections: ['Credit cards, student loans'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-v-001',
      name: 'Financial Literacy Chapter V: Income and Taxes',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Paychecks, deductions, and tax basics.',
      conceptualUnderstanding: 'Net pay depends on deductions and withholding choices.',
      commonMisconceptions: ['Gross pay equals take-home pay'],
      realWorldConnections: ['Part-time jobs'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-vi-001',
      name: 'Financial Literacy Chapter VI: Saving',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Savings goals and emergency funds.',
      conceptualUnderstanding: 'Automatic and goal-based saving improves resilience.',
      commonMisconceptions: ['Saving starts after earning a lot'],
      realWorldConnections: ['Emergency expenses'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-vii-001',
      name: 'Financial Literacy Chapter VII: Investing Fundamentals',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Risk, return, and diversification.',
      conceptualUnderstanding: 'Time in market and diversification reduce concentrated risk.',
      commonMisconceptions: ['Investing is gambling'],
      realWorldConnections: ['Retirement accounts'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-viii-001',
      name: 'Financial Literacy Chapter VIII: Insurance',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Insurance as risk transfer.',
      conceptualUnderstanding: 'Insurance protects against low-probability high-cost events.',
      commonMisconceptions: ['Insurance always costs more than it helps'],
      realWorldConnections: ['Health and auto insurance'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-ix-001',
      name: 'Financial Literacy Chapter IX: Consumer Skills',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Smart spending, fraud prevention, and contracts.',
      conceptualUnderstanding: 'Informed consumer behavior reduces financial risk.',
      commonMisconceptions: ['Lowest sticker price is always best'],
      realWorldConnections: ['Online shopping and subscriptions'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-x-001',
      name: 'Financial Literacy Chapter X: Major Purchases',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Housing, transportation, and major purchase planning.',
      conceptualUnderstanding: 'Total cost of ownership matters more than monthly payment alone.',
      commonMisconceptions: ['If monthly payment fits, it is affordable'],
      realWorldConnections: ['Renting, buying used car'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-xi-001',
      name: 'Financial Literacy Chapter XI: College and Career Finance',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Postsecondary planning and aid options.',
      conceptualUnderstanding: 'Education ROI should be evaluated with debt and earnings.',
      commonMisconceptions: ['Most expensive school is always best'],
      realWorldConnections: ['FAFSA and scholarships'],
      estimatedDuration: 45,
    },
    {
      id: 'topic-finlit-ch-xii-001',
      name: 'Financial Literacy Chapter XII: Capstone',
      subject: 'FINANCIAL_LITERACY' as const,
      gradeLevel: [9, 10, 11, 12],
      description: 'Integrated financial wellness plan.',
      conceptualUnderstanding: 'Budgeting, saving, credit, and investing work as a system.',
      commonMisconceptions: ['One-time planning is enough'],
      realWorldConnections: ['Personal financial roadmap'],
      estimatedDuration: 60,
    },
  ];

  const createdTopics = [];
  for (const topicData of topics) {
    const topic = await prisma.topic.upsert({
      where: { id: topicData.id },
      update: {},
      create: {
        ...topicData,
        standards: {
          connect: createdStandards
            .filter((s) => topicData.name.includes('Rational') ? s.code.includes('NS') : s.code.includes('EE'))
            .map((s) => ({ id: s.id })),
        },
      },
    });
    createdTopics.push(topic);
    console.log(`✅ Topic created: ${topic.name}`);
  }


  // ═══════════════════════════════════════════════════════════════
  // 7.5 CREATE FINANCIAL LITERACY TOPICS (Ch. I-XII)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating financial literacy topics...');

  const finlitTopics = [
    {
      key: 'finlit-ch-i-income-career-planning',
      name: 'Ch. I: Income and Career Planning',
      learningObjectives: [
        'Explain how education and career choices influence lifetime income.',
        'Compare salary, wages, and gig income including tradeoffs.',
      ],
      fiveRsAlignment: { ROOT: 'Career identity and goals', REFLECT: 'Income decision making' },
    },
    {
      key: 'finlit-ch-ii-budgeting-cash-flow',
      name: 'Ch. II: Budgeting and Cash Flow',
      learningObjectives: [
        'Create a monthly zero-based budget using fixed and variable expenses.',
        'Analyze spending patterns and adjust categories to meet savings goals.',
      ],
      fiveRsAlignment: { REGULATE: 'Impulse spending awareness', RESTORE: 'Budget review cycle' },
    },
    {
      key: 'finlit-ch-iii-banking-services',
      name: 'Ch. III: Banking and Financial Services',
      learningObjectives: [
        'Differentiate checking, savings, and money market accounts.',
        'Evaluate banking fees and choose cost-effective account options.',
      ],
    },
    {
      key: 'finlit-ch-iv-saving-strategies',
      name: 'Ch. IV: Saving and Emergency Funds',
      learningObjectives: [
        'Set short- and long-term savings goals using SMART criteria.',
        'Calculate emergency fund targets based on monthly expenses.',
      ],
      fiveRsAlignment: { ROOT: 'Needs vs wants baseline', RECONNECT: 'Savings habits transfer' },
    },
    {
      key: 'finlit-ch-v-credit-and-debt',
      name: 'Ch. V: Credit and Debt Management',
      learningObjectives: [
        'Explain how credit scores are calculated and why they matter.',
        'Compare debt repayment methods including avalanche and snowball.',
      ],
    },
    {
      key: 'finlit-ch-vi-loans-and-interest',
      name: 'Ch. VI: Loans and Interest',
      learningObjectives: [
        'Compute simple and compound interest for common loan products.',
        'Compare total borrowing costs across loan terms and rates.',
      ],
      fiveRsAlignment: { REFLECT: 'Cost-of-credit reasoning' },
    },
    {
      key: 'finlit-ch-vii-consumer-skills',
      name: 'Ch. VII: Consumer Skills and Smart Purchasing',
      learningObjectives: [
        'Use unit pricing and total cost to compare purchasing options.',
        'Identify persuasive marketing techniques and consumer protections.',
      ],
    },
    {
      key: 'finlit-ch-viii-risk-insurance',
      name: 'Ch. VIII: Risk Management and Insurance',
      learningObjectives: [
        'Explain how insurance pools risk and why deductibles affect premiums.',
        'Match insurance products to real-world risk scenarios.',
      ],
      fiveRsAlignment: { REGULATE: 'Risk perception and emotional decisions' },
    },
    {
      key: 'finlit-ch-ix-taxes-paychecks',
      name: 'Ch. IX: Taxes and Paychecks',
      learningObjectives: [
        'Interpret paycheck components including withholdings and net pay.',
        'Describe the purpose of major U.S. taxes and filing basics.',
      ],
    },
    {
      key: 'finlit-ch-x-investing-basics',
      name: 'Ch. X: Investing Basics',
      learningObjectives: [
        'Differentiate stocks, bonds, mutual funds, and ETFs.',
        'Explain diversification and risk-return tradeoffs for beginners.',
      ],
      fiveRsAlignment: { RECONNECT: 'Long-term wealth building habits' },
    },
    {
      key: 'finlit-ch-xi-retirement-planning',
      name: 'Ch. XI: Retirement and Long-Term Planning',
      learningObjectives: [
        'Compare retirement account options such as 401(k) and IRA.',
        'Model the impact of starting contributions early vs later.',
      ],
    },
    {
      key: 'finlit-ch-xii-financial-decision-making',
      name: 'Ch. XII: Financial Decision-Making and Goal Setting',
      learningObjectives: [
        'Apply a structured process to make major financial decisions.',
        'Build a personal financial action plan for the next 12 months.',
      ],
      fiveRsAlignment: { ROOT: 'Values and priorities', RECONNECT: 'Action plan and accountability' },
    },
  ] as const;

  for (const finlitTopic of finlitTopics) {
    const topicId = `topic-${finlitTopic.key}`;

    await prisma.topic.upsert({
      where: { id: topicId },
      update: {
        name: finlitTopic.name,
        subject: 'FINANCIAL_LITERACY',
        gradeLevel: [9, 10, 11, 12],
        description: `${finlitTopic.name} introduces core personal finance concepts for high school learners.`,
        conceptualUnderstanding:
          'Personal finance choices compound over time; informed, values-aligned decisions improve long-term outcomes.',
        commonMisconceptions: [
          'Financial literacy is only relevant in adulthood',
          'Higher income alone guarantees financial stability',
          'Small money decisions do not meaningfully affect long-term goals',
        ],
        realWorldConnections: [
          'Managing paycheck-to-paycheck decisions',
          'Comparing financial products and contracts',
          'Planning for education, housing, and future goals',
        ],
        estimatedDuration: 50,
        fiveRsAlignment: finlitTopic.fiveRsAlignment ?? null,
      },
      create: {
        id: topicId,
        name: finlitTopic.name,
        subject: 'FINANCIAL_LITERACY',
        gradeLevel: [9, 10, 11, 12],
        description: `${finlitTopic.name} introduces core personal finance concepts for high school learners.`,
        conceptualUnderstanding:
          'Personal finance choices compound over time; informed, values-aligned decisions improve long-term outcomes.',
        commonMisconceptions: [
          'Financial literacy is only relevant in adulthood',
          'Higher income alone guarantees financial stability',
          'Small money decisions do not meaningfully affect long-term goals',
        ],
        realWorldConnections: [
          'Managing paycheck-to-paycheck decisions',
          'Comparing financial products and contracts',
          'Planning for education, housing, and future goals',
        ],
        estimatedDuration: 50,
        fiveRsAlignment: finlitTopic.fiveRsAlignment ?? null,
      },
    });

    for (const [index, objective] of finlitTopic.learningObjectives.entries()) {
      await prisma.learningObjective.upsert({
        where: { id: `obj-${finlitTopic.key}-${index + 1}` },
        update: {
          description: objective,
          topicId,
          bloomsLevel: 'APPLY',
        },
        create: {
          id: `obj-${finlitTopic.key}-${index + 1}`,
          topicId,
          description: objective,
          bloomsLevel: 'APPLY',
        },
      });
    }

    console.log(`✅ Financial literacy topic created: ${finlitTopic.name}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. CREATE LEARNING OBJECTIVES
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating learning objectives...');

  const objectives = [
    {
      id: 'obj-rational-number-line-001',
      topicId: 'topic-rational-numbers-001',
      description: 'Students will add two rational numbers using a number line',
      bloomsLevel: 'APPLY' as const,
    },
    {
      id: 'obj-rational-subtraction-001',
      topicId: 'topic-rational-numbers-001',
      description: 'Students will explain why subtraction is the same as adding the opposite',
      bloomsLevel: 'UNDERSTAND' as const,
    },
    {
      id: 'obj-linear-like-terms-001',
      topicId: 'topic-linear-expressions-001',
      description: 'Students will combine like terms in a linear expression',
      bloomsLevel: 'APPLY' as const,
    },
    {
      id: 'obj-linear-distributive-001',
      topicId: 'topic-linear-expressions-001',
      description: 'Students will apply the distributive property to expand expressions',
      bloomsLevel: 'APPLY' as const,
    },

    { id: 'obj-finlit-ch-i-001', topicId: 'topic-finlit-ch-i-001', description: 'Set measurable personal financial goals with optional 5Rs reflection.', bloomsLevel: 'APPLY' as const },
    { id: 'obj-finlit-ch-ii-001', topicId: 'topic-finlit-ch-ii-001', description: 'Create and balance a monthly budget.', bloomsLevel: 'APPLY' as const },
    { id: 'obj-finlit-ch-iii-001', topicId: 'topic-finlit-ch-iii-001', description: 'Compare checking and savings account features.', bloomsLevel: 'ANALYZE' as const },
    { id: 'obj-finlit-ch-iv-001', topicId: 'topic-finlit-ch-iv-001', description: 'Explain how credit behaviors affect score and borrowing cost.', bloomsLevel: 'UNDERSTAND' as const },
    { id: 'obj-finlit-ch-v-001', topicId: 'topic-finlit-ch-v-001', description: 'Interpret paycheck deductions and estimate net pay.', bloomsLevel: 'APPLY' as const },
    { id: 'obj-finlit-ch-vi-001', topicId: 'topic-finlit-ch-vi-001', description: 'Design an emergency fund plan.', bloomsLevel: 'CREATE' as const },
    { id: 'obj-finlit-ch-vii-001', topicId: 'topic-finlit-ch-vii-001', description: 'Evaluate basic investment choices by risk and return.', bloomsLevel: 'ANALYZE' as const },
    { id: 'obj-finlit-ch-viii-001', topicId: 'topic-finlit-ch-viii-001', description: 'Select insurance types for common scenarios.', bloomsLevel: 'APPLY' as const },
    { id: 'obj-finlit-ch-ix-001', topicId: 'topic-finlit-ch-ix-001', description: 'Use comparison-shopping criteria to make a purchase decision.', bloomsLevel: 'APPLY' as const },
    { id: 'obj-finlit-ch-x-001', topicId: 'topic-finlit-ch-x-001', description: 'Calculate total ownership costs for major purchases.', bloomsLevel: 'ANALYZE' as const },
    { id: 'obj-finlit-ch-xi-001', topicId: 'topic-finlit-ch-xi-001', description: 'Compare postsecondary options using cost and aid data.', bloomsLevel: 'EVALUATE' as const },
    { id: 'obj-finlit-ch-xii-001', topicId: 'topic-finlit-ch-xii-001', description: 'Develop a personal financial wellness capstone plan.', bloomsLevel: 'CREATE' as const },
  ];

  for (const objData of objectives) {
    await prisma.learningObjective.upsert({
      where: { id: objData.id },
      update: {},
      create: objData,
    });
  }

  console.log(`✅ ${objectives.length} learning objectives created`);

  // ═══════════════════════════════════════════════════════════════
  // 9. CREATE PROBLEMS
  // ═══════════════════════════════════════════════════════════════
  console.log('❓ Creating practice problems...');

  const problems = [
    {
      id: 'problem-rational-add-001',
      topicId: 'topic-rational-numbers-001',
      stem: 'Calculate: -3.5 + 2.8',
      scaffold: {
        hints: [
          'Think about which number has a greater absolute value',
          'The sign of the answer will match the number with greater absolute value',
          'Try using a number line to visualize',
        ],
        steps: [
          'Identify the absolute values: |-3.5| = 3.5 and |2.8| = 2.8',
          'Since 3.5 > 2.8, the answer will be negative',
          'Subtract: 3.5 - 2.8 = 0.7',
          'Apply the negative sign: -0.7',
        ],
      },
      solutionPaths: [
        {
          method: 'number-line',
          steps: ['Start at -3.5', 'Move right 2.8 units', 'Land at -0.7'],
        },
        {
          method: 'absolute-value',
          steps: ['Find |-3.5| = 3.5', 'Find |2.8| = 2.8', 'Subtract: 3.5 - 2.8 = 0.7', 'Answer: -0.7'],
        },
      ],
      commonErrors: {
        'adding-absolute-values': {
          incorrectAnswer: '-6.3',
          explanation: 'Added absolute values instead of recognizing opposite signs',
          remediation: 'When signs are different, subtract the smaller from the larger',
        },
        'wrong-sign': {
          incorrectAnswer: '0.7',
          explanation: 'Correct magnitude but wrong sign',
          remediation: 'The sign matches the number with greater absolute value',
        },
      },
      rubric: {
        correctAnswer: '-0.7',
        partialCredit: [
          { condition: 'correct-process-minor-arithmetic', points: 0.8 },
          { condition: 'correct-absolute-value-wrong-sign', points: 0.5 },
        ],
      },
      gardenContext: 'A gardener planted flowers at 3.5 feet below ground level in the morning, then the soil level rose 2.8 feet after rain. What is the new depth?',
      difficulty: 3,
      bloomsLevel: 'APPLY' as const,
      type: 'PRACTICE' as const,
      validated: true,
    },
    {
      id: 'problem-linear-simplify-001',
      topicId: 'topic-linear-expressions-001',
      stem: 'Simplify: 4x + 7 - 2x + 3',
      scaffold: {
        hints: [
          'Look for like terms (terms with the same variable)',
          'Combine the x terms separately from the constant terms',
          'Remember to keep track of positive and negative signs',
        ],
        steps: [
          'Identify like terms: 4x and -2x are like terms; 7 and 3 are like terms',
          'Combine x terms: 4x - 2x = 2x',
          'Combine constants: 7 + 3 = 10',
          'Write simplified expression: 2x + 10',
        ],
      },
      solutionPaths: [
        {
          method: 'grouping',
          steps: ['Group: (4x - 2x) + (7 + 3)', 'Simplify: 2x + 10'],
        },
        {
          method: 'sequential',
          steps: ['4x + 7 - 2x + 3', 'Combine 4x and -2x: 2x + 7 + 3', 'Combine 7 and 3: 2x + 10'],
        },
      ],
      commonErrors: {
        'combining-unlike-terms': {
          incorrectAnswer: '12x',
          explanation: 'Tried to combine variables with constants',
          remediation: 'Only combine terms with the same variable and exponent',
        },
        'sign-error': {
          incorrectAnswer: '6x + 10',
          explanation: 'Added instead of subtracting 2x',
          remediation: 'Pay attention to the operation before each term',
        },
      },
      rubric: {
        correctAnswer: '2x + 10',
        partialCredit: [
          { condition: 'correct-x-terms-only', points: 0.5 },
          { condition: 'correct-constants-only', points: 0.3 },
        ],
      },
      gardenContext: 'You have 4 rows of x flowers each, plus 7 individual flowers. You give away 2 rows of x flowers each, but receive 3 more individual flowers. How many flowers do you have?',
      difficulty: 2,
      bloomsLevel: 'APPLY' as const,
      type: 'PRACTICE' as const,
      validated: true,
    },
  ];

  for (const probData of problems) {
    await prisma.problem.upsert({
      where: { id: probData.id },
      update: {},
      create: probData,
    });
  }

  console.log(`✅ ${problems.length} problems created`);

  // ═══════════════════════════════════════════════════════════════
  // 10. INITIALIZE REASONING MOVE PROGRESS
  // ═══════════════════════════════════════════════════════════════
  console.log('Initializing reasoning move tracking...');

  const basicReasoningMoves = [
    'DECOMPOSE',
    'IDENTIFY',
    'COMPARE',
    'QUESTION',
    'VERIFY',
    'JUSTIFY',
  ];

  for (const { student } of students) {
    for (const move of basicReasoningMoves) {
      await prisma.reasoningMoveProgress.upsert({
        where: {
          studentId_move: {
            studentId: student.id,
            move: move as any,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          move: move as any,
          introducedAt: new Date(),
          proficiencyLevel: 1,
        },
      });
    }
  }

  console.log(`✅ Reasoning moves initialized for all students`);

  // ═══════════════════════════════════════════════════════════════
  // SEED COMPLETE
  // ═══════════════════════════════════════════════════════════════
  console.log('\nDatabase seed completed successfully!');
  console.log('\nSummary:');
  console.log(`   • 1 Tenant: ${tenant.name}`);
  console.log(`   • 1 School: ${school.name}`);
  console.log(`   • 1 Educator: ${educatorUser.firstName} ${educatorUser.lastName}`);
  console.log(`   • ${students.length} Students`);
  console.log(`   • 1 Class: ${mathClass.name}`);
  console.log(`   • ${createdStandards.length} Academic Standards`);
  console.log(`   • ${createdTopics.length} Topics`);
  console.log(`   • ${objectives.length} Learning Objectives`);
  console.log(`   • ${problems.length} Practice Problems`);
  console.log(`   • ${basicReasoningMoves.length} Reasoning Moves per student`);
  console.log('\n✨ Students are ready to begin learning!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
