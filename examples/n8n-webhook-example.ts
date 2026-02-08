/**
 * n8n Webhook Client - Usage Examples
 * 
 * This file demonstrates various ways to use the n8n webhook client
 * in different scenarios within the Learning Hub application.
 */

import { sendToN8nWebhook, sendBatchToN8nWebhook, testN8nWebhookConnection, N8nWebhookError } from '@/lib/n8n-client';
import type {
  AssessmentCompletedEvent,
  UserActivityEvent,
  ContentUpdateEvent,
  CurriculumIngestEvent,
  SystemNotificationEvent,
  SubscriptionEvent,
  ErrorReportEvent,
} from '@/types/n8n';

/**
 * Example 1: Simple Event Notification
 * 
 * Send a basic event to n8n for logging or triggering simple workflows
 */
export async function example1_simpleNotification() {
  try {
    const result = await sendToN8nWebhook({
      eventType: 'user.login',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      metadata: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
    });

    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Example 2: Assessment Completion Event
 * 
 * Send detailed assessment results when a student completes an assessment
 */
export async function example2_assessmentCompleted(
  userId: string,
  assessmentId: string,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  timeTaken: number
) {
  const event: AssessmentCompletedEvent = {
    eventType: 'assessment.completed',
    userId,
    assessmentId,
    score,
    timestamp: new Date().toISOString(),
    results: {
      totalQuestions,
      correctAnswers,
      timeTakenSeconds: timeTaken,
    },
  };

  try {
    await sendToN8nWebhook(event);
    console.log('Assessment completion sent to n8n');
  } catch (error) {
    console.error('Failed to send assessment completion:', error);
  }
}

/**
 * Example 3: Curriculum Ingestion
 * 
 * Notify n8n about curriculum content ingestion for processing
 */
export async function example3_curriculumIngest(files: Array<{ path: string; content: string }>) {
  const event: CurriculumIngestEvent = {
    eventType: 'curriculum.ingest',
    source: 'MANUAL',
    timestamp: new Date().toISOString(),
    files: files.map(file => ({
      path: file.path,
      content: file.content,
      metadata: {
        size: file.content.length,
        processedAt: new Date().toISOString(),
      },
    })),
  };

  try {
    const result = await sendToN8nWebhook(event);
    console.log(`Ingestion notification sent for ${files.length} files`);
    return result;
  } catch (error) {
    console.error('Failed to send ingestion notification:', error);
    throw error;
  }
}

/**
 * Example 4: User Activity Tracking
 * 
 * Track user activities for analytics and engagement monitoring
 */
export async function example4_trackUserActivity(
  userId: string,
  activityType: 'login' | 'assessment_completed' | 'progress_updated' | 'subscription_changed',
  activityData: Record<string, any>
) {
  const event: UserActivityEvent = {
    eventType: 'user.activity',
    userId,
    activityType,
    timestamp: new Date().toISOString(),
    data: activityData,
  };

  await sendToN8nWebhook(event);
}

/**
 * Example 5: Content Update Notification
 * 
 * Notify when curriculum content is created, updated, or deleted
 */
export async function example5_contentUpdate(
  contentType: 'standard' | 'topic' | 'course' | 'module',
  contentId: string,
  changeType: 'created' | 'updated' | 'deleted',
  changes?: { before?: any; after?: any }
) {
  const event: ContentUpdateEvent = {
    eventType: 'content.updated',
    contentType,
    contentId,
    changeType,
    timestamp: new Date().toISOString(),
    changes,
  };

  await sendToN8nWebhook(event);
}

/**
 * Example 6: Batch Event Processing
 * 
 * Send multiple events efficiently with error handling
 */
export async function example6_batchEvents() {
  const events = [
    {
      eventType: 'user.login',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
    },
    {
      eventType: 'user.login',
      userId: 'user-2',
      timestamp: new Date().toISOString(),
    },
    {
      eventType: 'user.login',
      userId: 'user-3',
      timestamp: new Date().toISOString(),
    },
  ];

  const results = await sendBatchToN8nWebhook(events, {}, {
    continueOnError: true,
    delayBetweenRequests: 100, // 100ms delay between requests
  });

  // Process results
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Batch processing complete: ${successful} successful, ${failed} failed`);

  // Log failed events
  results.forEach((result, index) => {
    if (!result.success) {
      console.error(`Event ${index} failed:`, result.error);
    }
  });

  return results;
}

/**
 * Example 7: Error Handling with Custom Error Types
 * 
 * Demonstrates proper error handling with N8nWebhookError
 */
export async function example7_errorHandling() {
  try {
    await sendToN8nWebhook({
      eventType: 'critical.event',
      timestamp: new Date().toISOString(),
      data: { /* critical data */ },
    });
  } catch (error) {
    if (error instanceof N8nWebhookError) {
      // Handle n8n-specific errors
      console.error('n8n webhook error:', {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      // Take action based on error type
      switch (error.status) {
        case 401:
          console.error('Authentication failed - check webhook secret');
          // Maybe trigger an alert to admins
          break;
        case 408:
          console.error('Request timed out - n8n may be slow or down');
          // Maybe retry with longer timeout
          break;
        case 500:
          console.error('n8n server error - check n8n logs');
          break;
        default:
          console.error('Unknown webhook error');
      }
    } else {
      // Handle other errors
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 8: System Notification
 * 
 * Send system-level notifications for monitoring and alerts
 */
export async function example8_systemNotification(
  level: 'info' | 'warning' | 'error' | 'critical',
  title: string,
  message: string,
  service?: string
) {
  const event: SystemNotificationEvent = {
    eventType: 'system.notification',
    level,
    title,
    message,
    service,
    timestamp: new Date().toISOString(),
  };

  await sendToN8nWebhook(event);
}

/**
 * Example 9: Subscription Change
 * 
 * Track subscription tier changes for billing and analytics
 */
export async function example9_subscriptionChange(
  userId: string,
  previousTier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | undefined,
  newTier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
  status: 'active' | 'cancelled' | 'past_due' | 'trial'
) {
  const event: SubscriptionEvent = {
    eventType: 'subscription.changed',
    userId,
    previousTier,
    newTier,
    status,
    timestamp: new Date().toISOString(),
  };

  await sendToN8nWebhook(event);
}

/**
 * Example 10: Error Reporting
 * 
 * Automatically report application errors to n8n for monitoring
 */
export async function example10_errorReporting(
  error: Error,
  context?: {
    url?: string;
    method?: string;
    userAgent?: string;
    userId?: string;
  }
) {
  const event: ErrorReportEvent = {
    eventType: 'error.report',
    errorName: error.name,
    errorMessage: error.message,
    stackTrace: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  try {
    await sendToN8nWebhook(event);
  } catch (webhookError) {
    // Don't let webhook errors prevent error reporting
    console.error('Failed to report error to n8n:', webhookError);
  }
}

/**
 * Example 11: Connection Testing
 * 
 * Test n8n webhook connectivity before sending important data
 */
export async function example11_testConnection() {
  console.log('Testing n8n webhook connection...');
  
  const isConnected = await testN8nWebhookConnection();
  
  if (isConnected) {
    console.log('✅ n8n webhook is reachable');
    return true;
  } else {
    console.log('❌ n8n webhook is not reachable');
    return false;
  }
}

/**
 * Example 12: Custom Configuration
 * 
 * Override default configuration for specific use cases
 */
export async function example12_customConfiguration() {
  // Use a different webhook for testing
  await sendToN8nWebhook(
    {
      eventType: 'test.event',
      timestamp: new Date().toISOString(),
    },
    {
      webhookUrl: 'https://test-instance.n8n.cloud/webhook/test',
      webhookSecret: 'test-secret',
      timeout: 10000, // 10 second timeout
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Environment': 'testing',
      },
    }
  );
}

/**
 * Example 13: API Route Integration (Next.js)
 * 
 * Example of using the webhook client in a Next.js API route
 */
export async function example13_apiRouteHandler(req: any, res: any) {
  // This would typically be in app/api/events/route.ts
  try {
    const body = await req.json();
    
    await sendToN8nWebhook({
      eventType: body.eventType,
      timestamp: new Date().toISOString(),
      ...body.data,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to process event:', error);
    return res.status(500).json({
      error: 'Failed to process event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Example 14: Server Action Integration (Next.js)
 * 
 * Example of using the webhook client in a Next.js Server Action
 */
export async function example14_serverAction(formData: FormData) {
  'use server'
  
  const courseId = formData.get('courseId') as string;
  const courseName = formData.get('courseName') as string;

  // Update database...
  
  // Notify n8n
  await sendToN8nWebhook({
    eventType: 'content.updated',
    contentType: 'course',
    contentId: courseId,
    changeType: 'updated',
    timestamp: new Date().toISOString(),
    changes: {
      after: { id: courseId, name: courseName },
    },
  });

  return { success: true };
}

/**
 * Example 15: Retry Logic with Exponential Backoff
 * 
 * Implement custom retry logic for critical events
 */
export async function example15_retryWithBackoff(
  payload: any,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await sendToN8nWebhook(payload);
      console.log(`Event sent successfully on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Example 16: Conditional Webhook Sending
 * 
 * Only send webhooks in production or when explicitly enabled
 */
export async function example16_conditionalSending(payload: any) {
  // Only send webhooks in production or when explicitly enabled
  const shouldSendWebhook = 
    process.env.NODE_ENV === 'production' || 
    process.env.ENABLE_N8N_WEBHOOKS === 'true';

  if (!shouldSendWebhook) {
    console.log('Webhook sending disabled in current environment');
    return { success: false, skipped: true };
  }

  return await sendToN8nWebhook(payload);
}

/**
 * Example 17: Webhook with Response Processing
 * 
 * Process the response from n8n workflow
 */
export async function example17_processResponse() {
  const result = await sendToN8nWebhook<
    { eventType: string; data: any; timestamp?: string },
    { processed: boolean; id: string; message: string }
  >({
    eventType: 'data.process',
    data: { values: [1, 2, 3, 4, 5] },
    timestamp: new Date().toISOString(),
  });

  if (result.success && result.data) {
    console.log('Processing ID:', result.data.id);
    console.log('Message:', result.data.message);
    console.log('Processed:', result.data.processed);
  }

  return result;
}

// Export all examples for easy testing
export const examples = {
  example1_simpleNotification,
  example2_assessmentCompleted,
  example3_curriculumIngest,
  example4_trackUserActivity,
  example5_contentUpdate,
  example6_batchEvents,
  example7_errorHandling,
  example8_systemNotification,
  example9_subscriptionChange,
  example10_errorReporting,
  example11_testConnection,
  example12_customConfiguration,
  example13_apiRouteHandler,
  example14_serverAction,
  example15_retryWithBackoff,
  example16_conditionalSending,
  example17_processResponse,
};

/**
 * Run all examples (for testing purposes)
 */
export async function runAllExamples() {
  console.log('=== Running n8n Webhook Client Examples ===\n');

  // Test connection first
  const isConnected = await example11_testConnection();
  if (!isConnected) {
    console.log('Cannot run examples - n8n webhook not reachable');
    return;
  }

  console.log('\nExample 1: Simple Notification');
  await example1_simpleNotification();

  console.log('\nExample 2: Assessment Completed');
  await example2_assessmentCompleted('user-123', 'assessment-456', 85, 20, 17, 1200);

  console.log('\nExample 6: Batch Events');
  await example6_batchEvents();

  console.log('\n=== Examples Complete ===');
}
