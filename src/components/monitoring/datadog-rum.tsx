'use client';

import { useEffect } from 'react';
import { datadogRum } from '@datadog/browser-rum';

export function DatadogRum() {
  useEffect(() => {
    datadogRum.init({
      applicationId: process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID ?? 'a2dbf14d-3db4-4e34-add2-a04f93b3ef12',
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN ?? 'pub586ef237aa8841d077626f62a98ecb70',
      site: process.env.NEXT_PUBLIC_DATADOG_SITE ?? 'datadoghq.com',
      service: 'learning-hub',
      env: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackResources: true,
      trackUserInteractions: true,
      trackLongTasks: true,
    });
  }, []);

  return null;
}
