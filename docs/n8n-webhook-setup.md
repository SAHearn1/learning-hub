# n8n Webhook Integration Setup

This guide provides comprehensive instructions for setting up and using the n8n webhook integration in the RootWork Learning Hub.

## Overview

The n8n webhook integration allows the Learning Hub to send events and data to n8n workflows for automation, data processing, and integrations with external services. The integration uses secure Header Authentication to ensure only authorized requests are processed.

### Key Features

- **Type-safe TypeScript client** for sending webhook requests
- **Header-based authentication** using `x-webhook-secret`
- **Comprehensive error handling** with custom error types
- **Batch processing support** for multiple events
- **Generic payload types** for flexibility
- **Built-in timeout and retry logic**
- **Detailed logging** for debugging and monitoring

## Prerequisites

- An n8n instance (cloud or self-hosted)
- Node.js 20+ with TypeScript
- Access to Vercel (for production deployment)

## n8n Configuration

### 1. Create a Webhook Node in n8n

1. Open your n8n workflow editor
2. Add a **Webhook** node to your workflow
3. Configure the webhook node:
   - **HTTP Method**: `POST`
   - **Path**: Choose a unique path (e.g., `learning-hub-events`)
   - **Authentication**: `Header Auth`
   - **Header Name**: `x-webhook-secret`
   - **Response Mode**: Choose based on your needs:
     - `On Received` - Immediate response (recommended for async processing)
     - `Last Node` - Wait for workflow completion
     - `Response Node` - Custom response handling

### 2. Generate a Webhook Secret

Generate a strong, random secret key for authentication:

```bash
openssl rand -hex 32
```

This will output a 64-character hexadecimal string like:
```
a3f8c9d1e2b4f5a6c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### 3. Configure Authentication in n8n

1. In the Webhook node, under **Authentication**:
   - Select `Header Auth`
   - Set **Header Name** to `x-webhook-secret`
   - Set **Header Value** to your generated secret
2. Save the workflow
3. Activate the workflow

### 4. Copy the Webhook URL

After activating the workflow, n8n will display the webhook URL. It will look like:
```
https://your-instance.app.n8n.cloud/webhook/learning-hub-events
```

or for self-hosted:
```
https://n8n.yourcompany.com/webhook/learning-hub-events
```

Copy this URL for use in the next steps.

## Local Development Setup

### 1. Copy Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 2. Add Your n8n Credentials

Open `.env.local` and update the n8n configuration:

```bash
# n8n Workflow Integration
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/learning-hub-events
N8N_WEBHOOK_SECRET=a3f8c9d1e2b4f5a6c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

Replace:
- `N8N_WEBHOOK_URL` with your actual webhook URL from n8n
- `N8N_WEBHOOK_SECRET` with your generated secret key

### 3. Verify Configuration

Start your development server:

```bash
npm run dev
```

The application will load the environment variables from `.env.local`.

### 4. Test the Connection (Optional)

You can test the webhook connection using the provided client:

```typescript
import { testN8nWebhookConnection } from '@/lib/n8n-client';

const isConnected = await testN8nWebhookConnection();
console.log('n8n webhook connected:', isConnected);
```

## Vercel Deployment Setup

### Adding Environment Variables to Vercel

1. **Navigate to your project** on [Vercel Dashboard](https://vercel.com/dashboard)

2. **Go to Project Settings**:
   - Click on your project
   - Click on "Settings" tab
   - Select "Environment Variables" from the sidebar

3. **Add N8N_WEBHOOK_URL**:
   - Name: `N8N_WEBHOOK_URL`
   - Value: `https://your-instance.app.n8n.cloud/webhook/learning-hub-events`
   - Environments: Select all (Production, Preview, Development)
   - Click "Save"

4. **Add N8N_WEBHOOK_SECRET**:
   - Name: `N8N_WEBHOOK_SECRET`
   - Value: Your generated secret key
   - Environments: Select all (Production, Preview, Development)
   - Click "Save"

### Important Security Notes

- ⚠️ **Never commit** `.env.local` or `.env` files to version control
- ✅ `.env.example` should only contain placeholder values
- ✅ Use different secrets for development and production
- ✅ Rotate secrets periodically for security
- ✅ Only use these environment variables in server-side code (API routes, server components)

### Vercel CLI Deployment

If using Vercel CLI, you can set environment variables with:

```bash
vercel env add N8N_WEBHOOK_URL
# Enter your webhook URL when prompted

vercel env add N8N_WEBHOOK_SECRET
# Enter your secret when prompted
```

### Redeployment

After adding environment variables:
1. Trigger a new deployment (commit and push, or manually redeploy)
2. Vercel will use the new environment variables in the build

## Usage Examples

### Basic Usage

#### Send a Single Event

```typescript
import { sendToN8nWebhook } from '@/lib/n8n-client';

// In an API route or server component
export async function POST(req: Request) {
  try {
    const result = await sendToN8nWebhook({
      eventType: 'user.registered',
      userId: '123',
      email: 'user@example.com',
      timestamp: new Date().toISOString(),
    });

    console.log('Event sent successfully:', result);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to send event:', error);
    return Response.json({ error: 'Failed to send event' }, { status: 500 });
  }
}
```

#### Send a Typed Event

```typescript
import { sendToN8nWebhook } from '@/lib/n8n-client';
import type { AssessmentCompletedEvent } from '@/types/n8n';

export async function notifyAssessmentComplete(
  userId: string,
  assessmentId: string,
  score: number
) {
  const payload: AssessmentCompletedEvent = {
    eventType: 'assessment.completed',
    userId,
    assessmentId,
    score,
    timestamp: new Date().toISOString(),
    results: {
      totalQuestions: 20,
      correctAnswers: Math.floor((score / 100) * 20),
      timeTakenSeconds: 1200,
    },
  };

  return await sendToN8nWebhook(payload);
}
```

### Advanced Usage

#### Batch Processing

Send multiple events with error handling:

```typescript
import { sendBatchToN8nWebhook } from '@/lib/n8n-client';

const events = [
  { eventType: 'user.login', userId: '123' },
  { eventType: 'user.login', userId: '456' },
  { eventType: 'user.login', userId: '789' },
];

const results = await sendBatchToN8nWebhook(events, {}, {
  continueOnError: true,
  delayBetweenRequests: 100, // 100ms delay between requests
});

// Check results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Event ${index} sent successfully`);
  } else {
    console.error(`Event ${index} failed:`, result.error);
  }
});
```

#### Custom Configuration

Override default configuration for specific requests:

```typescript
import { sendToN8nWebhook } from '@/lib/n8n-client';

const result = await sendToN8nWebhook(
  { eventType: 'test.event' },
  {
    webhookUrl: 'https://alternative-instance.n8n.cloud/webhook/test',
    webhookSecret: 'different-secret',
    timeout: 10000, // 10 second timeout
    headers: {
      'X-Custom-Header': 'custom-value',
    },
  }
);
```

#### Error Handling

```typescript
import { sendToN8nWebhook, N8nWebhookError } from '@/lib/n8n-client';

try {
  await sendToN8nWebhook({
    eventType: 'critical.event',
    data: { /* ... */ },
  });
} catch (error) {
  if (error instanceof N8nWebhookError) {
    console.error('Webhook error:', {
      message: error.message,
      status: error.status,
      response: error.response,
    });

    // Handle specific error cases
    if (error.status === 401) {
      // Authentication failed
      console.error('Invalid webhook secret');
    } else if (error.status === 408) {
      // Timeout
      console.error('Request timed out');
    }
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Server-Side Usage

#### In API Routes (Next.js App Router)

```typescript
// app/api/webhooks/user-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendToN8nWebhook } from '@/lib/n8n-client';
import type { UserActivityEvent } from '@/types/n8n';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const event: UserActivityEvent = {
    eventType: 'user.activity',
    userId: body.userId,
    activityType: body.activityType,
    timestamp: new Date().toISOString(),
    data: body.data,
  };

  try {
    await sendToN8nWebhook(event);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send event' },
      { status: 500 }
    );
  }
}
```

#### In Server Actions (Next.js)

```typescript
'use server'

import { sendToN8nWebhook } from '@/lib/n8n-client';
import type { ContentUpdateEvent } from '@/types/n8n';

export async function updateCourseContent(courseId: string, changes: any) {
  // Update database...
  
  // Notify n8n
  const event: ContentUpdateEvent = {
    eventType: 'content.updated',
    contentType: 'course',
    contentId: courseId,
    changeType: 'updated',
    timestamp: new Date().toISOString(),
    changes: {
      after: changes,
    },
  };

  await sendToN8nWebhook(event);
  
  return { success: true };
}
```

#### Background Jobs

```typescript
import { sendToN8nWebhook } from '@/lib/n8n-client';

async function processCurriculumIngest() {
  // Process files...
  
  // Send completion notification
  await sendToN8nWebhook({
    eventType: 'curriculum.ingest',
    source: 'SCHEDULED',
    files: processedFiles,
    metadata: {
      totalFiles: processedFiles.length,
      processedAt: new Date().toISOString(),
    },
  });
}
```

## Common Workflows

### 1. User Registration Notification

```typescript
await sendToN8nWebhook({
  eventType: 'user.registered',
  userId: user.id,
  email: user.email,
  name: user.name,
  timestamp: new Date().toISOString(),
});
```

### 2. Assessment Completion

```typescript
await sendToN8nWebhook({
  eventType: 'assessment.completed',
  userId: user.id,
  assessmentId: assessment.id,
  score: results.score,
  results: {
    totalQuestions: results.total,
    correctAnswers: results.correct,
    timeTakenSeconds: results.duration,
  },
  timestamp: new Date().toISOString(),
});
```

### 3. Error Reporting

```typescript
await sendToN8nWebhook({
  eventType: 'error.report',
  errorName: error.name,
  errorMessage: error.message,
  stackTrace: error.stack,
  context: {
    url: req.url,
    method: req.method,
    userId: session?.userId,
  },
  timestamp: new Date().toISOString(),
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendToN8nWebhook } from '@/lib/n8n-client';

describe('n8n webhook client', () => {
  it('should send webhook with correct headers', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await sendToN8nWebhook({ test: 'data' });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-webhook-secret': expect.any(String),
        }),
      })
    );
  });
});
```

### Manual Testing

Test the webhook connection from your terminal:

```bash
curl -X POST \
  https://your-instance.app.n8n.cloud/webhook/learning-hub-events \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret-here" \
  -d '{"eventType":"test","timestamp":"2024-01-01T00:00:00Z"}'
```

## Troubleshooting

### Common Issues

#### 1. "N8N_WEBHOOK_URL is not configured"

**Solution**: Ensure `N8N_WEBHOOK_URL` is set in your `.env.local` file (for local) or in Vercel environment variables (for production).

#### 2. "Invalid webhook secret" (401 error)

**Solution**: 
- Verify the secret in `.env.local` matches the secret configured in n8n
- Ensure the header name in n8n is exactly `x-webhook-secret`

#### 3. "Request timed out" (408 error)

**Solution**:
- Check your n8n instance is running and accessible
- Increase timeout: `sendToN8nWebhook(payload, { timeout: 60000 })`
- Ensure your n8n workflow is active

#### 4. Connection refused

**Solution**:
- Verify the webhook URL is correct
- Check network/firewall settings
- Ensure n8n instance is running

### Debug Mode

Enable debug logging in your `.env.local`:

```bash
LOG_LEVEL=debug
```

This will output detailed logs for all n8n webhook requests.

## Security Best Practices

1. **Never commit secrets**: Always use environment variables
2. **Use different secrets**: Use separate secrets for dev, staging, and production
3. **Rotate secrets regularly**: Update secrets every 3-6 months
4. **Server-side only**: Never expose webhook URLs or secrets to client-side code
5. **Validate payloads**: Always validate data before sending to n8n
6. **Monitor logs**: Regularly review webhook logs for suspicious activity
7. **Rate limiting**: Consider implementing rate limiting for webhook requests
8. **HTTPS only**: Always use HTTPS for webhook URLs

## Monitoring and Logging

All webhook requests are automatically logged using the application's logger. You can monitor webhook activity through:

1. **Application logs**: Check your server logs for n8n webhook entries
2. **n8n execution logs**: View workflow execution history in n8n
3. **Error tracking**: Failed requests are logged with full error details

Example log entries:
```
[DEBUG] Sending request to n8n webhook { url: 'https://...', payloadSize: 245 }
[INFO] n8n webhook request successful { status: 200 }
[ERROR] n8n webhook request failed { status: 401, error: 'Unauthorized' }
```

## Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## Support

If you encounter issues not covered in this guide:

1. Check the [n8n community forum](https://community.n8n.io/)
2. Review n8n workflow execution logs
3. Enable debug logging and check application logs
4. Create an issue in the project repository with detailed error information
