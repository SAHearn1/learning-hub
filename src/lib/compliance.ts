import { ConsentStatus, UserRole } from '@prisma/client';
import { ForbiddenError } from '@/lib/api-errors';

export const guardianRoles: UserRole[] = ['PARENT', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export function canManageMinorConsent(role: UserRole): boolean {
  return guardianRoles.includes(role);
}

export function isConsentStatusTransitionAllowed(current: ConsentStatus | null, next: ConsentStatus): boolean {
  if (!current) {
    return next === 'PENDING' || next === 'GRANTED' || next === 'DENIED';
  }

  const allowedTransitions: Record<ConsentStatus, ConsentStatus[]> = {
    PENDING: ['GRANTED', 'DENIED', 'WITHDRAWN'],
    GRANTED: ['WITHDRAWN'],
    DENIED: ['PENDING', 'GRANTED'],
    WITHDRAWN: ['PENDING', 'GRANTED'],
  };

  return allowedTransitions[current].includes(next);
}

export type RetentionPolicyRecord = {
  category: string;
  retentionPeriod: string;
  legalBasis: string;
  deletionMethod: string;
};

export const retentionPolicyRecords: RetentionPolicyRecord[] = [
  {
    category: 'Student learning session transcripts',
    retentionPeriod: '24 months after the last activity date',
    legalBasis: 'FERPA school official interest and educational continuity',
    deletionMethod: 'Automated soft-delete followed by 30-day hard-delete purge',
  },
  {
    category: 'Assessment outcomes and mastery records',
    retentionPeriod: '36 months after school year close',
    legalBasis: 'District reporting obligations and instructional planning',
    deletionMethod: 'Scheduled anonymization with aggregate-only retention',
  },
  {
    category: 'Parental consent records and revocations',
    retentionPeriod: '7 years from consent action',
    legalBasis: 'COPPA consent evidence and legal defensibility',
    deletionMethod: 'Encrypted archive with expiration-based destruction',
  },
  {
    category: 'Security and compliance audit logs',
    retentionPeriod: '13 months rolling',
    legalBasis: 'Security incident response and SOC 2 evidence collection',
    deletionMethod: 'Immutable log rotation and secure archival destruction',
  },
];

export type DataRightsRequestType = 'EXPORT' | 'DELETE';

export function requiresGuardianForDataRequest(isMinor: boolean, role: UserRole): boolean {
  return isMinor && !canManageMinorConsent(role);
}

export function hasOperationalConsentForLearning(isMinor: boolean, consentStatus: ConsentStatus | null | undefined): boolean {
  if (!isMinor) {
    return true;
  }

  return consentStatus === 'GRANTED';
}

export function assertMinorConsentForLearning(
  isMinor: boolean,
  consentStatus: ConsentStatus | null | undefined,
  context: { action: string },
): void {
  if (hasOperationalConsentForLearning(isMinor, consentStatus)) {
    return;
  }

  throw new ForbiddenError(
    `Parental consent is required before ${context.action}.`,
  );
}
