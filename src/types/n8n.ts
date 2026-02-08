/**
 * Type definitions for n8n webhook payloads
 * 
 * This file contains TypeScript interfaces and types for common
 * n8n webhook payload structures used in the learning hub.
 */

/**
 * Base webhook event structure
 */
export interface N8nWebhookEvent {
  /** Type of event being sent */
  eventType: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp?: string;
  /** Additional metadata for the event */
  metadata?: Record<string, any>;
}

/**
 * Curriculum ingestion event payload
 */
export interface CurriculumIngestEvent extends N8nWebhookEvent {
  eventType: 'curriculum.ingest';
  /** Source of the ingestion */
  source: 'WEBHOOK' | 'MANUAL' | 'SCHEDULED' | 'API';
  /** Files to be ingested */
  files?: Array<{
    /** Path to the file */
    path: string;
    /** Content of the file (optional if URL is provided) */
    content?: string;
    /** URL to fetch the file content */
    url?: string;
    /** File metadata */
    metadata?: Record<string, any>;
  }>;
}

/**
 * User activity event payload
 */
export interface UserActivityEvent extends N8nWebhookEvent {
  eventType: 'user.activity';
  /** User identifier */
  userId: string;
  /** Type of activity */
  activityType: 'login' | 'assessment_completed' | 'progress_updated' | 'subscription_changed';
  /** Activity-specific data */
  data: Record<string, any>;
}

/**
 * Assessment completion event payload
 */
export interface AssessmentCompletedEvent extends N8nWebhookEvent {
  eventType: 'assessment.completed';
  /** User identifier */
  userId: string;
  /** Assessment identifier */
  assessmentId: string;
  /** Assessment score (0-100) */
  score: number;
  /** Assessment results */
  results: {
    /** Total questions */
    totalQuestions: number;
    /** Correct answers */
    correctAnswers: number;
    /** Time taken in seconds */
    timeTakenSeconds: number;
  };
}

/**
 * Content update event payload
 */
export interface ContentUpdateEvent extends N8nWebhookEvent {
  eventType: 'content.updated';
  /** Type of content updated */
  contentType: 'standard' | 'topic' | 'course' | 'module';
  /** Content identifier */
  contentId: string;
  /** What changed */
  changeType: 'created' | 'updated' | 'deleted';
  /** Previous and new values */
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
}

/**
 * System notification event payload
 */
export interface SystemNotificationEvent extends N8nWebhookEvent {
  eventType: 'system.notification';
  /** Notification level */
  level: 'info' | 'warning' | 'error' | 'critical';
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Related service or component */
  service?: string;
}

/**
 * Analytics event payload
 */
export interface AnalyticsEvent extends N8nWebhookEvent {
  eventType: 'analytics.track';
  /** Event category */
  category: string;
  /** Event action */
  action: string;
  /** Event label */
  label?: string;
  /** Event value */
  value?: number;
  /** User identifier (if applicable) */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
}

/**
 * Subscription event payload
 */
export interface SubscriptionEvent extends N8nWebhookEvent {
  eventType: 'subscription.changed';
  /** User identifier */
  userId: string;
  /** Previous subscription tier */
  previousTier?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  /** New subscription tier */
  newTier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  /** Subscription status */
  status: 'active' | 'cancelled' | 'past_due' | 'trial';
}

/**
 * Error reporting event payload
 */
export interface ErrorReportEvent extends N8nWebhookEvent {
  eventType: 'error.report';
  /** Error name or type */
  errorName: string;
  /** Error message */
  errorMessage: string;
  /** Stack trace (if available) */
  stackTrace?: string;
  /** Request context */
  context?: {
    /** Request URL */
    url?: string;
    /** Request method */
    method?: string;
    /** User agent */
    userAgent?: string;
    /** User ID (if authenticated) */
    userId?: string;
  };
}

/**
 * Union type of all webhook event types
 */
export type N8nWebhookPayload =
  | CurriculumIngestEvent
  | UserActivityEvent
  | AssessmentCompletedEvent
  | ContentUpdateEvent
  | SystemNotificationEvent
  | AnalyticsEvent
  | SubscriptionEvent
  | ErrorReportEvent
  | N8nWebhookEvent; // fallback for custom events

/**
 * Response from n8n workflow
 */
export interface N8nWorkflowResponse {
  /** Whether the workflow executed successfully */
  success: boolean;
  /** Workflow execution ID */
  executionId?: string;
  /** Response message */
  message?: string;
  /** Response data */
  data?: any;
  /** Error details (if failed) */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Configuration for n8n webhook in workflow
 */
export interface N8nWebhookConfig {
  /** HTTP method (should be POST) */
  httpMethod: 'POST';
  /** Path for the webhook */
  path: string;
  /** Authentication configuration */
  authentication: {
    /** Authentication type */
    type: 'headerAuth';
    /** Header name for authentication */
    headerName: 'x-webhook-secret';
  };
  /** Response mode */
  responseMode: 'onReceived' | 'lastNode' | 'responseNode';
  /** Response data */
  responseData?: 'firstEntryJson' | 'allEntries' | 'noData';
}
