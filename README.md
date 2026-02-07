# RootWork Learning Hub

A comprehensive AI-powered learning platform with multi-tenancy support, trauma-informed tutoring, and adaptive assessments.

## Getting Started

### Prerequisites

- Node.js 20+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials and API keys:
   - `DATABASE_URL`: PostgreSQL connection string for the application
   - `DIRECT_URL`: Direct PostgreSQL connection for migrations
   - `CLERK_SECRET_KEY`: Clerk authentication secret
   - `ANTHROPIC_API_KEY`: Anthropic AI API key
   - Other required environment variables (see `.env.example`)

### Database Setup

#### Apply Migrations to a Fresh Database

To create the database schema and apply all migrations:

```bash
npm run db:migrate
```

This command will:
- Create a new migration if the schema has changed
- Apply all pending migrations to your database
- Generate the Prisma Client

**Note:** For a fresh database setup without creating a new migration, you can use:
```bash
npx prisma migrate deploy
```

Or to reset the database completely:
```bash
npx prisma migrate reset
```

#### Populate with Sample Data

To seed your database with sample data including demo tenant, school, educators, students, classes, standards, and learning content:

```bash
npm run db:seed
```

This will create:
- 1 Demo School District (tenant)
- 1 Roosevelt Middle School
- 1 Educator (Sarah Johnson)
- 3 Students (Alex Martinez, Jordan Lee, Taylor Smith)
- 1 7th Grade Mathematics class
- 4 Academic standards (Georgia Math standards)
- 2 Topics with learning objectives
- 2 Practice problems
- Reasoning move progress tracking for students

**Full Setup:** To set up a fresh database with schema and sample data:
```bash
npm run db:migrate
npm run db:seed
```

### Other Database Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Push schema changes directly to database (development only)
npm run db:push

# Open Prisma Studio to view/edit database
npm run db:studio
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm run test

# Run end-to-end tests
npm run test:e2e
```

## Project Structure

- `/src` - Application source code
  - `/app` - Next.js app router pages
  - `/components` - React components
  - `/lib` - Utility functions and configurations
  - `/stores` - Zustand state management
- `/prisma` - Database schema and seed files
  - `schema.prisma` - Prisma database schema
  - `seed.ts` - Database seeding script
- `/e2e` - End-to-end tests

## Features

- **Multi-tenancy**: Support for multiple school districts and schools
- **Role-based Access**: Student, Educator, Parent, School Admin, District Admin, Platform Admin
- **AI Tutoring**: Anthropic Claude-powered adaptive tutoring
- **5Rs Framework**: Root, Regulate, Reflect, Restore, Reconnect phases
- **Trauma-informed**: Regulation support and Calm Corner features
- **Curriculum Standards**: Aligned with Georgia, Common Core, and NGSS standards
- **IEP Accommodations**: Support for individual education plans
- **Progress Tracking**: Mastery-based learning progress
- **Thinking Assessment**: Critical thinking and creativity evaluation
- **Stripe Integration**: Subscription billing support

## License

Private - All Rights Reserved
