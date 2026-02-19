export const featureFlags = {
  get strictRoleEnforcement() {
    return process.env.STRICT_ROLE_ENFORCEMENT === 'true';
  },
  get sessionResumeEnabled() {
    return process.env.NEXT_PUBLIC_ENABLE_SESSION_RESUME !== 'false';
  },
} as const;
