import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { config, endpoints, testData } from './config.js';

// Export k6 configuration
export const options = {
  // Use only the steady_state scenario by default
  scenarios: {
    steady_state: config.scenarios.steady_state,
  },
  thresholds: config.thresholds,
};

// Custom metrics
const sessionDuration = new Trend('session_duration');
const chatResponseTime = new Trend('chat_response_time');
const assessmentCompletionRate = new Rate('assessment_completion_rate');
const concurrentStudents = new Gauge('concurrent_students');
const errorCounter = new Counter('errors');

// Base URL from environment or default to localhost
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Mock authentication token (in real tests, this would come from setup)
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
});

export function setup() {
  // Perform any necessary setup (e.g., create test users, sessions)
  console.log('Setting up load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Target: ${config.scenarios.steady_state.vus} concurrent students`);

  // Health check before starting
  const healthCheck = http.get(`${BASE_URL}${endpoints.health}`);
  check(healthCheck, {
    'health check passed': (r) => r.status === 200,
  });

  return { startTime: Date.now() };
}

export default function (data) {
  const sessionStart = Date.now();

  // Track concurrent students
  concurrentStudents.add(1);

  // Simulate a complete student learning journey
  group('Student Learning Journey', function () {

    // 1. Start learning session
    group('Start Session', function () {
      const grade = testData.grades[Math.floor(Math.random() * testData.grades.length)];
      const subject = testData.subjects[Math.floor(Math.random() * testData.subjects.length)];

      const sessionPayload = JSON.stringify({
        grade,
        subject,
        studentId: `student-${__VU}`, // Virtual user ID as student ID
      });

      const sessionResponse = http.post(
        `${BASE_URL}${endpoints.sessions}`,
        sessionPayload,
        { headers: getAuthHeaders(), tags: { name: 'start_session' } }
      );

      check(sessionResponse, {
        'session created': (r) => r.status === 200 || r.status === 201,
        'session has ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.sessionId !== undefined;
          } catch {
            return false;
          }
        },
      }) || errorCounter.add(1);

      sleep(1); // Brief pause between actions
    });

    // 2. Diagnostic assessment (entry point)
    group('Diagnostic Assessment', function () {
      const diagnosticPayload = JSON.stringify({
        studentId: `student-${__VU}`,
        assessmentType: 'DIAGNOSTIC',
      });

      const assessmentResponse = http.post(
        `${BASE_URL}${endpoints.assessments.diagnostic}`,
        diagnosticPayload,
        { headers: getAuthHeaders(), tags: { name: 'assessment' } }
      );

      const success = check(assessmentResponse, {
        'diagnostic assessment created': (r) => r.status === 200 || r.status === 201,
        'assessment has questions': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.questions && body.questions.length > 0;
          } catch {
            return false;
          }
        },
      });

      assessmentCompletionRate.add(success);
      if (!success) errorCounter.add(1);

      sleep(2); // Student reads questions
    });

    // 3. Chat interactions (3-5 messages)
    group('Chat Tutoring', function () {
      const messageCount = 3 + Math.floor(Math.random() * 3); // 3-5 messages

      for (let i = 0; i < messageCount; i++) {
        const chatStart = Date.now();
        const message = testData.chatMessages[
          Math.floor(Math.random() * testData.chatMessages.length)
        ];

        const chatPayload = JSON.stringify({
          message,
          studentId: `student-${__VU}`,
          sessionId: `session-${__VU}`,
        });

        const chatResponse = http.post(
          `${BASE_URL}${endpoints.chat}`,
          chatPayload,
          {
            headers: getAuthHeaders(),
            tags: { name: 'chat' },
            timeout: '30s', // AI responses can take longer
          }
        );

        check(chatResponse, {
          'chat response received': (r) => r.status === 200,
          'chat has content': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.response && body.response.length > 0;
            } catch {
              return false;
            }
          },
        }) || errorCounter.add(1);

        // Track chat response time
        chatResponseTime.add(Date.now() - chatStart);

        sleep(3 + Math.random() * 4); // Student thinks/reads (3-7 seconds)
      }
    });

    // 4. Formative assessment
    group('Formative Assessment', function () {
      const formativePayload = JSON.stringify({
        studentId: `student-${__VU}`,
        assessmentType: 'FORMATIVE',
        topicId: `topic-${Math.floor(Math.random() * 10)}`,
      });

      const assessmentResponse = http.post(
        `${BASE_URL}${endpoints.assessments.formative}`,
        formativePayload,
        { headers: getAuthHeaders(), tags: { name: 'assessment' } }
      );

      const success = check(assessmentResponse, {
        'formative assessment created': (r) => r.status === 200 || r.status === 201,
      });

      assessmentCompletionRate.add(success);
      if (!success) errorCounter.add(1);

      sleep(2);
    });

    // 5. Check progress
    group('Check Progress', function () {
      const progressResponse = http.get(
        `${BASE_URL}${endpoints.progress}?studentId=student-${__VU}`,
        { headers: getAuthHeaders(), tags: { name: 'progress' } }
      );

      check(progressResponse, {
        'progress retrieved': (r) => r.status === 200,
      }) || errorCounter.add(1);
    });
  });

  // Track total session duration
  const sessionEnd = Date.now();
  sessionDuration.add(sessionEnd - sessionStart);

  // Random wait before next iteration (simulate realistic student behavior)
  sleep(5 + Math.random() * 10); // 5-15 seconds between sessions
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

export function handleSummary(data) {
  return {
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Helper function for text summary (built-in k6 function)
function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;

  let summary = '\n';
  summary += `${indent}█ Load Test Summary\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Extract key metrics
  const metrics = data.metrics;

  if (metrics.http_req_duration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Error Rate: ${failRate}%\n\n`;
  }

  if (metrics.http_reqs) {
    summary += `${indent}Request Rate: ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n\n`;
  }

  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return summary;
}
