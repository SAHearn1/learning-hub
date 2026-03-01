/**
 * Consent Form Generator
 *
 * Deterministic HTML + SHA-256 hash per 34 CFR §300.300.
 */

import crypto from 'crypto';
import type { ConsentType } from '@/types/evaluation';

export type ConsentFormParams = {
  consentType: ConsentType;
  studentName: string;
  districtName: string;
  evaluationDomains: string[];
  issueDate: string;
};

export type GeneratedConsentForm = {
  content: string;
  docHash: string;
};

const CONSENT_TITLES: Record<ConsentType, string> = {
  INITIAL_EVALUATION: 'Consent for Initial Evaluation',
  REEVALUATION: 'Consent for Reevaluation',
  SERVICES: 'Consent for Special Education Services',
  RELEASE_OF_RECORDS: 'Consent for Release of Records',
};

const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  INITIAL_EVALUATION:
    'The school district is requesting your consent to conduct an initial evaluation to determine if your child is eligible for special education and related services under the Individuals with Disabilities Education Act (IDEA).',
  REEVALUATION:
    'The school district is requesting your consent to conduct a reevaluation of your child to determine continuing eligibility and educational needs under IDEA.',
  SERVICES:
    'The school district is requesting your consent to provide special education and related services to your child as described in the Individualized Education Program (IEP).',
  RELEASE_OF_RECORDS:
    'The school district is requesting your consent to release your child\'s educational records to the parties specified below.',
};

export function generateConsentDocument(params: ConsentFormParams): GeneratedConsentForm {
  const title = CONSENT_TITLES[params.consentType];
  const description = CONSENT_DESCRIPTIONS[params.consentType];

  const domainsList = params.evaluationDomains.length > 0
    ? `<ul>${params.evaluationDomains.map((d) => `<li>${d}</li>`).join('')}</ul>`
    : '<p>To be determined based on the evaluation plan.</p>';

  const content = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
  <header style="border-bottom: 2px solid #1a365d; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="color: #1a365d; font-size: 1.25rem;">${params.districtName}</h1>
    <p style="color: #4a5568; font-size: 0.875rem;">Date: ${params.issueDate}</p>
  </header>

  <h1 style="color: #1a365d;">${title}</h1>
  <p><strong>Student:</strong> ${params.studentName}</p>
  <p>${description}</p>

  <h2>Proposed Assessment Areas</h2>
  ${domainsList}

  <h2>Your Rights</h2>
  <p>Under 34 CFR &sect;300.300, you have the right to:</p>
  <ul>
    <li>Give or refuse consent for the evaluation</li>
    <li>Revoke consent at any time in writing</li>
    <li>Request a copy of the evaluation report at no cost</li>
    <li>Request an Independent Educational Evaluation (IEE) if you disagree with results</li>
  </ul>

  <h2>Consent</h2>
  <p>I have been informed of my rights and the proposed action. I understand that my consent is voluntary and may be revoked at any time.</p>
  <p style="margin-top: 2rem;">
    ☐ I GRANT consent&nbsp;&nbsp;&nbsp;&nbsp;☐ I REFUSE consent
  </p>
  <p style="margin-top: 2rem; border-top: 1px solid #000; padding-top: 0.5rem;">
    Parent/Guardian Signature: _______________________ Date: _________
  </p>

  <footer style="border-top: 1px solid #cbd5e0; padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: #718096;">
    <p>This consent form is issued pursuant to 34 CFR &sect;300.300.</p>
  </footer>
</body>
</html>`;

  const docHash = crypto.createHash('sha256').update(content).digest('hex');
  return { content, docHash };
}
