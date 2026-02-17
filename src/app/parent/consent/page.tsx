/**
 * Parental Consent Management Page
 * COPPA-compliant consent workflow for minor students
 */

import { auth } from '@clerk/nextjs/server';
import { ParentalConsentClient } from './parental-consent-client';

export const dynamic = 'force-dynamic';

export default async function ParentalConsentPage() {
  const { userId } = await auth();

  return <ParentalConsentClient userId={userId} />;
}
