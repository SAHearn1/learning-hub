/**
 * Prior Written Notice (PWN) Generator
 *
 * Deterministic HTML + SHA-256 hash per 34 CFR §300.503.
 * No LLM involvement — static legal templates only.
 */

import crypto from 'crypto';

export type PwnParams = {
  studentName: string;
  districtName: string;
  actionDescription: string;
  reasonForAction: string;
  evaluationDescription: string;
  otherOptionsConsidered: string;
  otherFactors: string;
  issueDate: string;
};

export type GeneratedPwn = {
  content: string;
  docHash: string;
};

export function generatePwnDocument(params: PwnParams): GeneratedPwn {
  const content = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Prior Written Notice</title></head>
<body style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
  <header style="border-bottom: 2px solid #1a365d; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="color: #1a365d; font-size: 1.25rem;">${params.districtName}</h1>
    <p style="color: #4a5568; font-size: 0.875rem;">Date: ${params.issueDate}</p>
  </header>

  <h1 style="color: #1a365d;">Prior Written Notice</h1>
  <p style="font-size: 0.875rem; color: #4a5568;">Pursuant to 34 CFR &sect;300.503</p>
  <p><strong>Student:</strong> ${params.studentName}</p>

  <h2>Description of the Action Proposed or Refused</h2>
  <p>${params.actionDescription}</p>

  <h2>Explanation of Why the Agency Proposes or Refuses the Action</h2>
  <p>${params.reasonForAction}</p>

  <h2>Description of Each Evaluation Procedure, Assessment, Record, or Report Used</h2>
  <p>${params.evaluationDescription}</p>

  <h2>Other Options Considered and Why They Were Rejected</h2>
  <p>${params.otherOptionsConsidered}</p>

  <h2>Other Factors Relevant to the Proposal or Refusal</h2>
  <p>${params.otherFactors}</p>

  <h2>Your Rights</h2>
  <p>You have protections under the procedural safeguards of Part B of IDEA. A copy of the procedural safeguards is available from your school district. If you need assistance understanding these rights, please contact your district's special education office.</p>

  <footer style="border-top: 1px solid #cbd5e0; padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: #718096;">
    <p>This Prior Written Notice is issued pursuant to 34 CFR &sect;300.503. If you need this document in a different language or format, please contact the district.</p>
  </footer>
</body>
</html>`;

  const docHash = crypto.createHash('sha256').update(content).digest('hex');
  return { content, docHash };
}
