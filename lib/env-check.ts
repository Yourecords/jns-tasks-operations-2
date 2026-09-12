/**
 * Production Environment Configuration Validator
 *
 * In production mode, enforces that all critical security credentials and database
 * connection strings are explicitly defined in the environment. Startup immediately
 * fails if any of these required variables are missing.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // During build phase (e.g. next build static page data collection),
  // defer startup validation until server runtime execution.
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build') {
    return;
  }

  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_URL',
  ] as const;

  const missing = requiredEnvVars.filter((v) => !process.env[v] || process.env[v]?.trim() === '');

  if (missing.length > 0) {
    const errorMsg = `[FATAL PRODUCTION STARTUP FAILURE] Missing required environment variables: ${missing.join(
      ', '
    )}. Refusing to start in insecure state.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}
