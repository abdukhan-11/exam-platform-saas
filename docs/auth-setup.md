# Authentication System Setup Guide

This guide covers setting up the NextAuth.js authentication system for the Exam SaaS application.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (see `database-setup.md`)
- Prisma CLI installed globally: `npm install -g prisma`

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/exam_saas"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-character-secret-key-here-minimum"

# JWT Configuration
JWT_SECRET="your-32-character-jwt-secret-key-here"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_SECRET="your-32-character-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Environment
NODE_ENV="development"
```

### Generating Secrets

You can generate secure secrets using these commands:

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32

# Generate refresh token secret
openssl rand -base64 32
```

## Database Setup

1. **Run Prisma migrations:**
   ```bash
   npx prisma migrate dev
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Seed the database:**
   ```bash
   npm run prisma:seed
   ```

## Testing the Authentication System

1. **Run the authentication test:**
   ```bash
   npm run test:auth
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Test the login forms:**
   - Admin/Teacher login: `/auth/login`
   - Student login: `/auth/login-student`
   - College selection: Enter a valid college username first

## Authentication Features

### Multi-tenant Authentication
- **College Selection**: Users must select their college before authentication
- **Role-based Access**: Different authentication methods for different user types
- **Tenant Isolation**: Users can only access their own college's data

### User Types
1. **Super Admin** (`SUPER_ADMIN`)
   - Access to all colleges and users
   - No college restriction
   - 8-hour session duration

2. **College Admin** (`COLLEGE_ADMIN`)
   - Access to their own college only
   - Manage teachers and students
   - 8-hour session duration

3. **Teacher** (`TEACHER`)
   - Access to their own college only
   - Manage assigned subjects and exams
   - 24-hour session duration

4. **Student** (`STUDENT`)
   - Access to their own college only
   - Take exams and view results
   - 24-hour session duration

### Authentication Methods
- **Admin/Teacher**: Email + Password + College Username
- **Student**: Roll Number + Password + College Username
- **Super Admin**: Email + Password (no college required)

## Security Features

- **Password Hashing**: Bcrypt with 10 salt rounds
- **JWT Strategy**: Secure token-based authentication
- **Session Management**: Configurable session duration by role
- **Route Protection**: Middleware-based access control
- **College Validation**: Real-time college username verification

## API Endpoints

### Authentication
- `POST /api/auth/resolve-college` - Validate college username
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### Protected Routes
- `/dashboard/*` - Role-based dashboard access
- `/api/protected/*` - Protected API endpoints

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify user exists in database
   - Check if user is active
   - Ensure correct college username

2. **"College not found" error**
   - Verify college exists and is active
   - Check college username spelling
   - Ensure database is seeded

3. **Middleware errors**
   - Check environment variables
   - Verify NextAuth configuration
   - Check database connection

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` in your `.env` file. This will show detailed NextAuth.js logs.

## Production Deployment

1. **Update environment variables:**
   - Set `NODE_ENV=production`
   - Use strong, unique secrets
   - Configure production database URL

2. **Security considerations:**
   - Enable HTTPS
   - Set secure cookie options
   - Configure CORS properly
   - Enable rate limiting

3. **Monitoring:**
   - Set up authentication logs
   - Monitor failed login attempts
   - Track session metrics

## Next Steps

After setting up authentication:

1. **Test all user roles** with the login forms
2. **Verify route protection** by accessing restricted pages
3. **Test college isolation** by switching between colleges
4. **Implement additional features** like password reset and email verification
