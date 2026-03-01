/**
 * Deterministic Safeguards Notice Document Generator
 *
 * Produces HTML from static legal text templates — no LLM involvement.
 * Each trigger type has a prescribed notice body per 34 CFR §300.504.
 */

import crypto from 'crypto';
import type { SafeguardsTrigger } from '@/types/safeguards';

export type NoticeGeneratorParams = {
  trigger: SafeguardsTrigger;
  studentName: string;
  districtName: string;
  schoolYear: string;
  issueDate: string;
};

export type GeneratedNotice = {
  content: string;
  docHash: string;
};

const TRIGGER_TITLES: Record<SafeguardsTrigger, string> = {
  ANNUAL_NOTICE: 'Annual Procedural Safeguards Notice',
  INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST:
    'Procedural Safeguards Notice — Initial Referral / Parent Evaluation Request',
  FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR:
    'Procedural Safeguards Notice — State Complaint Filed',
  FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR:
    'Procedural Safeguards Notice — Due Process Complaint Filed',
  DISCIPLINARY_CHANGE_OF_PLACEMENT:
    'Procedural Safeguards Notice — Disciplinary Change of Placement',
  PARENT_REQUEST: 'Procedural Safeguards Notice — Parent Request',
};

const TRIGGER_DESCRIPTIONS: Record<SafeguardsTrigger, string> = {
  ANNUAL_NOTICE:
    'Under the Individuals with Disabilities Education Act (IDEA), your school district is required to provide you with a copy of the procedural safeguards notice at least once per school year.',
  INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST:
    'You are receiving this notice because your child has been referred for a special education evaluation, or you have requested an evaluation of your child. Under 34 CFR §300.504(a)(1), you must receive a copy of the procedural safeguards notice upon initial referral or parent request for evaluation.',
  FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR:
    'You are receiving this notice because a state complaint has been filed. Under 34 CFR §300.504(a)(2), you must receive a copy of the procedural safeguards notice upon the filing of the first state complaint in a school year.',
  FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR:
    'You are receiving this notice because a due process complaint has been filed. Under 34 CFR §300.504(a)(3), you must receive a copy of the procedural safeguards notice upon the filing of the first due process complaint in a school year.',
  DISCIPLINARY_CHANGE_OF_PLACEMENT:
    'You are receiving this notice because a decision has been made to change your child\'s educational placement for disciplinary reasons. Under 34 CFR §300.504(a)(4) and §300.530, you must receive a copy of the procedural safeguards notice on the date a decision is made to make a removal that constitutes a change of placement.',
  PARENT_REQUEST:
    'You are receiving this notice because you have requested a copy of the procedural safeguards notice. Under 34 CFR §300.504(a), parents may request a copy at any time.',
};

const SAFEGUARDS_BODY = `
<h2>Your Rights Under IDEA</h2>
<p>This notice describes the procedural safeguards available to you under Part B of the Individuals with Disabilities Education Act (IDEA). It includes your rights related to:</p>
<ul>
  <li>Independent educational evaluations</li>
  <li>Prior written notice</li>
  <li>Parental consent</li>
  <li>Access to educational records</li>
  <li>Opportunity to present and resolve complaints through the due process complaint and State complaint procedures</li>
  <li>The child's placement during the pendency of any due process complaint</li>
  <li>Procedures for students who are subject to placement in an interim alternative educational setting</li>
  <li>Requirements for unilateral placement by parents of children in private schools at public expense</li>
  <li>Mediation</li>
  <li>Due process hearings</li>
  <li>Civil actions, including the time period for filing</li>
  <li>Attorneys' fees</li>
</ul>
<p>For the complete procedural safeguards document, please contact your district's special education department or visit your state education agency's website.</p>
`;

export function generateSafeguardsNoticeDocument(
  params: NoticeGeneratorParams,
): GeneratedNotice {
  const title = TRIGGER_TITLES[params.trigger];
  const description = TRIGGER_DESCRIPTIONS[params.trigger];

  const content = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
  <header style="border-bottom: 2px solid #1a365d; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="color: #1a365d; font-size: 1.25rem;">${params.districtName}</h1>
    <p style="color: #4a5568; font-size: 0.875rem;">School Year: ${params.schoolYear} &mdash; Issued: ${params.issueDate}</p>
  </header>

  <h1 style="color: #1a365d;">${title}</h1>
  <p><strong>Student:</strong> ${params.studentName}</p>
  <p>${description}</p>

  ${SAFEGUARDS_BODY}

  <footer style="border-top: 1px solid #cbd5e0; padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: #718096;">
    <p>This notice was generated pursuant to 34 CFR §300.504. If you need this document in a different language or format, please contact the district's special education office.</p>
  </footer>
</body>
</html>`;

  const docHash = crypto.createHash('sha256').update(content).digest('hex');

  return { content, docHash };
}
