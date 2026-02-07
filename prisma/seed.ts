import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ───────────────────────────────────────────────
  // 1. Default Tenant
  // ───────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'rootwork-demo' },
    update: {},
    create: {
      name: 'RootWork Demo District',
      slug: 'rootwork-demo',
      subscriptionTier: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      settings: {},
    },
  });
  console.log(`  Tenant: ${tenant.name}`);

  // ───────────────────────────────────────────────
  // 2. School
  // ───────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'seed-school-001' },
    update: {},
    create: {
      id: 'seed-school-001',
      tenantId: tenant.id,
      name: 'Garden Grove Elementary',
      address: '123 Learning Lane, Atlanta, GA 30301',
      gradeRange: [3, 4, 5, 6, 7, 8],
      settings: {},
    },
  });
  console.log(`  School: ${school.name}`);

  // ───────────────────────────────────────────────
  // 3. Educator user + profile
  // ───────────────────────────────────────────────
  const educatorUser = await prisma.user.upsert({
    where: { clerkUserId: 'seed-educator-clerk' },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      clerkUserId: 'seed-educator-clerk',
      email: 'ms.thompson@gardengrove.edu',
      firstName: 'Maria',
      lastName: 'Thompson',
      role: 'EDUCATOR',
    },
  });
  await prisma.educator.upsert({
    where: { userId: educatorUser.id },
    update: {},
    create: {
      userId: educatorUser.id,
      certifications: ['Georgia Teaching Certificate', 'Special Education Endorsement'],
      specializations: ['Mathematics', 'Exceptional Children'],
    },
  });
  console.log(`  Educator: ${educatorUser.firstName} ${educatorUser.lastName}`);

  // ───────────────────────────────────────────────
  // 4. Student users + profiles
  // ───────────────────────────────────────────────
  const students = [
    {
      clerkId: 'seed-student-001',
      email: 'jaylen@student.gardengrove.edu',
      firstName: 'Jaylen',
      lastName: 'Williams',
      grade: 5,
      prefs: { modalities: ['visual', 'kinesthetic'], pacing: 'moderate', scaffoldingLevel: 'medium' },
      regulation: { baselineLevel: 72, knownTriggers: ['timed_tasks'], preferredStrategies: ['deep_breathing'] },
      accommodations: [
        { type: 'CHUNKED_CONTENT' as const, desc: 'Break content into smaller segments', params: { maxChunkSize: 3 } },
      ],
    },
    {
      clerkId: 'seed-student-002',
      email: 'amara@student.gardengrove.edu',
      firstName: 'Amara',
      lastName: 'Johnson',
      grade: 5,
      prefs: { modalities: ['reading', 'auditory'], pacing: 'fast', scaffoldingLevel: 'low' },
      regulation: { baselineLevel: 85, knownTriggers: [], preferredStrategies: [] },
      accommodations: [],
    },
    {
      clerkId: 'seed-student-003',
      email: 'diego@student.gardengrove.edu',
      firstName: 'Diego',
      lastName: 'Martinez',
      grade: 4,
      prefs: { modalities: ['visual'], pacing: 'slow', scaffoldingLevel: 'high' },
      regulation: { baselineLevel: 55, knownTriggers: ['negative_feedback', 'complex_problems'], preferredStrategies: ['calm_corner', 'movement_break'] },
      accommodations: [
        { type: 'EXTENDED_TIME' as const, desc: 'Allow additional processing time', params: { multiplier: 1.5 } },
        { type: 'REDUCED_STIMULI' as const, desc: 'Minimize visual complexity', params: {} },
        { type: 'FREQUENT_BREAKS' as const, desc: 'Offer breaks every 10 minutes', params: { intervalMinutes: 10 } },
      ],
    },
  ];

  const studentRecords = [];
  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { clerkUserId: s.clerkId },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        clerkUserId: s.clerkId,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        role: 'STUDENT',
        isMinor: true,
        consentStatus: 'GRANTED',
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        gradeLevel: s.grade,
        learningPreferences: s.prefs,
        regulationProfile: s.regulation,
      },
    });
    for (const acc of s.accommodations) {
      await prisma.iepAccommodation.create({
        data: {
          studentId: student.id,
          type: acc.type,
          description: acc.desc,
          parameters: acc.params,
          active: true,
          startDate: new Date('2025-08-01'),
          endDate: new Date('2026-05-31'),
        },
      });
    }
    studentRecords.push(student);
    console.log(`  Student: ${s.firstName} ${s.lastName} (Grade ${s.grade})`);
  }

  // ───────────────────────────────────────────────
  // 5. Parent user + profile
  // ───────────────────────────────────────────────
  const parentUser = await prisma.user.upsert({
    where: { clerkUserId: 'seed-parent-001' },
    update: {},
    create: {
      tenantId: tenant.id,
      clerkUserId: 'seed-parent-001',
      email: 'parent.williams@example.com',
      firstName: 'Sandra',
      lastName: 'Williams',
      role: 'PARENT',
    },
  });
  await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      childrenIds: [studentRecords[0].userId],
      communicationPrefs: { emailNotifications: true, weeklyDigest: true, sessionAlerts: false },
    },
  });
  console.log(`  Parent: ${parentUser.firstName} ${parentUser.lastName}`);

  // ───────────────────────────────────────────────
  // 6. Class + Enrollments
  // ───────────────────────────────────────────────
  const mathClass = await prisma.class.upsert({
    where: { id: 'seed-class-math-5' },
    update: {},
    create: {
      id: 'seed-class-math-5',
      tenantId: tenant.id,
      schoolId: school.id,
      name: '5th Grade Mathematics',
      subject: 'MATH',
      gradeLevel: 5,
      academicYear: '2025-2026',
      educatorId: educatorUser.id,
    },
  });
  for (const student of studentRecords) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: mathClass.id, studentId: student.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        classId: mathClass.id,
        studentId: student.id,
      },
    });
  }
  console.log(`  Class: ${mathClass.name} (${studentRecords.length} students enrolled)`);

  // ───────────────────────────────────────────────
  // 7. Curriculum Standards (Georgia Standards of Excellence — Grade 5 Math)
  // ───────────────────────────────────────────────
  const standards = [
    // Number & Operations in Base Ten
    { code: 'MGSE5.NBT.1', domain: 'Number & Operations in Base Ten', cluster: 'Understand the place value system', desc: 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left' },
    { code: 'MGSE5.NBT.2', domain: 'Number & Operations in Base Ten', cluster: 'Understand the place value system', desc: 'Explain patterns in the number of zeros of the product when multiplying a number by powers of 10' },
    { code: 'MGSE5.NBT.3', domain: 'Number & Operations in Base Ten', cluster: 'Understand the place value system', desc: 'Read, write, and compare decimals to thousandths' },
    { code: 'MGSE5.NBT.5', domain: 'Number & Operations in Base Ten', cluster: 'Perform operations with multi-digit whole numbers and with decimals', desc: 'Fluently multiply multi-digit whole numbers using the standard algorithm' },
    { code: 'MGSE5.NBT.6', domain: 'Number & Operations in Base Ten', cluster: 'Perform operations with multi-digit whole numbers and with decimals', desc: 'Find whole-number quotients of whole numbers with up to four-digit dividends and two-digit divisors' },
    { code: 'MGSE5.NBT.7', domain: 'Number & Operations in Base Ten', cluster: 'Perform operations with multi-digit whole numbers and with decimals', desc: 'Add, subtract, multiply, and divide decimals to hundredths' },
    // Number & Operations — Fractions
    { code: 'MGSE5.NF.1', domain: 'Number & Operations — Fractions', cluster: 'Use equivalent fractions', desc: 'Add and subtract fractions with unlike denominators' },
    { code: 'MGSE5.NF.2', domain: 'Number & Operations — Fractions', cluster: 'Use equivalent fractions', desc: 'Solve word problems involving addition and subtraction of fractions' },
    { code: 'MGSE5.NF.4', domain: 'Number & Operations — Fractions', cluster: 'Apply and extend previous understandings of multiplication and division', desc: 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction' },
    { code: 'MGSE5.NF.6', domain: 'Number & Operations — Fractions', cluster: 'Apply and extend previous understandings of multiplication and division', desc: 'Solve real world problems involving multiplication of fractions and mixed numbers' },
    { code: 'MGSE5.NF.7', domain: 'Number & Operations — Fractions', cluster: 'Apply and extend previous understandings of multiplication and division', desc: 'Apply and extend previous understandings of division to divide unit fractions by whole numbers and whole numbers by unit fractions' },
    // Measurement & Data
    { code: 'MGSE5.MD.1', domain: 'Measurement & Data', cluster: 'Convert like measurement units', desc: 'Convert among different-sized standard measurement units within a given measurement system' },
    { code: 'MGSE5.MD.3', domain: 'Measurement & Data', cluster: 'Geometric measurement: understand concepts of volume', desc: 'Recognize volume as an attribute of solid figures and understand concepts of volume measurement' },
    { code: 'MGSE5.MD.5', domain: 'Measurement & Data', cluster: 'Geometric measurement: understand concepts of volume', desc: 'Relate volume to the operations of multiplication and addition and solve real world and mathematical problems involving volume' },
    // Geometry
    { code: 'MGSE5.G.1', domain: 'Geometry', cluster: 'Graph points on the coordinate plane', desc: 'Use a pair of perpendicular number lines to define a coordinate system; graph points in the first quadrant' },
    { code: 'MGSE5.G.3', domain: 'Geometry', cluster: 'Classify two-dimensional figures', desc: 'Understand that attributes belonging to a category of two-dimensional figures also belong to all subcategories' },

    // Grade 5 Science (NGSS-aligned Georgia)
    { code: 'S5P1', domain: 'Physical Science', cluster: 'Matter', desc: 'Obtain, evaluate, and communicate information to explain the differences between a physical change and a chemical change', framework: 'NGSS' as const, subject: 'SCIENCE' as const },
    { code: 'S5P2', domain: 'Physical Science', cluster: 'Forces & Motion', desc: 'Explain the effects of forces on the motion and stability of an object', framework: 'NGSS' as const, subject: 'SCIENCE' as const },
    { code: 'S5P3', domain: 'Physical Science', cluster: 'Energy', desc: 'Investigate the properties of light, sound, and electricity', framework: 'NGSS' as const, subject: 'SCIENCE' as const },
    { code: 'S5L1', domain: 'Life Science', cluster: 'Ecosystems', desc: 'Obtain, evaluate, and communicate information to group organisms using scientific classification procedures', framework: 'NGSS' as const, subject: 'SCIENCE' as const },
    { code: 'S5E1', domain: 'Earth Science', cluster: 'Earth Systems', desc: 'Obtain, evaluate, and communicate information about the water cycle and its effects on weather and climate', framework: 'NGSS' as const, subject: 'SCIENCE' as const },

    // Grade 5 ELA
    { code: 'ELAGSE5.RL.1', domain: 'Reading Literature', cluster: 'Key Ideas and Details', desc: 'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences', framework: 'GEORGIA' as const, subject: 'LANGUAGE_ARTS' as const },
    { code: 'ELAGSE5.RL.2', domain: 'Reading Literature', cluster: 'Key Ideas and Details', desc: 'Determine a theme of a story, drama, or poem from details in the text, including how characters respond to challenges', framework: 'GEORGIA' as const, subject: 'LANGUAGE_ARTS' as const },
    { code: 'ELAGSE5.RI.1', domain: 'Reading Informational', cluster: 'Key Ideas and Details', desc: 'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences', framework: 'GEORGIA' as const, subject: 'LANGUAGE_ARTS' as const },
    { code: 'ELAGSE5.W.1', domain: 'Writing', cluster: 'Text Types and Purposes', desc: 'Write opinion pieces on topics or texts, supporting a point of view with reasons and information', framework: 'GEORGIA' as const, subject: 'LANGUAGE_ARTS' as const },
    { code: 'ELAGSE5.W.3', domain: 'Writing', cluster: 'Text Types and Purposes', desc: 'Write narratives to develop real or imagined experiences or events using effective technique, descriptive details, and clear event sequences', framework: 'GEORGIA' as const, subject: 'LANGUAGE_ARTS' as const },
  ];

  for (const s of standards) {
    await prisma.standard.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code,
        framework: s.framework ?? 'GEORGIA',
        subject: s.subject ?? 'MATH',
        gradeLevel: [5],
        domain: s.domain,
        cluster: s.cluster,
        description: s.desc,
        fullText: s.desc,
      },
    });
  }
  console.log(`  Standards: ${standards.length} curriculum standards seeded`);

  // ───────────────────────────────────────────────
  // 8. Topics (linked to standards)
  // ───────────────────────────────────────────────
  const topics = [
    {
      name: 'Place Value & Decimals',
      subject: 'MATH' as const,
      description: 'Understanding the base-ten number system and decimal notation through thousandths',
      conceptual: 'The value of a digit depends on its position. Each place is 10 times the place to its right.',
      misconceptions: ['Longer decimals are always larger', 'The decimal point separates two different numbers'],
      connections: ['Measuring plant growth in the school garden to hundredths of a centimeter'],
      duration: 120,
      standardCodes: ['MGSE5.NBT.1', 'MGSE5.NBT.2', 'MGSE5.NBT.3'],
    },
    {
      name: 'Multi-Digit Multiplication & Division',
      subject: 'MATH' as const,
      description: 'Fluency with multi-digit whole number operations and decimal operations',
      conceptual: 'Multiplication and division are inverse operations. Area models connect multiplication to geometry.',
      misconceptions: ['Multiplication always makes bigger', 'You always divide the bigger number by the smaller one'],
      connections: ['Calculating area of garden beds for planting', 'Dividing seeds equally among rows'],
      duration: 150,
      standardCodes: ['MGSE5.NBT.5', 'MGSE5.NBT.6', 'MGSE5.NBT.7'],
    },
    {
      name: 'Fractions: Addition, Subtraction & Multiplication',
      subject: 'MATH' as const,
      description: 'Operations with fractions using equivalent fractions and visual models',
      conceptual: 'Fractions represent parts of a whole. To add fractions we need a common unit (denominator).',
      misconceptions: ['Add numerators and denominators separately', 'A fraction times a whole number is always bigger'],
      connections: ['Measuring ingredients for garden compost recipes', 'Dividing harvest equally among students'],
      duration: 180,
      standardCodes: ['MGSE5.NF.1', 'MGSE5.NF.2', 'MGSE5.NF.4', 'MGSE5.NF.6', 'MGSE5.NF.7'],
    },
    {
      name: 'Volume & Measurement',
      subject: 'MATH' as const,
      description: 'Concepts of volume and converting measurement units',
      conceptual: 'Volume measures the space inside a 3D figure. It connects multiplication to three dimensions.',
      misconceptions: ['Volume and area are the same thing', 'Bigger containers always hold more'],
      connections: ['Calculating soil volume for raised garden beds', 'Converting gallons to liters for watering'],
      duration: 90,
      standardCodes: ['MGSE5.MD.1', 'MGSE5.MD.3', 'MGSE5.MD.5'],
    },
  ];

  for (const t of topics) {
    const standardRecords = await prisma.standard.findMany({
      where: { code: { in: t.standardCodes } },
    });
    await prisma.topic.upsert({
      where: { id: `seed-topic-${t.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
      update: {},
      create: {
        id: `seed-topic-${t.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: t.name,
        subject: t.subject,
        gradeLevel: [5],
        description: t.description,
        conceptualUnderstanding: t.conceptual,
        commonMisconceptions: t.misconceptions,
        realWorldConnections: t.connections,
        estimatedDuration: t.duration,
        standards: { connect: standardRecords.map(s => ({ id: s.id })) },
      },
    });
  }
  console.log(`  Topics: ${topics.length} learning topics seeded`);

  // ───────────────────────────────────────────────
  // 9. Sample session with messages (Jaylen — fractions)
  // ───────────────────────────────────────────────
  const jaylen = studentRecords[0];
  const fractionStandard = await prisma.standard.findUnique({ where: { code: 'MGSE5.NF.1' } });

  const session = await prisma.session.create({
    data: {
      tenantId: tenant.id,
      studentId: jaylen.id,
      subject: 'MATH',
      currentPhase: 'REFLECT',
      engagementMode: 'FORWARD',
      regulationState: { level: 75, signals: [], interventionCount: 0 },
      metadata: { topic: 'Fractions: Addition with Unlike Denominators' },
      startedAt: new Date('2026-02-06T09:00:00Z'),
      endedAt: new Date('2026-02-06T09:35:00Z'),
    },
  });

  const messages = [
    { role: 'ASSISTANT' as const, content: 'Good morning! How are you feeling today? Ready to grow some thinking in our math garden?', ts: '2026-02-06T09:00:30Z' },
    { role: 'USER' as const, content: 'Im ok. kinda tired but ready I guess', ts: '2026-02-06T09:01:15Z' },
    { role: 'ASSISTANT' as const, content: "Thanks for being honest about that. It's okay to feel tired. Let's ease into things gently. Today we're going to explore adding fractions with different denominators. Before we start, can you tell me what you already know about fractions?", ts: '2026-02-06T09:01:45Z' },
    { role: 'USER' as const, content: 'fractions are like parts of something. like 1/2 is half of a pizza', ts: '2026-02-06T09:02:30Z' },
    { role: 'ASSISTANT' as const, content: "Great foundation! You're right that fractions represent parts of a whole. Now here's a question to start our thinking: If you have 1/3 of a pizza and your friend gives you 1/4 of a pizza, how much pizza do you have altogether? Walk me through your first instinct.", ts: '2026-02-06T09:03:00Z' },
    { role: 'USER' as const, content: 'umm 2/7? you add the tops and bottoms?', ts: '2026-02-06T09:04:00Z' },
    { role: 'ASSISTANT' as const, content: "That's really interesting thinking, and a lot of people try that approach first. Let me ask you to VERIFY that idea. If 1/3 + 1/4 = 2/7, that would mean 2/7 is bigger than 1/3 (since we added something to it). But is 2/7 actually bigger than 1/3? Can you think of a way to check?", ts: '2026-02-06T09:04:30Z' },
    { role: 'USER' as const, content: 'oh wait. 1/3 is like 0.33 and 2/7 is like... 0.28? so 2/7 is smaller? that cant be right if we added something', ts: '2026-02-06T09:05:45Z' },
    { role: 'ASSISTANT' as const, content: "Brilliant VERIFY move! You caught the error by checking with decimals. Your brain just grew a new synapse! So we know adding numerators and denominators separately doesn't work. Let's DECOMPOSE this problem. Think about why we can add 2/5 + 1/5 easily (that's 3/5) but can't just add 1/3 + 1/4 the same way. What's different about these two situations?", ts: '2026-02-06T09:06:15Z' },
    { role: 'USER' as const, content: 'oh! because 2/5 and 1/5 have the same bottom number. the pieces are the same size. with 1/3 and 1/4 the pieces are different sizes', ts: '2026-02-06T09:07:30Z' },
    { role: 'ASSISTANT' as const, content: "That's exactly it! You just CONNECTED a key idea: we can only add fractions directly when they have the same denominator because the pieces are the same size. So what do you think we need to do before we can add 1/3 + 1/4?", ts: '2026-02-06T09:08:00Z' },
    { role: 'USER' as const, content: 'make the pieces the same size? like find a number that both 3 and 4 go into?', ts: '2026-02-06T09:08:45Z' },
    { role: 'ASSISTANT' as const, content: "You're building exactly the right reasoning! Yes, we need a common denominator. What number do both 3 and 4 divide into evenly? Take your time.", ts: '2026-02-06T09:09:00Z' },
    { role: 'USER' as const, content: '12! because 3 times 4 is 12', ts: '2026-02-06T09:09:30Z' },
    { role: 'ASSISTANT' as const, content: "12 works perfectly! Now can you convert 1/3 and 1/4 so they both have 12 as the denominator, then add them?", ts: '2026-02-06T09:09:45Z' },
    { role: 'USER' as const, content: '1/3 = 4/12 and 1/4 = 3/12. so 4/12 + 3/12 = 7/12!', ts: '2026-02-06T09:10:30Z' },
    { role: 'ASSISTANT' as const, content: "7/12! Let's VERIFY: is 7/12 bigger than 1/3 (which is 4/12)? Yes! Is it bigger than 1/4 (which is 3/12)? Yes! That makes sense because we added two positive amounts. Beautiful reasoning, Jaylen. You DECOMPOSED the problem, VERIFIED your thinking, and CONNECTED it to what you already knew. That's exactly how mathematicians think.", ts: '2026-02-06T09:11:00Z' },
  ];

  for (const m of messages) {
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.ts),
      },
    });
  }
  console.log(`  Session: ${messages.length} messages in sample tutoring session`);

  // ───────────────────────────────────────────────
  // 10. Assessments + Progress for Jaylen
  // ───────────────────────────────────────────────
  if (fractionStandard) {
    await prisma.assessment.create({
      data: {
        sessionId: session.id,
        standardId: fractionStandard.id,
        type: 'FORMATIVE',
        bloomsLevel: 'UNDERSTAND',
        difficulty: 4,
        question: 'Add 1/3 + 1/4. Show your reasoning.',
        studentResponse: '1/3 = 4/12, 1/4 = 3/12, 4/12 + 3/12 = 7/12',
        isCorrect: true,
        score: 85,
        feedback: 'Demonstrated understanding of common denominators through self-correction.',
      },
    });

    await prisma.progress.upsert({
      where: { studentId_standardId: { studentId: jaylen.id, standardId: fractionStandard.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        studentId: jaylen.id,
        standardId: fractionStandard.id,
        masteryLevel: 65,
        assessmentCount: 3,
        lastAssessedAt: new Date('2026-02-06T09:11:00Z'),
      },
    });
  }

  // Seed some additional progress for Jaylen across standards
  const additionalProgress = [
    { code: 'MGSE5.NBT.1', mastery: 88, count: 5 },
    { code: 'MGSE5.NBT.3', mastery: 72, count: 4 },
    { code: 'MGSE5.NBT.5', mastery: 90, count: 6 },
    { code: 'MGSE5.NF.2', mastery: 55, count: 2 },
    { code: 'MGSE5.NF.4', mastery: 40, count: 2 },
    { code: 'MGSE5.MD.3', mastery: 78, count: 3 },
  ];

  for (const p of additionalProgress) {
    const std = await prisma.standard.findUnique({ where: { code: p.code } });
    if (std) {
      await prisma.progress.upsert({
        where: { studentId_standardId: { studentId: jaylen.id, standardId: std.id } },
        update: {},
        create: {
          tenantId: tenant.id,
          studentId: jaylen.id,
          standardId: std.id,
          masteryLevel: p.mastery,
          assessmentCount: p.count,
          lastAssessedAt: new Date('2026-02-06'),
        },
      });
    }
  }
  console.log('  Progress: Mastery data seeded for 7 standards');

  // ───────────────────────────────────────────────
  // 11. Reasoning Move Progress for Jaylen
  // ───────────────────────────────────────────────
  const reasoningMoves: { move: 'DECOMPOSE' | 'VERIFY' | 'CONNECT' | 'COMPARE' | 'QUESTION' | 'GENERALIZE' | 'TRANSFORM'; prompted: number; spontaneous: number; level: number }[] = [
    { move: 'DECOMPOSE', prompted: 8, spontaneous: 5, level: 3 },
    { move: 'VERIFY', prompted: 6, spontaneous: 7, level: 4 },
    { move: 'CONNECT', prompted: 5, spontaneous: 3, level: 3 },
    { move: 'COMPARE', prompted: 4, spontaneous: 2, level: 2 },
    { move: 'QUESTION', prompted: 3, spontaneous: 1, level: 2 },
    { move: 'GENERALIZE', prompted: 2, spontaneous: 0, level: 1 },
    { move: 'TRANSFORM', prompted: 1, spontaneous: 0, level: 1 },
  ];

  for (const rm of reasoningMoves) {
    await prisma.reasoningMoveProgress.upsert({
      where: { studentId_move: { studentId: jaylen.id, move: rm.move } },
      update: {},
      create: {
        studentId: jaylen.id,
        move: rm.move,
        introducedAt: new Date('2026-01-15'),
        usageCount: rm.prompted + rm.spontaneous,
        promptedUsage: rm.prompted,
        spontaneousUsage: rm.spontaneous,
        proficiencyLevel: rm.level,
      },
    });
  }
  console.log('  Reasoning Moves: 7 thinking strategies tracked');

  // ───────────────────────────────────────────────
  // 12. Platform Admin
  // ───────────────────────────────────────────────
  await prisma.user.upsert({
    where: { clerkUserId: 'seed-admin-001' },
    update: {},
    create: {
      tenantId: tenant.id,
      clerkUserId: 'seed-admin-001',
      email: 'admin@rootwork.ai',
      firstName: 'System',
      lastName: 'Admin',
      role: 'PLATFORM_ADMIN',
    },
  });
  console.log('  Admin: Platform admin created');

  console.log('\nSeed complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
