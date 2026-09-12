import { validateProductionEnv } from './lib/env-check';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    validateProductionEnv();
  }
}
