// Minimal Sentry shim with safe no-op fallback
let sentry: any = null;

try {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Dynamically require via variable to avoid static bundler resolution when package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleName = '@sentry/nextjs';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require(moduleName);
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0'),
      replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '0.1'),
    });
    sentry = Sentry;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Sentry not initialized:', e);
  sentry = null;
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (sentry?.captureException) {
    sentry.captureException(err, { extra: context });
  } else {
    // eslint-disable-next-line no-console
    console.error('Error:', err, context);
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (sentry?.captureMessage) {
    sentry.captureMessage(message, { extra: context });
  } else {
    // eslint-disable-next-line no-console
    console.log('Message:', message, context);
  }
}


