/**
 * n8n Webhook Client
 * 
 * This module provides a type-safe client for sending authenticated POST requests
 * to n8n webhooks using Header Authentication.
 * 
 * @example
 * ```typescript
 * import { sendToN8nWebhook } from '@/lib/n8n-client';
 * 
 * const result = await sendToN8nWebhook({
 *   eventType: 'curriculum.updated',
 *   data: { courseId: '123', moduleName: 'Math 101' }
 * });
 * ```
 */

import { logger } from '@/lib/logger';

/**
 * Configuration for n8n webhook client
 */
export interface N8nClientConfig {
  /** The n8n webhook URL (defaults to N8N_WEBHOOK_URL env var) */
  webhookUrl?: string;
  /** The webhook secret for authentication (defaults to N8N_WEBHOOK_SECRET env var) */
  webhookSecret?: string;
  /** Custom headers to include in the request */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Response from n8n webhook
 */
export interface N8nWebhookResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data from n8n */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** HTTP status code */
  status: number;
}

/**
 * Error thrown when n8n webhook request fails
 */
export class N8nWebhookError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'N8nWebhookError';
  }
}

/**
 * Validates n8n webhook configuration
 */
function validateConfig(config: N8nClientConfig = {}): { url: string; secret: string } {
  const url = config.webhookUrl || process.env.N8N_WEBHOOK_URL;
  const secret = config.webhookSecret || process.env.N8N_WEBHOOK_SECRET;

  if (!url) {
    throw new N8nWebhookError('N8N_WEBHOOK_URL is not configured');
  }

  if (!secret) {
    throw new N8nWebhookError('N8N_WEBHOOK_SECRET is not configured');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new N8nWebhookError(`Invalid N8N_WEBHOOK_URL: ${url}`);
  }

  return { url, secret };
}

/**
 * Sends a POST request to the configured n8n webhook with authentication
 * 
 * @template T - The type of the payload being sent
 * @template R - The expected response type from n8n
 * @param payload - The data to send to n8n
 * @param config - Optional configuration overrides
 * @returns Promise resolving to the webhook response
 * @throws {N8nWebhookError} If the webhook request fails
 * 
 * @example
 * ```typescript
 * // Send a simple event
 * await sendToN8nWebhook({
 *   eventType: 'user.registered',
 *   userId: '123',
 *   timestamp: new Date().toISOString()
 * });
 * 
 * // Send with custom configuration
 * await sendToN8nWebhook(
 *   { eventType: 'test' },
 *   { timeout: 10000 }
 * );
 * ```
 */
export async function sendToN8nWebhook<T = any, R = any>(
  payload: T,
  config: N8nClientConfig = {}
): Promise<N8nWebhookResponse<R>> {
  const { url, secret } = validateConfig(config);
  const timeout = config.timeout || 30000;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    logger.debug('Sending request to n8n webhook', {
      url: url.substring(0, 50) + '...',
      payloadSize: JSON.stringify(payload).length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
        ...config.headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: R | undefined;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        logger.warn('Failed to parse n8n webhook response as JSON', {
          error: jsonError instanceof Error ? jsonError.message : 'Unknown error',
        });
      }
    }

    if (!response.ok) {
      const errorMessage = data ? JSON.stringify(data) : response.statusText;
      logger.error('n8n webhook request failed', {
        status: response.status,
        error: errorMessage,
      });

      throw new N8nWebhookError(
        `n8n webhook request failed: ${errorMessage}`,
        response.status,
        data
      );
    }

    logger.info('n8n webhook request successful', {
      status: response.status,
    });

    return {
      success: true,
      data,
      status: response.status,
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof N8nWebhookError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const timeoutError = new N8nWebhookError(
          `n8n webhook request timed out after ${timeout}ms`,
          408
        );
        logger.error('n8n webhook request timed out', { timeout });
        throw timeoutError;
      }

      logger.error('n8n webhook request failed', {
        error: error.message,
      });

      throw new N8nWebhookError(
        `n8n webhook request failed: ${error.message}`
      );
    }

    throw new N8nWebhookError('Unknown error occurred during n8n webhook request');
  }
}

/**
 * Sends a batch of requests to n8n webhook sequentially
 * 
 * @template T - The type of the payloads being sent
 * @param payloads - Array of payloads to send
 * @param config - Optional configuration overrides
 * @param options - Batch processing options
 * @returns Promise resolving to array of results with success status
 * 
 * @example
 * ```typescript
 * const results = await sendBatchToN8nWebhook([
 *   { eventType: 'event1', data: {...} },
 *   { eventType: 'event2', data: {...} },
 * ]);
 * 
 * results.forEach(result => {
 *   if (!result.success) {
 *     console.error('Failed:', result.error);
 *   }
 * });
 * ```
 */
export async function sendBatchToN8nWebhook<T = any>(
  payloads: T[],
  config: N8nClientConfig = {},
  options: {
    /** Continue processing even if some requests fail (default: true) */
    continueOnError?: boolean;
    /** Delay between requests in milliseconds (default: 0) */
    delayBetweenRequests?: number;
  } = {}
): Promise<Array<N8nWebhookResponse & { index: number }>> {
  const { continueOnError = true, delayBetweenRequests = 0 } = options;
  const results: Array<N8nWebhookResponse & { index: number }> = [];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const result = await sendToN8nWebhook(payloads[i], config);
      results.push({ ...result, index: i });

      if (delayBetweenRequests > 0 && i < payloads.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    } catch (error) {
      const errorResult: N8nWebhookResponse & { index: number } = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error instanceof N8nWebhookError ? error.status || 500 : 500,
        index: i,
      };
      
      results.push(errorResult);

      if (!continueOnError) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Tests the n8n webhook connection
 * 
 * @param config - Optional configuration overrides
 * @returns Promise resolving to true if connection is successful
 * 
 * @example
 * ```typescript
 * const isConnected = await testN8nWebhookConnection();
 * if (isConnected) {
 *   console.log('n8n webhook is reachable');
 * }
 * ```
 */
export async function testN8nWebhookConnection(
  config: N8nClientConfig = {}
): Promise<boolean> {
  try {
    await sendToN8nWebhook(
      {
        eventType: 'connection.test',
        timestamp: new Date().toISOString(),
      },
      { ...config, timeout: 10000 }
    );
    return true;
  } catch (error) {
    logger.error('n8n webhook connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}
