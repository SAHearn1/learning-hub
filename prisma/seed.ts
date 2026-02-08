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
      relationshipType: 'PARENT',
      communicationPreferences: {
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
    {
      code: 'MGSE7.RP.2',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Ratios and Proportional Relationships',
      cluster: 'Analyze proportional relationships and use them to solve real-world and mathematical problems',
      description: 'Recognize and represent proportional relationships between quantities',
      fullText: 'Recognize and represent proportional relationships between quantities, including deciding whether two quantities are in a proportional relationship and identifying constants of proportionality.',
    },
    {
      code: 'MGSE7.EE.3',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Expressions and Equations',
      cluster: 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations',
      description: 'Solve multi-step real-life and mathematical problems with positive and negative rational numbers',
      fullText: 'Solve multi-step real-life and mathematical problems posed with positive and negative rational numbers in any form, applying properties of operations and assessing reasonableness of answers using mental computation and estimation strategies.',
    },
    {
      code: 'MGSE7.G.6',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Geometry',
      cluster: 'Solve real-life and mathematical problems involving angle measure, area, surface area, and volume',
      description: 'Solve real-world and mathematical problems involving area and volume of two- and three-dimensional objects',
      fullText: 'Solve real-world and mathematical problems involving area, volume and surface area of two- and three-dimensional objects composed of triangles, quadrilaterals, polygons, cubes, and right prisms.',
    },
    {
      code: 'MGSE7.SP.7',
      framework: 'GEORGIA' as const,
      subject: 'MATH' as const,
      gradeLevel: [7],
      domain: 'Statistics and Probability',
      cluster: 'Investigate chance processes and develop, use, and evaluate probability models',
      description: 'Develop a probability model and use it to find probabilities of events',
      fullText: 'Develop a probability model and use it to find probabilities of events, comparing probabilities from a model to observed frequencies and explaining possible sources of discrepancy.',
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
      standardCodes: ['MGSE7.NS.1', 'MGSE7.NS.2'],
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
      standardCodes: ['MGSE7.EE.1', 'MGSE7.EE.3'],
    },
    {
      id: 'topic-proportional-relationships-001',
      name: 'Proportional Relationships and Unit Rates',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Interpreting tables, graphs, and equations to determine and use proportional relationships',
      conceptualUnderstanding: 'Proportional relationships have a constant multiplicative relationship. The constant of proportionality can be interpreted as a unit rate and used for prediction and comparison.',
      commonMisconceptions: [
        'Assuming any linear relationship is proportional',
        'Confusing additive patterns with multiplicative patterns',
        'Treating y-intercept as the unit rate when the graph does not pass through the origin',
      ],
      realWorldConnections: [
        'Comparing grocery prices by cost per unit',
        'Scaling recipes for different group sizes',
        'Interpreting speed as miles per hour',
      ],
      estimatedDuration: 50,
      standardCodes: ['MGSE7.RP.2'],
    },
    {
      id: 'topic-equations-inequalities-001',
      name: 'Solving Equations and Inequalities',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Representing constraints with equations and inequalities and solving in context',
      conceptualUnderstanding: 'Equations and inequalities model relationships between quantities. Solving means finding values that make statements true and interpreting those solutions in context.',
      commonMisconceptions: [
        'Performing operations on only one side of an equation',
        'Not reversing inequality signs when multiplying/dividing by negatives',
        'Treating a solution to an inequality as a single value instead of a set of values',
      ],
      realWorldConnections: [
        'Budgeting with spending limits',
        'Comparing mobile plan costs',
        'Tracking points needed to meet a goal',
      ],
      estimatedDuration: 55,
      standardCodes: ['MGSE7.EE.4'],
    },
    {
      id: 'topic-area-volume-001',
      name: 'Area and Volume of Composite Figures',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Decomposing complex figures into simpler shapes to determine area and volume',
      conceptualUnderstanding: 'Complex geometric figures can be decomposed into familiar shapes. Area and volume formulas represent additive and multiplicative structure that supports efficient problem solving.',
      commonMisconceptions: [
        'Mixing up area and perimeter units',
        'Using incorrect dimensions for rectangular prisms',
        'Forgetting to account for all parts of a composite figure',
      ],
      realWorldConnections: [
        'Planning garden bed coverage',
        'Determining paint needed for classroom projects',
        'Estimating storage capacity in containers',
      ],
      estimatedDuration: 60,
      standardCodes: ['MGSE7.G.6'],
    },
    {
      id: 'topic-probability-models-001',
      name: 'Probability Models and Experimental Data',
      subject: 'MATH' as const,
      gradeLevel: [7],
      description: 'Building and evaluating probability models using theoretical and experimental outcomes',
      conceptualUnderstanding: 'Probability quantifies likelihood. Models should align with observed data, and differences between predictions and outcomes can be explained through variability and trial count.',
      commonMisconceptions: [
        'Assuming short experiments always match theoretical probability',
        'Adding probabilities of overlapping events incorrectly',
        'Confusing independent and dependent events',
      ],
      realWorldConnections: [
        'Forecasting weather events from historical data',
        'Evaluating game fairness',
        'Analyzing outcomes in school surveys',
      ],
      estimatedDuration: 45,
      standardCodes: ['MGSE7.SP.7'],
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
            .filter((s) => topicData.standardCodes.includes(s.code))
            .map((s) => ({ id: s.id })),
        },
      },
    });
    createdTopics.push(topic);
    console.log(`✅ Topic created: ${topic.name}`);
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
    {
      id: 'obj-proportional-constant-001',
      topicId: 'topic-proportional-relationships-001',
      description: 'Students will determine the constant of proportionality from tables, graphs, and verbal descriptions',
      bloomsLevel: 'ANALYZE' as const,
    },
    {
      id: 'obj-proportional-represent-001',
      topicId: 'topic-proportional-relationships-001',
      description: 'Students will represent proportional relationships with equations in the form y = kx',
      bloomsLevel: 'APPLY' as const,
    },
    {
      id: 'obj-equation-context-001',
      topicId: 'topic-equations-inequalities-001',
      description: 'Students will write and solve two-step equations from contextual scenarios',
      bloomsLevel: 'APPLY' as const,
    },
    {
      id: 'obj-inequality-interpret-001',
      topicId: 'topic-equations-inequalities-001',
      description: 'Students will interpret and graph solution sets for one-step inequalities',
      bloomsLevel: 'UNDERSTAND' as const,
    },
    {
      id: 'obj-area-composite-001',
      topicId: 'topic-area-volume-001',
      description: 'Students will decompose composite figures and justify area calculations',
      bloomsLevel: 'ANALYZE' as const,
    },
    {
      id: 'obj-volume-prism-001',
      topicId: 'topic-area-volume-001',
      description: 'Students will calculate and compare volumes of right prisms in context',
      bloomsLevel: 'APPLY' as const,
    },
    {
      id: 'obj-probability-model-001',
      topicId: 'topic-probability-models-001',
      description: 'Students will construct probability models and compare predictions to experimental frequencies',
      bloomsLevel: 'EVALUATE' as const,
    },
    {
      id: 'obj-probability-justify-001',
      topicId: 'topic-probability-models-001',
      description: 'Students will justify whether an observed discrepancy is reasonable based on sample size',
      bloomsLevel: 'EVALUATE' as const,
    },
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
    {
      id: 'problem-proportion-table-001',
      topicId: 'topic-proportional-relationships-001',
      stem: 'A cafeteria recipe uses 3 cups of rice for every 8 students. How many cups are needed for 40 students?',
      scaffold: {
        hints: [
          'Find the constant rate in cups per student first',
          'Use multiplication to scale from 8 students to 40 students',
          'Check if your answer keeps the same ratio',
        ],
        steps: [
          'Compute unit rate: 3 ÷ 8 = 0.375 cups per student',
          'Multiply by 40 students: 0.375 × 40 = 15',
          'Verify ratio: 15/40 simplifies to 3/8',
        ],
      },
      solutionPaths: [
        {
          method: 'scale-factor',
          steps: ['8 to 40 is ×5', 'Multiply rice by 5: 3 × 5 = 15'],
        },
        {
          method: 'unit-rate',
          steps: ['Find 3/8 cup per student', 'Multiply by 40 students to get 15 cups'],
        },
      ],
      commonErrors: {
        'additive-scaling': {
          incorrectAnswer: '35',
          explanation: 'Added 32 to 3 instead of multiplying both quantities by the same factor',
          remediation: 'Proportional relationships require multiplicative scaling',
        },
        'inverse-ratio': {
          incorrectAnswer: '10.67',
          explanation: 'Used 8/3 instead of 3/8 for cups per student',
          remediation: 'Keep units consistent: cups divided by students',
        },
      },
      rubric: {
        correctAnswer: '15',
        partialCredit: [
          { condition: 'correct-scale-factor-wrong-arithmetic', points: 0.7 },
          { condition: 'correct-unit-rate-no-final-computation', points: 0.6 },
        ],
      },
      gardenContext: 'The school garden club keeps the same seed-to-plot ratio each week and must scale material amounts for larger groups.',
      difficulty: 2,
      bloomsLevel: 'APPLY' as const,
      type: 'PRACTICE' as const,
      validated: true,
    },
    {
      id: 'problem-equation-budget-001',
      topicId: 'topic-equations-inequalities-001',
      stem: 'A class has $54 for supplies after buying notebooks. If each marker pack costs $6, how many packs can be purchased?',
      scaffold: {
        hints: [
          'Represent unknown packs with a variable, such as p',
          'Write an equation based on equal total cost',
          'Use inverse operations to isolate the variable',
        ],
        steps: [
          'Set up equation: 6p = 54',
          'Divide both sides by 6',
          'p = 9 marker packs',
          'Check: 6 × 9 = 54',
        ],
      },
      solutionPaths: [
        {
          method: 'algebraic-solve',
          steps: ['6p = 54', 'p = 54 ÷ 6', 'p = 9'],
        },
        {
          method: 'repeated-addition',
          steps: ['Count groups of 6 in 54', 'There are 9 equal groups'],
        },
      ],
      commonErrors: {
        'operation-error': {
          incorrectAnswer: '48',
          explanation: 'Subtracted 6 from 54 rather than dividing',
          remediation: 'When a variable is multiplied by a number, divide to undo multiplication',
        },
        'single-step-stopped': {
          incorrectAnswer: '6p',
          explanation: 'Equation was written but not solved',
          remediation: 'After modeling, isolate the variable and interpret the result in context',
        },
      },
      rubric: {
        correctAnswer: '9',
        partialCredit: [
          { condition: 'correct-equation-only', points: 0.5 },
          { condition: 'solved-but-no-context-label', points: 0.8 },
        ],
      },
      gardenContext: 'A greenhouse team tracks fixed budgets and must choose how many supply packs fit within spending constraints.',
      difficulty: 2,
      bloomsLevel: 'APPLY' as const,
      type: 'PRACTICE' as const,
      validated: true,
    },
    {
      id: 'problem-area-composite-001',
      topicId: 'topic-area-volume-001',
      stem: 'A rectangular garden is 12 m by 9 m. A 3 m by 2 m tool shed sits inside it. What is the remaining planting area?',
      scaffold: {
        hints: [
          'Find the area of the full garden first',
          'Find the area taken by the shed',
          'Subtract the shed area from the total',
        ],
        steps: [
          'Garden area = 12 × 9 = 108 square meters',
          'Shed area = 3 × 2 = 6 square meters',
          'Remaining area = 108 - 6 = 102 square meters',
        ],
      },
      solutionPaths: [
        {
          method: 'subtract-areas',
          steps: ['Compute each rectangle area', 'Subtract non-planting section from total'],
        },
      ],
      commonErrors: {
        'perimeter-confusion': {
          incorrectAnswer: '34',
          explanation: 'Computed perimeter rather than area',
          remediation: 'Area uses multiplication of length and width with square units',
        },
        'missing-subtraction': {
          incorrectAnswer: '108',
          explanation: 'Found full area but did not remove shed space',
          remediation: 'Read the context carefully to account for excluded regions',
        },
      },
      rubric: {
        correctAnswer: '102',
        partialCredit: [
          { condition: 'correct-total-area-only', points: 0.5 },
          { condition: 'correct-sub-areas-wrong-subtraction', points: 0.7 },
        ],
      },
      gardenContext: 'Students are designing how much soil and seed is needed after accounting for structures in the school garden.',
      difficulty: 3,
      bloomsLevel: 'ANALYZE' as const,
      type: 'PRACTICE' as const,
      validated: true,
    },
    {
      id: 'problem-probability-spinner-001',
      topicId: 'topic-probability-models-001',
      stem: 'A spinner has 8 equal sections: 3 blue, 3 green, and 2 yellow. What is the probability of landing on blue or yellow?',
      scaffold: {
        hints: [
          'Count favorable outcomes for blue or yellow',
          'Use total outcomes as the denominator',
          'Simplify the fraction if possible',
        ],
        steps: [
          'Favorable sections = 3 (blue) + 2 (yellow) = 5',
          'Total sections = 8',
          'Probability = 5/8',
        ],
      },
      solutionPaths: [
        {
          method: 'counting-model',
          steps: ['List favorable categories', 'Add counts and divide by total equally likely outcomes'],
        },
      ],
      commonErrors: {
        'denominator-error': {
          incorrectAnswer: '5/6',
          explanation: 'Used only non-green sections as total outcomes',
          remediation: 'The denominator includes all possible outcomes, not only favorable categories',
        },
        'double-counting': {
          incorrectAnswer: '10/8',
          explanation: 'Added outcomes incorrectly and exceeded total possible outcomes',
          remediation: 'Check that probability values stay between 0 and 1',
        },
      },
      rubric: {
        correctAnswer: '5/8',
        partialCredit: [
          { condition: 'correct-favorable-count-only', points: 0.4 },
          { condition: 'correct-setup-wrong-simplification', points: 0.8 },
        ],
      },
      gardenContext: 'Garden teams model chances of drawing colored task cards to ensure fair role rotation.',
      difficulty: 2,
      bloomsLevel: 'UNDERSTAND' as const,
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
