# Deployment Guide (Exam Platform)

## 1. Environment Variables (.env)
Create a `.env` in project root using this template:

```
# App
NODE_ENV=production
NEXT_PUBLIC_APP_ORIGIN=https://your-domain.com

# Auth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate_a_strong_secret

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname
SHADOW_DATABASE_URL=postgresql://user:password@host:5432/dbname_shadow

# Redis (optional for rate limit & socket adapter)
REDIS_RATE_LIMIT=true
REDIS_URL=redis://default:password@host:6379

# Email
SMTP_HOST=smtp.yourhost.com
SMTP_PORT=587
SMTP_USER=mailer@your-domain.com
SMTP_PASS=your_smtp_password
EMAIL_FROM=no-reply@your-domain.com

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1
```

## 2. Database
- Ensure PostgreSQL is reachable
- Run migrations:

```
npm run prisma:generate
npx prisma migrate deploy
```

- Optional: seed initial data
```
npm run prisma:seed
```

## 3. Build & Start
```
npm ci
npm run build
npm run start
```
Starts on port 3000. Use a reverse proxy (NGINX/Caddy) for TLS and HTTP/2.

## 4. Healthcheck
- Add an external check to `/api/auth/resolve-college` with a known username or create a simple `/api/health` route if needed.

## 5. Docker (optional)
See `Dockerfile` and `docker-compose.yml` for a local or production-like setup.

## 6. CI
- Recommended: Run lint, unit/integration tests, Playwright E2E, and `prisma migrate deploy` on release.

## Notes
- CSP and CORS are configured in `src/middleware.ts` using `NEXT_PUBLIC_APP_ORIGIN` and `NEXTAUTH_URL`.
- Rate limiting defaults to in-memory; Redis enables distributed limits.
