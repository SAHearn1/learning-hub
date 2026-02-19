/**
 * Load Testing Configuration
 * Target: 100 concurrent students
 */

export const config = {
  // Performance thresholds for MVP launch
  thresholds: {
    // HTTP request duration
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_duration{name:chat}': ['p(95)<2000', 'p(99)<5000'], // AI chat has higher latency
    'http_req_duration{name:assessment}': ['p(95)<1500', 'p(99)<3000'],

    // Error rates
    'http_req_failed': ['rate<0.01'], // Less than 1% failures

    // Request rate
    'http_reqs': ['rate>50'], // Minimum 50 requests/second

    // Custom metrics
    'session_duration': ['p(95)<300000'], // 95% of sessions under 5 minutes
    'concurrent_students': ['value<=100'], // Never exceed 100 concurrent
  },

  // Load test scenarios
  scenarios: {
    // Scenario 1: Steady state - 100 concurrent students
    steady_state: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      gracefulStop: '30s',
      tags: { scenario: 'steady_state' },
    },

    // Scenario 2: Ramp up - Gradual increase to 100
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },   // Ramp to 25 users
        { duration: '2m', target: 50 },   // Ramp to 50 users
        { duration: '2m', target: 75 },   // Ramp to 75 users
        { duration: '2m', target: 100 },  // Ramp to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'ramp_up' },
    },

    // Scenario 3: Spike test - Sudden burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },   // Baseline
        { duration: '10s', target: 150 },  // Spike to 150% capacity
        { duration: '1m', target: 150 },   // Sustain spike
        { duration: '30s', target: 10 },   // Return to baseline
      ],
      gracefulStop: '30s',
      tags: { scenario: 'spike' },
    },

    // Scenario 4: Soak test - Extended duration at capacity
    soak: {
      executor: 'constant-vus',
      vus: 80, // 80% of max capacity
      duration: '30m',
      gracefulStop: '1m',
      tags: { scenario: 'soak' },
    },
  },

  // Common test parameters
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // Output results
  summaryTimeUnit: 'ms',

  // Disable k6 cloud upload for now
  noUsageReport: true,
};

// API endpoints to test
export const endpoints = {
  health: '/api/health',
  chat: '/api/chat',
  assessments: {
    diagnostic: '/api/assessments/diagnostic',
    formative: '/api/assessments/formative',
    summative: '/api/assessments/summative',
  },
  sessions: '/api/sessions',
  progress: '/api/progress',
};

// Test data generators
export const testData = {
  grades: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  subjects: ['MATH', 'ELA', 'SCIENCE', 'SOCIAL_STUDIES'],

  // Sample chat messages for load testing
  chatMessages: [
    "Can you help me understand fractions?",
    "What is 25 × 4?",
    "How do I solve for x in 2x + 5 = 15?",
    "Can you explain photosynthesis?",
    "What's the difference between mitosis and meiosis?",
    "How do I write a good essay introduction?",
    "What are the main causes of the Civil War?",
    "Can you help me with long division?",
  ],
};

