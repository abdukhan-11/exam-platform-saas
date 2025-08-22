# Database Setup Guide

## PostgreSQL Database Setup

This guide covers setting up PostgreSQL for the Exam SaaS application.

## Option 1: Local PostgreSQL Setup

### Prerequisites
- Windows: Download and install from https://www.postgresql.org/download/windows/
- macOS: `brew install postgresql`
- Linux: `sudo apt-get install postgresql postgresql-contrib`

### Setup Steps
1. Install PostgreSQL
2. Create a new database:
   ```sql
   CREATE DATABASE exam_saas;
   ```
3. Create a user (optional):
   ```sql
   CREATE USER exam_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE exam_saas TO exam_user;
   ```

### Local Connection String
```
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/exam_saas"
```

## Option 2: Remote PostgreSQL Setup (Recommended for Development)

### Railway (Free Tier)
1. Go to https://railway.app/
2. Sign up with GitHub
3. Create a new project
4. Add PostgreSQL service
5. Copy the connection string from the Connect tab

### Other Options
- **Supabase**: Free tier with generous limits
- **Neon**: Serverless PostgreSQL
- **Heroku Postgres**: Free tier available

## Environment Configuration

1. Copy `.env.example` to `.env`
2. Update `DATABASE_URL` with your connection string
3. Set other environment variables as needed

## Running Migrations

After setting up the database:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio
```

## Troubleshooting

### Common Issues
1. **Connection refused**: Check if PostgreSQL is running
2. **Authentication failed**: Verify username/password
3. **Database doesn't exist**: Create the database first
4. **Port conflicts**: Check if port 5432 is available

### Testing Connection
```bash
npx prisma db pull
npx prisma validate
```
