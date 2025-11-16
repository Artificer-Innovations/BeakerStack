# Architecture Documentation

## Project Overview

This is a monorepo template for a full-stack application with:

- **React Native iOS/Android mobile app**
- **React web application**
- **Supabase backend** (PostgreSQL, Auth, Storage, Edge Functions)

### Core Features

- Social authentication (Apple, Google)
- User profile management
- **40-60% code sharing between mobile and web** (components, hooks, business logic)
- Full local development environment
- Comprehensive testing (unit, integration, E2E)
- Production-ready CI/CD pipeline

### Key Architectural Decisions

1. **React for Web**
   - Enables significant code reuse with React Native mobile app
   - Shared components, hooks, validation, and business logic
   - Superior testing ecosystem (Jest + React Testing Library)
   - Better AI coding agent support
   - Single mental model across platforms

2. **Monorepo Structure**
   - All code in single repository for atomic changes
   - Shared package (`packages/shared/`) for cross-platform code
   - Consistent tooling and dependencies
   - Simplified CI/CD and deployment

3. **AWS S3 + CloudFront for Web Hosting**
   - Static site deployment
   - PR path-based routing (deploy.yourdomain.com/pr-123/)
   - Three-environment strategy: production, staging, and deploy (preview)
   - Cost-effective (~$3-5/month for small-medium traffic)
   - Full control over infrastructure
   - Excellent performance with CDN

4. **Supabase Three-Database Architecture**
   - **Production DB**: Real user data (main branch)
   - **Staging DB**: Integration testing (develop branch)
   - **PR Testing DB**: Shared database for all PR testing (feature branches)
   - Safe migration testing without affecting production/staging
   - Cost-effective: $50-75/month vs $100+/month for per-PR databases
   - See detailed explanation in "Supabase Three-Database Architecture" section

5. **Mobile Deployment: EAS Updates**
   - Fast OTA updates for PR testing (~2 min vs 20 min builds)
   - Full builds only for native code changes
   - Channel-based testing: pr-123, staging, production

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  apps/mobile   │  │   apps/web     │  │ packages/shared  │  │
│  │ (React Native) │  │    (React)     │  │  - components/   │  │
│  │                │  │                │  │  - hooks/        │  │
│  │ • iOS/Android  │  │ • Vite build   │  │  - validation/   │  │
│  │ • EAS updates  │  │ • S3 + CF      │  │  - types/        │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬─────────┘  │
│           │                   │                    │             │
│           └───────────────────┴────────────────────┘             │
│                               │                                  │
│                         40-60% code shared                       │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
           ┌────────────────────────────────────────┐
           │      SUPABASE (3 DATABASES)            │
           │                                        │
           │  ┌──────────────────────────────────┐ │
           │  │  LOCAL (Docker)                  │ │
           │  │  • Development only              │ │
           │  │  • $0/month                      │ │
           │  └──────────────────────────────────┘ │
           │                                        │
           │  ┌──────────────────────────────────┐ │
           │  │  PR TESTING (Shared)             │ │
           │  │  • All PRs share this            │ │
           │  │  • Reset to develop per PR       │ │
           │  │  • $0-25/month                   │ │
           │  └──────────────────────────────────┘ │
           │           ▲                            │
           │  ┌────────┴───────────────────────┐  │
           │  │  STAGING                       │  │
           │  │  • develop branch              │  │
           │  │  • Integration testing         │  │
           │  │  • $25/month                   │  │
           │  └────────┬───────────────────────┘  │
           │           ▼                            │
           │  ┌────────────────────────────────┐  │
           │  │  PRODUCTION                    │  │
           │  │  • main branch                 │  │
           │  │  • Real users                  │  │
           │  │  • $25/month                   │  │
           │  └────────────────────────────────┘  │
           └────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT TARGETS                            │
│                                                                  │
│  LOCAL:                                                          │
│  • http://localhost:19000 (mobile)                              │
│  • http://localhost:5173 (web)                                  │
│  • http://localhost:54321 (supabase)                            │
│                                                                  │
│  PR PREVIEWS (per PR):                                          │
│  • https://deploy.yourdomain.com/pr-123/ (web via S3+CloudFront) │
│  • EAS channel: pr-123 (mobile)                                │
│  • Shared PR Testing Database                                   │
│                                                                  │
│  STAGING:                                                        │
│  • https://staging.yourdomain.com (web via S3+CloudFront)      │
│  • EAS channel: staging (mobile)                               │
│  • Staging Database                                             │
│                                                                  │
│  PRODUCTION:                                                     │
│  • https://yourdomain.com (web via S3+CloudFront)              │
│  • App Store + Google Play (mobile)                            │
│  • Production Database                                          │
└──────────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
project-root/
├── .github/
│   └── workflows/
│       ├── test.yml                    # Run tests on all PRs
│       ├── pr-preview-environment.yml  # Deploy PR previews
│       ├── pr-cleanup.yml              # Cleanup on PR close
│       ├── deploy-staging.yml          # Auto-deploy to staging
│       └── deploy-production.yml       # Deploy to production
├── apps/
│   ├── mobile/                         # React Native app
│   │   ├── __tests__/                  # ⭐ Unit tests for mobile-specific code
│   │   │   ├── screens/
│   │   │   │   └── LoginScreen.test.tsx
│   │   │   ├── navigation/
│   │   │   │   └── AppNavigator.test.tsx
│   │   │   └── components/
│   │   │       └── MobileSpecificButton.test.tsx
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── mobile-specific/    # Mobile-only components
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   └── HomeScreen.tsx
│   │   │   ├── navigation/
│   │   │   │   ├── AppNavigator.tsx
│   │   │   │   └── AuthNavigator.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePlatformSpecific.ts
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts         # Supabase client config
│   │   │   │   └── storage.ts          # AsyncStorage helpers
│   │   │   ├── types/
│   │   │   │   ├── database.ts         # Generated from Supabase
│   │   │   │   └── navigation.ts
│   │   │   ├── utils/
│   │   │   │   └── platform-helpers.ts
│   │   │   └── App.tsx
│   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── jest.config.js
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                            # React web app
│       ├── __tests__/                  # ⭐ Unit tests for web-specific code
│       │   ├── pages/
│       │   │   └── LoginPage.test.tsx
│       │   ├── routing/
│       │   │   └── Router.test.tsx
│       │   └── components/
│       │       └── WebSpecificButton.test.tsx
│       ├── public/
│       │   ├── index.html
│       │   └── favicon.ico
│       ├── src/
│       │   ├── components/
│       │   │   └── web-specific/       # Web-only components
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── ProfilePage.tsx
│       │   │   └── HomePage.tsx
│       │   ├── hooks/
│       │   │   └── useWebSpecific.ts
│       │   ├── lib/
│       │   │   └── supabase.ts         # Supabase client config
│       │   ├── types/
│       │   │   └── database.ts         # Generated from Supabase
│       │   ├── utils/
│       │   │   └── web-helpers.ts
│       │   ├── App.tsx
│       │   └── index.tsx
│       ├── .eslintrc.js
│       ├── .prettierrc
│       ├── jest.config.js
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/                           # Shared packages
│   └── shared/
│       ├── __tests__/                  # ⭐ Unit tests for shared code
│       │   ├── components/
│       │   │   ├── Button.test.tsx
│       │   │   └── Avatar.test.tsx
│       │   ├── hooks/
│       │   │   ├── useAuth.test.ts
│       │   │   ├── useProfile.test.ts
│       │   │   └── useForm.test.ts
│       │   ├── validation/
│       │   │   └── schemas.test.ts
│       │   └── utils/
│       │       ├── formatters.test.ts
│       │       └── validators.test.ts
│       ├── src/
│       │   ├── components/             # ⭐ Shared React components
│       │   │   ├── auth/
│       │   │   │   └── SocialLoginButton.tsx
│       │   │   ├── forms/
│       │   │   │   ├── FormInput.tsx
│       │   │   │   ├── FormButton.tsx
│       │   │   │   └── FormError.tsx
│       │   │   ├── profile/
│       │   │   │   ├── ProfileHeader.tsx
│       │   │   │   └── ProfileStats.tsx
│       │   │   └── ui/
│       │   │       ├── Button.tsx
│       │   │       ├── Card.tsx
│       │   │       ├── Avatar.tsx
│       │   │       └── LoadingSpinner.tsx
│       │   ├── hooks/                  # ⭐ Shared React hooks
│       │   │   ├── useAuth.ts
│       │   │   ├── useProfile.ts
│       │   │   ├── useForm.ts
│       │   │   └── useSupabase.ts
│       │   ├── validation/
│       │   │   └── schemas.ts          # Shared validation schemas (Zod)
│       │   ├── types/
│       │   │   ├── user.ts             # Shared TypeScript types
│       │   │   └── database.ts         # Generated from Supabase
│       │   └── utils/
│       │       ├── formatters.ts       # Shared utility functions
│       │       ├── validators.ts
│       │       └── helpers.ts
│       ├── package.json
│       └── tsconfig.json
├── tests/                              # ⭐ Integration & E2E tests (centralized)
│   ├── e2e/
│   │   ├── web/                        # Web E2E flows
│   │   │   └── flows/
│   │   │       ├── login.yaml
│   │   │       ├── profile.yaml
│   │   │       ├── signup.yaml
│   │   │       └── settings.yaml
│   │   ├── mobile/                     # Mobile E2E flows
│   │   │   └── flows/
│   │   │       ├── login.yaml
│   │   │       ├── profile.yaml
│   │   │       ├── signup.yaml
│   │   │       └── settings.yaml
│   │   └── shared/                     # Shared E2E utilities
│   │       ├── helpers.ts
│   │       ├── fixtures.ts
│   │       └── test-data.ts
│   ├── integration/                    # Cross-system integration tests
│   │   ├── auth-flow.test.ts          # Tests web + mobile + database auth
│   │   ├── profile-sync.test.ts       # Tests data sync across platforms
│   │   ├── file-upload.test.ts        # Tests storage integration
│   │   └── realtime-updates.test.ts   # Tests real-time subscriptions
│   ├── utils/                          # Shared test utilities
│   │   ├── test-database.ts           # Database test helpers
│   │   ├── mock-supabase.ts           # Supabase mocks
│   │   ├── test-clients.ts            # Web/mobile client factories
│   │   └── test-helpers.ts            # Common test helpers
│   └── jest.config.js                  # Jest config for integration tests
├── supabase/
│   ├── functions/                      # Edge Functions
│   │   ├── _shared/                    # Shared function utilities
│   │   │   └── cors.ts
│   │   └── hello-world/
│   │       └── index.ts
│   ├── migrations/                     # Database migrations
│   │   ├── 20241018000001_initial_schema.sql
│   │   ├── 20241018000002_user_profiles.sql
│   │   └── 20241018000003_storage_policies.sql
│   ├── tests/                          # ⭐ Database tests (Supabase convention)
│   │   ├── user_profiles.test.sql
│   │   ├── rls_policies.test.sql
│   │   └── storage_policies.test.sql
│   ├── seed.sql                        # Test data seed
│   └── config.toml                     # Supabase local config
├── scripts/
│   ├── generate-types.sh               # Generate TS types from DB
│   ├── setup-local.sh                  # One-command local setup
│   ├── reset-pr-database.sh            # Reset PR testing database
│   ├── check-db-status.sh              # Check migrations across environments
│   └── run-e2e.sh                      # Run Maestro E2E tests
├── docs/
│   ├── ARCHITECTURE.md                 # This file
│   ├── DEVELOPMENT.md                  # Development guide
│   ├── DEPLOYMENT.md                   # Deployment guide
│   └── API.md                          # API documentation
├── .env.example                        # Environment variable template
├── .gitignore
├── .prettierrc                         # Root Prettier config
├── .eslintrc.js                        # Root ESLint config
├── package.json                        # Root package.json
├── tsconfig.json                       # Root TypeScript config
└── README.md
```

## Technology Stack

### Frontend - Mobile (React Native)

- **Framework**: React Native 0.73+
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + Hooks (or Zustand for complex state)
- **HTTP Client**: Supabase JS Client
- **Storage**: @react-native-async-storage/async-storage
- **Forms**: React Hook Form
- **Styling**: StyleSheet / NativeWind (Tailwind for RN)
- **Testing**: Jest + React Native Testing Library
- **E2E Testing**: Maestro
- **Build**: EAS Build (Expo) or React Native CLI

### Frontend - Web (React)

- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context + Hooks (or Zustand)
- **HTTP Client**: Supabase JS Client
- **Forms**: React Hook Form
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Maestro (with web support)

### Backend (Supabase)

- **Database**: PostgreSQL 15+
- **Auth**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage (S3-compatible)
- **Real-time**: Supabase Realtime (PostgreSQL CDC)
- **Functions**: Supabase Edge Functions (Deno)
- **API**: Auto-generated REST API + Realtime subscriptions

### Developer Tools

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged
- **Package Manager**: npm (or pnpm/yarn)
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions

## Supabase Three-Database Architecture

### Overview

This project uses **three separate Supabase database instances** to provide safe, cost-effective testing across different stages of development:

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL DEVELOPMENT                                               │
│ • Docker-based Supabase (via CLI)                              │
│ • Completely isolated on developer machine                     │
│ • Fast iteration, no cloud costs                               │
│ • supabase start / supabase stop                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTION DATABASE                                             │
│ • Linked to: main branch                                        │
│ • Real user data                                                │
│ • High stability, careful deployments only                      │
│ • Migrations applied via CI/CD on merge to main                │
│ • Used by: yourdomain.com + production mobile builds            │
│ • Supabase Pro Plan ($25/month)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STAGING DATABASE                                                │
│ • Linked to: develop branch                                     │
│ • Stable test environment for integration testing              │
│ • Migrations applied on merge to develop                        │
│ • Used by: staging.yourdomain.com + staging mobile channel      │
│ • Supabase Pro Plan ($25/month)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PR TESTING DATABASE (Shared Instance)                          │
│ • Shared by ALL pull requests                                  │
│ • Reset to develop state when PR with DB changes opens         │
│ • PR-specific migrations applied on top of develop             │
│ • Can be broken - that's the point!                            │
│ • Used by: deploy.yourdomain.com/pr-{number}/ + pr-{number} mobile │
│ • Supabase Pro Plan ($25/month) or Free Tier ($0)             │
└─────────────────────────────────────────────────────────────────┘

Total Cost: $75/month (or $50/month with Free tier for PR Testing)
```

### Why Three Databases?

**Advantages:**

- ✅ **Cost-effective**: Only 3 databases vs separate database per PR (~$25-75/month vs $100+/month)
- ✅ **Safe migration testing**: PR database can break without affecting staging/production
- ✅ **Clean slate**: Each PR starts from known develop state
- ✅ **Real migration testing**: Actually runs migrations, not just syntax checks
- ✅ **Solo-dev friendly**: Sequential PR testing is fine for one developer
- ✅ **Simple mental model**: Linear workflow matches typical solo dev process

**Trade-offs:**

- ⚠️ **Sequential PR testing**: Only one PR can test database changes at a time
  - **Mitigation**: As solo dev, you typically work on one feature at a time
  - **Workaround**: Use labels to control which PRs reset the database
- ⚠️ **Reset overhead**: Each PR deployment takes 2-3 minutes to reset database
  - **Acceptable**: Still faster than creating new database instances

### PR Database Reset Workflow

When a pull request is opened with database changes:

```
1. PR opened (labeled 'database-changes' or contains migrations)
   ↓
2. Checkout 'develop' branch
   ↓
3. Link Supabase CLI to PR Testing database
   ↓
4. Reset database: DROP all tables, reapply all migrations from develop
   ↓
5. Seed test data (from supabase/seed.sql)
   ↓
6. Checkout PR branch
   ↓
7. Apply PR-specific migrations on top of develop state
   ↓
8. Deploy Edge Functions
   ↓
9. Generate TypeScript types from updated schema
   ↓
10. Deploy web app (pointing to PR Testing database)
    ↓
11. Deploy mobile update (pointing to PR Testing database)
    ↓
12. Run E2E tests against deployed previews
    ↓
13. Comment on PR with preview URLs and database status
```

**Timeline**: ~5-7 minutes total (2-3 min DB reset, 2-3 min deploys, 1-2 min tests)

### Handling Multiple PRs

#### Scenario A: PRs Without Database Changes

**PR #123**: UI changes only, no migrations
**PR #124**: Bug fix, no migrations

**Behavior:**

- Both PRs deploy web/mobile independently
- Both use the current PR Testing database schema (whatever was last deployed)
- No database resets triggered
- Both can be tested simultaneously

#### Scenario B: One PR With Database Changes

**PR #123**: Feature with new table migration
**PR #124**: UI changes only

**Behavior:**

- PR #123 labeled 'database-changes' → Resets PR database, applies migration
- PR #124 (no label) → Uses PR #123's database schema
- Both can coexist using the same database

#### Scenario C: Multiple PRs With Database Changes (Conflict)

**PR #123**: Adds 'user_preferences' table
**PR #124**: Adds 'user_settings' table

**Problem:** Both PRs need different database schemas

**Solutions:**

**Option 1: Sequential Testing (Recommended)**

```
1. Test PR #123 first (resets DB, applies #123 migrations)
2. Merge PR #123 to develop
3. Test PR #124 (resets DB to develop with #123, applies #124 migrations)
4. Merge PR #124 to develop
```

**Option 2: Manual Reset Between PRs**

```
1. Test PR #123 (labeled 'database-changes')
2. Manually re-run PR #124 workflow to reset DB for #124
3. Test PR #124
4. If needed, manually re-run PR #123 workflow to switch back
```

**Option 3: Label-Based Control**

```yaml
# Only PRs labeled 'database-changes' trigger DB reset
# Unlabeled PRs use existing DB state
# Manually coordinate which PR gets the label
```

### Database State Inspection

Every PR deployment includes a link to Supabase Studio:

```
https://app.supabase.com/project/[pr-testing-ref]
```

You can:

- View current schema and tables
- Inspect data
- Run SQL queries manually
- Check RLS policies
- Monitor real-time connections
- Debug migration issues

### Migration Development Workflow

#### For Simple Migrations (New Columns, Indexes)

```bash
# 1. Develop locally
supabase start
supabase migration new add_user_bio

# Edit migration file
# supabase/migrations/20241018_add_user_bio.sql

# 2. Test locally
supabase db reset  # Apply all migrations

# 3. Push PR
git add supabase/migrations/
git commit -m "feat: add user bio field"
git push

# 4. CI automatically:
#    - Resets PR database
#    - Applies migration
#    - Deploys and tests
```

#### For Complex/Breaking Migrations

```bash
# 1. Create migration locally
supabase migration new refactor_user_profiles

# 2. Test locally with real data
supabase db reset
# Manually test app functionality

# 3. Add migration tests
# supabase/tests/user_profiles.test.sql

# 4. Push with label
git add supabase/migrations/
git commit -m "refactor: restructure user profiles"
git push

# 5. Add label 'database-changes' to PR

# 6. Review Supabase Studio after deployment
# - Check schema
# - Verify data integrity
# - Test RLS policies

# 7. If issues found:
#    - Fix migration
#    - Push again (auto-redeploys)
```

### Rollback Strategy

**Local Development:**

```bash
# Undo last migration
supabase migration repair --status reverted

# Reset to clean state
supabase db reset
```

**PR Testing Database:**

```bash
# Re-run PR workflow to reset
# Or manually trigger reset-pr-database workflow
```

**Staging/Production:**

```bash
# Create rollback migration
supabase migration new rollback_feature_x

# Write SQL to undo changes
# Test in PR database first
# Deploy via normal workflow
```

### Cost Optimization

**Free Tier for PR Testing:**

```
• $0/month
• 500MB database
• Pauses after 7 days of inactivity
• Wakes up in ~10 seconds when needed
• Perfect for PR testing!
```

**Pro Tier Benefits ($25/month each):**

```
• 8GB database
• No auto-pause
• Daily backups
• Better performance
• Support
```

**Recommended Setup:**

- Production: Pro ($25)
- Staging: Pro ($25)
- PR Testing: Free ($0) or Pro ($25)
- **Total: $50-75/month**

### Security Considerations

**Separate Credentials:**
Each database has its own:

- Project URL
- Anon key (safe for client-side)
- Service role key (server-side only, stored in GitHub Secrets)

**Row Level Security:**

- Enabled on all tables across all environments
- Policies tested in PR database before reaching production
- Service role key can bypass RLS for admin operations

**Data Isolation:**

- Production data never exposed to PR/staging
- Test data only in PR/staging databases
- Seed scripts create fake but realistic data

## Shared Component Strategy

### Goal: Maximum Code Reuse Between Mobile and Web

One of the primary benefits of using React for both mobile (React Native) and web is the ability to share components, hooks, and business logic. This monorepo is structured to maximize code reuse while maintaining platform-specific optimizations where necessary.

### What Can Be Shared (Target: 40-60% code reuse)

#### 1. Business Logic & Hooks (100% shareable)

**Location**: `packages/shared/src/hooks/`

These hooks work identically on both platforms:

```typescript
// packages/shared/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Platform-specific import
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
```

**Used in both apps**:

```typescript
// apps/mobile/src/screens/ProfileScreen.tsx
import { useAuth } from '@shared/hooks/useAuth';

// apps/web/src/pages/ProfilePage.tsx
import { useAuth } from '@shared/hooks/useAuth';
```

#### 2. Validation & Business Rules (100% shareable)

**Location**: `packages/shared/src/validation/`

```typescript
// packages/shared/src/validation/schemas.ts
import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  email: z.string().email('Invalid email address'),
});

export const avatarSchema = z.object({
  size: z.number().max(2 * 1024 * 1024, 'Image must be less than 2MB'),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
```

#### 3. TypeScript Types (100% shareable)

**Location**: `packages/shared/src/types/`

```typescript
// packages/shared/src/types/user.ts
export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}
```

#### 4. Utility Functions (100% shareable)

**Location**: `packages/shared/src/utils/`

```typescript
// packages/shared/src/utils/formatters.ts
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

#### 5. Presentational Components (60-80% shareable with platform adapters)

**Strategy A: Platform-Agnostic Components with Styled-Components or Emotion**

For components that are truly presentation-only, we can use a CSS-in-JS solution that works on both platforms:

```typescript
// packages/shared/src/components/ui/Button.tsx
import styled from 'styled-components/native'  // Works on both!

interface ButtonProps {
  onPress: () => void
  title: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

const StyledButton = styled.TouchableOpacity<{ variant: string }>`
  padding: 12px 24px;
  border-radius: 8px;
  background-color: ${props =>
    props.variant === 'primary' ? '#007AFF' : '#E5E5EA'
  };
  opacity: ${props => props.disabled ? 0.5 : 1};
`

const ButtonText = styled.Text<{ variant: string }>`
  color: ${props => props.variant === 'primary' ? '#FFFFFF' : '#000000'};
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`

export function Button({ onPress, title, variant = 'primary', disabled }: ButtonProps) {
  return (
    <StyledButton
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <ButtonText variant={variant}>{title}</ButtonText>
    </StyledButton>
  )
}
```

**Strategy B: Platform-Specific Implementations with Shared Props**

For components that need platform-specific styling or behavior:

```typescript
// packages/shared/src/components/profile/ProfileAvatar.tsx
import React from 'react';

export interface ProfileAvatarProps {
  url: string | null;
  size: number;
  name: string;
  onPress?: () => void;
}

// Implementation provided by each platform
export { ProfileAvatar } from './ProfileAvatar.native'; // or .web
```

```typescript
// packages/shared/src/components/profile/ProfileAvatar.native.tsx
import { Image, TouchableOpacity, Text, View } from 'react-native'
import type { ProfileAvatarProps } from './ProfileAvatar'

export function ProfileAvatar({ url, size, name, onPress }: ProfileAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <TouchableOpacity onPress={onPress}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#007AFF',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontSize: size / 2.5 }}>
            {initials}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
```

```typescript
// packages/shared/src/components/profile/ProfileAvatar.web.tsx
import type { ProfileAvatarProps } from './ProfileAvatar'
import './ProfileAvatar.css'

export function ProfileAvatar({ url, size, name, onPress }: ProfileAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <button
      className="profile-avatar"
      onClick={onPress}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name} />
      ) : (
        <div className="avatar-placeholder">
          {initials}
        </div>
      )}
    </button>
  )
}
```

#### 6. Smart/Container Components (80-90% shareable)

Components that handle data fetching and business logic can be almost entirely shared:

```typescript
// packages/shared/src/components/profile/ProfileEditor.tsx
import React, { useState } from 'react'
import { useProfile } from '@shared/hooks/useProfile'
import { profileSchema } from '@shared/validation/schemas'
import type { ProfileFormData } from '@shared/validation/schemas'

// UI components are platform-specific, but business logic is shared
import { FormInput, FormButton, FormError } from '../forms'

export function ProfileEditor() {
  const { profile, updateProfile, loading, error } = useProfile()
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    email: profile?.email || '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      // Validation logic - 100% shared
      const validated = profileSchema.parse(formData)

      // Business logic - 100% shared
      await updateProfile(validated)

      // Success handling - could be platform-specific
      alert('Profile updated successfully!')
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message)
      } else {
        setValidationError('Failed to update profile')
      }
    }
  }

  return (
    <>
      <FormInput
        label="Full Name"
        value={formData.full_name}
        onChangeText={(text) => setFormData({ ...formData, full_name: text })}
        error={validationError}
      />

      <FormInput
        label="Bio"
        value={formData.bio || ''}
        onChangeText={(text) => setFormData({ ...formData, bio: text })}
        multiline
      />

      {error && <FormError message={error.message} />}

      <FormButton
        title="Save Profile"
        onPress={handleSubmit}
        loading={loading}
      />
    </>
  )
}
```

### Component Sharing Strategy Decision Tree

```
Is it business logic only (hook, validation, util)?
  ├─ YES → 100% shared in packages/shared
  └─ NO → Continue...

Does it need platform-specific UI/UX?
  ├─ YES → Shared interface + platform implementations (.native.tsx / .web.tsx)
  └─ NO → Continue...

Can it use React Native primitives (View, Text, TouchableOpacity)?
  ├─ YES → Single implementation in packages/shared (works on both)
  └─ NO → Continue...

Is it a complex interaction (gestures, animations, native features)?
  ├─ YES → Platform-specific in apps/mobile and apps/web
  └─ NO → Shared with styled-components/native or Emotion
```

### Import Strategy

Each app configures path aliases to import from shared package:

```typescript
// apps/mobile/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"]
    }
  }
}

// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

## Helper Scripts

### Database Reset Script

**Location**: `scripts/reset-pr-database.sh`

This script safely resets the PR testing database to develop state:

```bash
#!/bin/bash
# scripts/reset-pr-database.sh

set -e

TARGET_BRANCH=${1:-develop}
PR_NUMBER=${2:-manual}

echo "🧹 Resetting PR testing database to '$TARGET_BRANCH' state..."
echo "⚠️  This will DROP ALL TABLES in the PR testing database!"
echo ""
echo "Press CTRL+C to cancel, or wait 5 seconds to continue..."
sleep 5

# Checkout target branch
echo "📥 Checking out $TARGET_BRANCH branch..."
git fetch origin
git checkout origin/$TARGET_BRANCH

# Link to PR testing database
echo "🔗 Linking to PR testing database..."
supabase link --project-ref $PR_TESTING_SUPABASE_PROJECT_REF

# Reset database
echo "🗑️  Dropping all tables and reapplying migrations..."
supabase db reset --linked

# Seed test data
echo "🌱 Seeding test data..."
supabase db seed --linked

# Generate types
echo "📝 Generating TypeScript types..."
supabase gen types typescript --linked > apps/mobile/src/types/database.ts
cp apps/mobile/src/types/database.ts apps/web/src/types/database.ts

echo ""
echo "✅ PR testing database reset complete!"
echo "📊 Database is now at '$TARGET_BRANCH' state"
echo "🎯 Ready for PR #$PR_NUMBER migrations (if applicable)"
echo ""
echo "Next steps:"
echo "  1. Checkout your PR branch: git checkout your-feature-branch"
echo "  2. Apply PR migrations: supabase db push"
echo "  3. Deploy your changes"
```

**Usage:**

```bash
# Reset to develop (default)
npm run db:reset:pr

# Reset to specific branch
./scripts/reset-pr-database.sh main

# Reset with PR number tracking
./scripts/reset-pr-database.sh develop 123
```

### Database Status Check Script

**Location**: `scripts/check-db-status.sh`

Check which migrations are applied across all environments:

```bash
#!/bin/bash
# scripts/check-db-status.sh

echo "📊 Checking database status across all environments..."
echo ""

echo "🏠 LOCAL:"
supabase link --project-ref local
supabase migration list
echo ""

echo "🧪 PR TESTING:"
supabase link --project-ref $PR_TESTING_SUPABASE_PROJECT_REF
supabase migration list
echo ""

echo "🎭 STAGING:"
supabase link --project-ref $STAGING_SUPABASE_PROJECT_REF
supabase migration list
echo ""

echo "🚀 PRODUCTION:"
supabase link --project-ref $PRODUCTION_SUPABASE_PROJECT_REF
supabase migration list
echo ""
```

### E2E Test Runner Script

**Location**: `scripts/run-e2e.sh`

Run E2E tests against deployed environments:

```bash
#!/bin/bash
# scripts/run-e2e.sh

set -e

ENVIRONMENT=${1:-pr}
PR_NUMBER=${2:-123}

echo "🧪 Running E2E tests..."

if [ "$ENVIRONMENT" = "pr" ]; then
  WEB_URL="https://deploy.yourdomain.com/pr-${PR_NUMBER}/"
  echo "Testing PR environment: $WEB_URL"
elif [ "$ENVIRONMENT" = "staging" ]; then
  WEB_URL="https://staging.yourdomain.com"
  echo "Testing staging environment: $WEB_URL"
elif [ "$ENVIRONMENT" = "production" ]; then
  WEB_URL="https://yourdomain.com"
  echo "Testing production environment: $WEB_URL"
else
  echo "Unknown environment: $ENVIRONMENT"
  exit 1
fi

echo ""
echo "🌐 Web E2E Tests:"
maestro test apps/web/e2e/flows/ --host $WEB_URL

echo ""
echo "📱 Mobile E2E Tests:"
echo "Note: Mobile tests require manual channel switching to '$ENVIRONMENT' or 'pr-$PR_NUMBER'"
# maestro test apps/mobile/e2e/flows/

echo ""
echo "✅ E2E tests complete!"
```

**Usage:**

```bash
# Test PR environment
./scripts/run-e2e.sh pr 123

# Test staging
./scripts/run-e2e.sh staging

# Test production
./scripts/run-e2e.sh production
```

Usage:

```typescript
// Both apps can import the same way
import { useAuth } from '@shared/hooks/useAuth';
import { ProfileEditor } from '@shared/components/profile/ProfileEditor';
import { profileSchema } from '@shared/validation/schemas';
```

### Shared Package Configuration

```json
// packages/shared/package.json
{
  "name": "@shared/components",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "react": "^18.2.0",
    "zod": "^3.22.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "peerDependencies": {
    "react-native": "*",
    "react": "^18.2.0"
  },
  "peerDependenciesMeta": {
    "react-native": {
      "optional": true
    }
  }
}
```

### Expected Code Reuse Breakdown

For a typical app:

- **Hooks**: 100% shared (~15% of codebase)
- **Validation**: 100% shared (~5% of codebase)
- **Types**: 100% shared (~5% of codebase)
- **Utils**: 100% shared (~10% of codebase)
- **Business logic**: 90% shared (~15% of codebase)
- **UI Components**: 30-50% shared (~50% of codebase)

**Total realistic code reuse: 40-60%**

### Testing Shared Components

Shared components should be tested once and work everywhere:

```typescript
// packages/shared/__tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';

describe('useAuth', () => {
  it('provides user after successful auth', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    // Wait for auth check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
  });
});
```

Tests run once, benefit both platforms.

## Database Schema

### Core Tables

#### `auth.users`

Managed by Supabase Auth. Contains:

- `id` (uuid, primary key)
- `email` (text)
- `created_at` (timestamp)
- Plus standard auth fields

#### `public.user_profiles`

Extended user information:

```sql
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Storage Buckets

#### `avatars`

User profile pictures:

- Public read access for avatar URLs
- Authenticated write access (own files only)
- Max file size: 2MB
- Allowed formats: image/jpeg, image/png, image/webp

```sql
-- Storage policy for avatars
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Authentication Flow

### Social Login (Apple & Google)

#### Mobile (React Native)

1. User taps "Sign in with Apple/Google"
2. Use native auth libraries:
   - iOS: `@invertase/react-native-apple-authentication`
   - Google: `@react-native-google-signin/google-signin`
3. Get identity token from provider
4. Send token to Supabase: `supabase.auth.signInWithIdToken()`
5. Supabase validates token and creates/updates user
6. Store session in AsyncStorage
7. Navigate to authenticated app

#### Web (React)

1. User clicks "Sign in with Apple/Google"
2. Call `supabase.auth.signInWithOAuth({ provider: 'apple' })`
3. Redirect to provider OAuth page
4. Provider redirects back with code
5. Supabase exchanges code for session
6. Store session in localStorage
7. Redirect to authenticated app

### Session Management

- Sessions stored securely (AsyncStorage on mobile, localStorage on web)
- Auto-refresh tokens before expiry
- Persistent sessions across app restarts
- Logout clears session and redirects to login

### Protected Routes/Screens

- Check `supabase.auth.getSession()` on app mount
- Use `useAuth()` hook to access current user
- Redirect unauthenticated users to login
- Show loading state during session check

## Application State Management

### Authentication State

```typescript
// hooks/useAuth.ts
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

### Profile State

```typescript
// hooks/useProfile.ts
interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File | Blob) => Promise<string>;
}
```

## API Layer

### Supabase Client Configuration

#### Mobile (`apps/mobile/src/lib/supabase.ts`)

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### Web (`apps/web/src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

## Testing Strategy

### Testing Philosophy

This project uses a **hybrid testing approach** that balances industry best practices with practical organization:

1. **Unit tests are colocated** with the code they test (industry standard)
2. **Integration and E2E tests are centralized** in `tests/` (they test the whole system)
3. **Database tests follow Supabase convention** in `supabase/tests/` (required by tooling)

**Rationale:**

- Unit tests benefit from proximity to source code (shorter imports, clear ownership)
- System-level tests (E2E, integration) don't belong to one app - they test everything together
- A solo developer can easily find all E2E tests in one place: `tests/e2e/`
- Clear separation between "test this function" vs "test this user flow across web + mobile + database"

### Where Tests Live (Decision Matrix)

Use this decision tree to determine where a test should live:

```
Is it testing a single function/component in isolation?
├─ YES → Unit test (colocated with code)
│   ├─ Mobile-specific? → apps/mobile/__tests__/
│   ├─ Web-specific? → apps/web/__tests__/
│   └─ Shared code? → packages/shared/__tests__/
│
└─ NO → Continue...

Is it testing multiple systems working together?
├─ YES → Integration test
│   └─ tests/integration/
│
└─ NO → Continue...

Is it testing end-to-end user flows?
├─ YES → E2E test
│   ├─ Web flows? → tests/e2e/web/
│   └─ Mobile flows? → tests/e2e/mobile/
│
└─ NO → Continue...

Is it testing database logic (RLS, triggers, functions)?
└─ YES → Database test
    └─ supabase/tests/
```

**Examples:**

| Test Description                                     | Location                                               | Type        |
| ---------------------------------------------------- | ------------------------------------------------------ | ----------- |
| Button component renders correctly                   | `packages/shared/__tests__/components/Button.test.tsx` | Unit        |
| useAuth hook returns user after login                | `packages/shared/__tests__/hooks/useAuth.test.ts`      | Unit        |
| LoginScreen displays error on invalid input          | `apps/mobile/__tests__/screens/LoginScreen.test.tsx`   | Unit        |
| Profile form validation logic                        | `apps/web/__tests__/components/ProfileForm.test.tsx`   | Unit        |
| User updates profile on mobile, appears on web       | `tests/integration/profile-sync.test.ts`               | Integration |
| File uploaded on web, downloadable on mobile         | `tests/integration/file-upload.test.ts`                | Integration |
| Complete signup flow on web                          | `tests/e2e/web/flows/signup.yaml`                      | E2E         |
| User can login and navigate to profile (mobile)      | `tests/e2e/mobile/flows/login.yaml`                    | E2E         |
| RLS policy prevents user from reading other profiles | `supabase/tests/rls_policies.test.sql`                 | Database    |

### Test Organization

```
Unit Tests (Colocated with Code)
├── apps/mobile/__tests__/          → Mobile-specific component/screen tests
├── apps/web/__tests__/             → Web-specific component/page tests
└── packages/shared/__tests__/      → Shared component/hook/util tests

Integration Tests (Centralized)
└── tests/integration/              → Cross-platform integration tests

E2E Tests (Centralized)
├── tests/e2e/web/                  → Web user flow tests
├── tests/e2e/mobile/               → Mobile user flow tests
└── tests/e2e/shared/               → Shared E2E utilities

Database Tests (Supabase Convention)
└── supabase/tests/                 → SQL-based database tests
```

### Unit Tests (Jest + React Testing Library)

**Location**: Colocated with source code in `__tests__/` directories

**What to test**:

- Component rendering and props
- Hook logic (useAuth, useProfile, etc.)
- Utility functions
- Form validation
- Data transformations
- Platform-specific logic

**Example structure**:

```typescript
// packages/shared/__tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';

describe('useAuth', () => {
  it('returns user after successful auth', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles sign out correctly', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
  });
});
```

```typescript
// apps/mobile/__tests__/screens/LoginScreen.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { LoginScreen } from '../../src/screens/LoginScreen'

describe('LoginScreen', () => {
  it('renders login buttons', () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText('Sign in with Google')).toBeTruthy()
    expect(getByText('Sign in with Apple')).toBeTruthy()
  })

  it('calls onPress when button tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <LoginScreen onGooglePress={onPress} />
    )
    fireEvent.press(getByText('Sign in with Google'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

**Run commands**:

```bash
# Run all unit tests
npm run test:unit

# Run unit tests for specific app
npm run test:unit:mobile
npm run test:unit:web
npm run test:unit:shared

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Integration Tests (Jest)

**Location**: `tests/integration/`

**What to test**:

- Cross-platform data synchronization
- Auth flows that span web + mobile + database
- File upload/download across platforms
- Real-time updates between clients
- Complex business logic involving multiple systems

**Example**:

```typescript
// tests/integration/profile-sync.test.ts
import { createClient } from '@supabase/supabase-js';
import {
  PR_TESTING_SUPABASE_URL,
  PR_TESTING_SUPABASE_ANON_KEY,
} from './utils/test-clients';

describe('Profile sync across platforms', () => {
  let webClient: ReturnType<typeof createClient>;
  let mobileClient: ReturnType<typeof createClient>;

  beforeEach(() => {
    webClient = createClient(
      PR_TESTING_SUPABASE_URL,
      PR_TESTING_SUPABASE_ANON_KEY
    );
    mobileClient = createClient(
      PR_TESTING_SUPABASE_URL,
      PR_TESTING_SUPABASE_ANON_KEY
    );
  });

  it('should sync profile updates from web to mobile', async () => {
    // Sign in on both platforms
    await webClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password',
    });
    await mobileClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password',
    });

    // Update profile on web
    const { error } = await webClient
      .from('user_profiles')
      .update({ bio: 'New bio from web' })
      .eq('id', webClient.auth.user()?.id);

    expect(error).toBeNull();

    // Wait for real-time sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify update visible on mobile
    const { data } = await mobileClient
      .from('user_profiles')
      .select('bio')
      .eq('id', mobileClient.auth.user()?.id)
      .single();

    expect(data?.bio).toBe('New bio from web');
  });

  it('should handle file uploads across platforms', async () => {
    // Upload avatar on mobile
    const file = new Blob(['test'], { type: 'image/png' });
    const { data: uploadData } = await mobileClient.storage
      .from('avatars')
      .upload(`${userId}/avatar.png`, file);

    expect(uploadData).toBeDefined();

    // Verify accessible from web
    const { data: downloadData } = await webClient.storage
      .from('avatars')
      .download(`${userId}/avatar.png`);

    expect(downloadData).toBeDefined();
  });
});
```

**Run command**: `npm run test:integration`

### Database Tests (pgTAP / Supabase Test)

**Location**: `supabase/tests/`

**What to test**:

- Row Level Security (RLS) policies
- Database triggers and functions
- Table constraints and relationships
- Edge Function logic

**Example**:

```sql
-- supabase/tests/user_profiles.test.sql
BEGIN;
SELECT plan(5);

-- Setup: Create test user
SELECT tests.create_supabase_user('test_user', 'test@example.com');
SELECT tests.authenticate_as('test_user');

-- Test 1: Users can insert their own profile
INSERT INTO user_profiles (id, full_name)
VALUES (tests.get_supabase_uid('test_user'), 'Test User');

SELECT ok(
  (SELECT COUNT(*) FROM user_profiles WHERE id = tests.get_supabase_uid('test_user')) = 1,
  'User can insert own profile'
);

-- Test 2: Users can read their own profile
SELECT is(
  (SELECT full_name FROM user_profiles WHERE id = tests.get_supabase_uid('test_user')),
  'Test User',
  'User can read own profile'
);

-- Test 3: Users can update their own profile
UPDATE user_profiles SET bio = 'New bio' WHERE id = tests.get_supabase_uid('test_user');

SELECT is(
  (SELECT bio FROM user_profiles WHERE id = tests.get_supabase_uid('test_user')),
  'New bio',
  'User can update own profile'
);

-- Test 4: Users cannot read other profiles (RLS policy test)
SELECT tests.create_supabase_user('other_user', 'other@example.com');
INSERT INTO user_profiles (id, full_name)
VALUES (tests.get_supabase_uid('other_user'), 'Other User');

SELECT tests.authenticate_as('test_user');

SELECT is(
  (SELECT COUNT(*) FROM user_profiles WHERE id = tests.get_supabase_uid('other_user')),
  0::bigint,
  'User cannot read other user profiles'
);

-- Test 5: Users cannot update other profiles
SELECT throws_ok(
  $UPDATE user_profiles SET bio = 'Hacked' WHERE id != auth.uid()$,
  'User cannot update other profiles'
);

SELECT * FROM finish();
ROLLBACK;
```

**Run command**: `npm run test:db`

### E2E Tests (Maestro)

**Location**: `tests/e2e/`

#### Web E2E Tests

**Location**: `tests/e2e/web/flows/`

**What to test**: Complete user flows on web application

**Example**:

```yaml
# tests/e2e/web/flows/login.yaml
appId: https://deploy.yourdomain.com/pr-123/
---
# Test: User can login with Google
- launchApp
- assertVisible: 'Sign in with Google'
- tapOn: 'Sign in with Google'
- assertVisible: 'Welcome*'
- takeScreenshot: after-google-login

# Test: User profile displays correctly
- tapOn: 'Profile'
- assertVisible: 'Your Profile'
- assertVisible: 'test@example.com'
- takeScreenshot: profile-page

# Test: User can update profile
- tapOn: 'Edit Profile'
- inputText: 'New Bio Here'
- tapOn: 'Save'
- assertVisible: 'Profile updated'
- takeScreenshot: after-profile-update
```

```yaml
# tests/e2e/web/flows/profile.yaml
appId: https://deploy.yourdomain.com/pr-123/
---
# Test: Profile form validation
- launchApp
- tapOn: 'Profile'
- tapOn: 'Edit Profile'
- clearText: 'Full Name'
- tapOn: 'Save'
- assertVisible: 'Name is required'
- takeScreenshot: validation-error

# Test: Profile photo upload
- tapOn: 'Change Photo'
- tapOn: 'Choose File'
# Note: File upload in Maestro requires special handling
- assertVisible: 'Photo uploaded'
```

#### Mobile E2E Tests

**Location**: `tests/e2e/mobile/flows/`

**What to test**: Complete user flows on mobile application

**Example**:

```yaml
# tests/e2e/mobile/flows/login.yaml
appId: com.yourapp.mobile
---
# Test: User can login with Apple
- launchApp
- assertVisible: 'Sign in with Apple'
- tapOn: 'Sign in with Apple'
- assertVisible: 'Welcome*'
- takeScreenshot: after-apple-login

# Test: Navigation works
- tapOn: 'Profile'
- assertVisible: 'Your Profile'
- swipeUp
- assertVisible: 'Settings'
```

**Run commands**:

```bash
# Run all E2E tests
npm run test:e2e

# Run web E2E tests only
npm run test:e2e:web

# Run mobile E2E tests only
npm run test:e2e:mobile

# Run E2E tests against specific environment
./scripts/run-e2e.sh pr 123          # PR preview
./scripts/run-e2e.sh staging         # Staging
./scripts/run-e2e.sh production      # Production
```

### Test Coverage Requirements

- **Unit tests**: Minimum 70% coverage for:
  - Shared components and hooks
  - Utility functions
  - Business logic
- **Integration tests**: All critical cross-platform flows:
  - Authentication
  - Profile management
  - File uploads
  - Real-time synchronization
- **Database tests**: 100% of RLS policies must be tested
- **E2E tests**: Critical user journeys:
  - Login/logout
  - Profile creation and updates
  - Core user flows

### CI/CD Test Execution

#### Test Workflow (on every PR)

**File**: `.github/workflows/test.yml`

```yaml
name: Test

on:
  pull_request:
  push:
    branches: [develop, main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Format check
        run: npm run format:check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: |
            ./apps/mobile/coverage/coverage-final.json
            ./apps/web/coverage/coverage-final.json
            ./packages/shared/coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

      - name: Stop Supabase
        if: always()
        run: supabase stop

  database-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Run database tests
        run: npm run test:db

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

#### E2E Tests (after PR preview deployment)

```yaml
# Part of .github/workflows/pr-preview-environment.yml

jobs:
  # ... previous jobs (reset DB, deploy web/mobile) ...

  test-e2e-web:
    needs: deploy-web-preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Run web E2E tests
        run: |
          maestro test tests/e2e/web/flows/ \
            --host https://deploy.yourdomain.com/pr-${{ github.event.pull_request.number }}/

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-web-screenshots
          path: tests/e2e/web/screenshots/

  test-e2e-mobile:
    needs: deploy-mobile-preview
    runs-on: macos-latest # Required for iOS simulator
    if: contains(github.event.pull_request.labels.*.name, 'test-mobile-e2e')
    steps:
      - uses: actions/checkout@v3

      - name: Setup Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Setup iOS Simulator
        run: |
          xcrun simctl boot "iPhone 14"

      - name: Install app on simulator
        run: |
          # Install app via EAS or local build

      - name: Run mobile E2E tests
        run: maestro test tests/e2e/mobile/flows/

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-mobile-screenshots
          path: tests/e2e/mobile/screenshots/
```

#### On Merge to Develop (Staging)

```yaml
jobs:
  test-staging:
    - Run smoke tests on staging environment
    - Run critical E2E flows
    - Verify migrations applied correctly
```

#### On Merge to Main (Production)

```yaml
jobs:
  test-production:
    - Run smoke tests on production
    - Monitor error rates
    - Verify critical flows work
```

### Test Data Management

**Local Development:**

```sql
-- supabase/seed.sql
INSERT INTO user_profiles (id, full_name, bio) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User', 'This is a test user'),
  ('00000000-0000-0000-0000-000000000002', 'Demo User', 'This is a demo user');
```

**PR Testing Database:**

- Reset to develop state
- Apply seed data
- Each PR starts with clean, predictable data

**Staging Database:**

- Persistent test data
- Can be manually refreshed from seed script
- Represents realistic production-like data

**Production Database:**

- Real user data
- Never use for testing
- Regular backups

### Testing Best Practices

1. **Write tests alongside code**: When creating a component, create its test
2. **Test behavior, not implementation**: Focus on what the user sees/does
3. **Use descriptive test names**: "should display error when email is invalid"
4. **Keep tests isolated**: Each test should work independently
5. **Mock external dependencies**: Mock Supabase in unit tests, use real DB in integration tests
6. **Use test fixtures**: Shared test data in `tests/e2e/shared/fixtures.ts`
7. **Clean up after tests**: Reset state, close connections
8. **Run tests before committing**: Use pre-commit hooks

## Local Development Environment

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for Supabase local)
- Supabase CLI: `npm install -g supabase`
- React Native development environment (Xcode for iOS, Android Studio for Android)
- Maestro CLI: `curl -Ls https://get.maestro.mobile.dev | bash`

### First-Time Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd <project-name>

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your local Supabase credentials

# 4. Start Supabase local
supabase start

# This outputs:
#   API URL: http://localhost:54321
#   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#   Studio URL: http://localhost:54323
#   anon key: eyJ...
#   service_role key: eyJ...

# 5. Copy the anon key to .env.local
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=<paste-anon-key>

# 6. Generate TypeScript types from database
npm run gen:types

# 7. Start mobile app
cd apps/mobile
npm install
npm run ios  # or npm run android

# 8. Start web app (in another terminal)
cd apps/web
npm install
npm run dev
```

### Setup Script

**Location**: `scripts/setup-local.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Setting up local development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup Supabase
echo "🗄️  Starting Supabase..."
supabase start

# Generate types
echo "📝 Generating TypeScript types..."
npm run gen:types

# Setup mobile
echo "📱 Setting up mobile app..."
cd apps/mobile && npm install && cd ../..

# Setup web
echo "🌐 Setting up web app..."
cd apps/web && npm install && cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env.local and fill in values"
echo "  2. Run 'npm run mobile' to start mobile app"
echo "  3. Run 'npm run web' to start web app"
```

### Daily Development Workflow

```bash
# Morning: Start all services
npm run dev:all  # Starts Supabase + Mobile + Web

# Or individually:
supabase start                  # Start Supabase
npm run mobile                  # Start React Native
npm run web                     # Start web dev server

# Run tests while developing
npm run test:watch              # Watch mode for unit tests

# Check code quality
npm run lint                    # ESLint
npm run type-check              # TypeScript
npm run format                  # Prettier

# Generate types after schema changes
npm run gen:types

# Evening: Stop services
supabase stop
```

## Git Workflow

### Branch Strategy

```
main (protected)
  ↑
  │ PR with reviews
  │
develop (protected)
  ↑
  │ PR after testing
  │
feature/user-authentication
feature/profile-page
bugfix/login-redirect
hotfix/auth-token-expiry
```

### Branch Naming Convention

- **Features**: `feature/short-description`
- **Bug fixes**: `bugfix/short-description`
- **Hotfixes**: `hotfix/short-description`
- **Chores**: `chore/short-description`

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or tooling changes

**Examples**:

```bash
git commit -m "feat(auth): add Apple Sign-In support"
git commit -m "fix(profile): correct avatar upload validation"
git commit -m "docs: update setup instructions in README"
```

### Pull Request Process

1. **Create feature branch**:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create PR**:

   ```bash
   git push origin feature/my-feature
   # Create PR on GitHub targeting 'develop'
   ```

4. **PR requirements** (enforced by CI):
   - ✅ All tests pass
   - ✅ Linting passes
   - ✅ Type checking passes
   - ✅ No merge conflicts
   - ✅ Code review approved (if team size > 1)

5. **Merge**:
   - Use "Squash and merge" for feature branches
   - Delete branch after merge

## CI/CD Pipeline

### Test Workflow

**File**: `.github/workflows/test.yml`

**Triggers**:

- All pull requests
- Push to `develop` or `main`

**Jobs**:

1. **Lint & Type Check**
   - Run ESLint on all apps and packages
   - Run TypeScript compiler in strict mode
   - Run Prettier check
   - **Duration**: ~2-3 minutes

2. **Unit Tests**
   - Run Jest tests for mobile (`apps/mobile/__tests__/`)
   - Run Jest tests for web (`apps/web/__tests__/`)
   - Run Jest tests for shared (`packages/shared/__tests__/`)
   - Upload coverage reports
   - **Duration**: ~3-5 minutes

3. **Integration Tests**
   - Start Supabase local
   - Run cross-platform integration tests (`tests/integration/`)
   - **Duration**: ~3-5 minutes

4. **Database Tests (Local)**
   - Start Supabase local
   - Run migration tests (`supabase/tests/`)
   - Run RLS policy tests
   - No cloud database needed
   - **Duration**: ~2-3 minutes

### PR Preview Environment

**File**: `.github/workflows/pr-preview-environment.yml`

**Triggers**: Pull request opened, synchronized, or reopened

**Jobs**:

1. **Reset PR Testing Database** (conditional)
   - Only runs if PR labeled 'database-changes' OR contains migration files
   - Checkout develop branch
   - Link to PR Testing Supabase database
   - Execute `supabase db reset --linked` (drops all tables)
   - Reapply all migrations from develop branch
   - Seed test data
   - **Duration**: ~2-3 minutes

2. **Apply PR Migrations**
   - Checkout PR branch
   - Link to PR Testing database
   - Apply PR-specific migrations with `supabase db push`
   - Deploy Edge Functions
   - Generate TypeScript types from updated schema
   - Upload types as artifact for web/mobile builds
   - **Duration**: ~1-2 minutes

3. **Deploy Web Preview**
   - Download database types artifact
   - Build React app with Vite (with `VITE_BASE_PATH=/pr-{number}`)
   - Point to PR Testing Supabase (via env vars)
   - Deploy to S3: `s3://deploy-bucket/pr-{number}/`
   - Invalidate CloudFront cache for `/pr-{number}/*`
   - **Duration**: ~2-3 minutes
   - **Result**: https://deploy.yourdomain.com/pr-{number}/

4. **Deploy Mobile Preview**
   - Download database types artifact
   - Publish EAS update to channel `pr-{number}`
   - Point to PR Testing Supabase (via env vars)
   - **Duration**: ~2-3 minutes
   - **Result**: EAS channel `pr-{number}`

5. **Run E2E Tests - Web**
   - Run Maestro flows against deployed preview (`tests/e2e/web/flows/`)
   - Test with PR Testing database
   - Upload test results and screenshots
   - **Duration**: ~3-5 minutes

6. **Run E2E Tests - Mobile** (optional, can be expensive)
   - Build app with EAS
   - Run Maestro flows (`tests/e2e/mobile/flows/`)
   - Test with PR Testing database
   - Upload screenshots

7. **Comment PR with Preview URLs**
   - Post comment with:
     - Web preview URL
     - Mobile channel instructions
     - Supabase Studio link
     - Database state information
     - Warning about shared database

**Total Duration**: ~10-15 minutes for full PR preview deployment

**Example PR Comment:**

```markdown
## 🚀 PR Preview Environment Ready!

### 🌐 Web Application

**URL:** https://deploy.yourdomain.com/pr-123/

### 📱 Mobile Application

**Channel:** `pr-123`

**To test on mobile:**

1. Open app on your device
2. Shake device → Dev Menu
3. Extensions → Branch: `pr-123`
4. Reload app

### 🗄️ Database

**Environment:** PR Testing (shared)
**State:** Reset to `develop` + PR migrations applied
**Supabase Studio:** [View Database](https://app.supabase.com/project/zzz)

**Migrations Applied:**

- `20241018_add_user_bio.sql`

### ⚠️ Important Notes

- This PR is using the **shared PR testing database**
- Database was reset to `develop` state before applying your migrations
- If another PR with database changes is opened, this database may be reset
- To re-deploy, close and reopen this PR (or push new commit)

### 🧪 Test Results

- ✅ Web E2E tests: 15/15 passed
- ✅ Mobile build: Success

---

_Updates automatically with new commits_
```

### PR Cleanup Workflow

**File**: `.github/workflows/pr-cleanup.yml`

**Trigger**: Pull request closed

**Jobs**:

1. **Cleanup Web Deployment**
   - Delete S3 folder: `s3://bucket/pr-{number}/`
   - Invalidate CloudFront cache

2. **Cleanup Mobile Channel** (optional)
   - EAS channels persist, can be cleaned up manually
   - Or use EAS CLI to delete channel

3. **Note on Database**
   - PR Testing database is NOT reset on PR close
   - Remains in last PR's state until next PR with DB changes
   - Can manually reset via workflow_dispatch if needed

### Staging Deployment

**File**: `.github/workflows/deploy-staging.yml`

**Trigger**: Push to `develop` branch

**Jobs**:

1. **Deploy Database**
   - Link to staging Supabase project
   - Push migrations: `supabase db push`
   - Deploy Edge Functions: `supabase functions deploy`

2. **Deploy Mobile** (if using EAS)
   - Build iOS/Android staging builds
   - Upload to TestFlight/Internal Testing
   - Notify team via Slack/Discord

3. **Deploy Web**
   - Build production bundle
   - Deploy to Vercel/Netlify staging environment
   - Update environment variables

### Production Deployment

**File**: `.github/workflows/deploy-production.yml`

**Trigger**: Push to `main` branch (or manual workflow dispatch)

**Pre-deployment Checklist** (enforced by PR template):

- [ ] All staging tests passed
- [ ] Migration tested on staging for 24+ hours
- [ ] Database backup verified
- [ ] Rollback plan documented
- [ ] Team notified

**Jobs**:

1. **Backup Production Database**
   - Create timestamped database dump
   - Upload to S3 backup bucket
   - Verify backup integrity
   - **Critical**: Do not proceed without successful backup

2. **Deploy Production Database**
   - Link to Production Supabase project
   - Push migrations: `supabase db push`
   - Deploy Edge Functions: `supabase functions deploy`
   - Monitor for errors
   - **Duration**: ~2-3 minutes

3. **Deploy Production Mobile**
   - Build full production iOS/Android builds with EAS
   - Point to Production Supabase database
   - Upload to App Store Connect / Google Play Console
   - Create GitHub release with build info
   - **Duration**: ~20-30 minutes

4. **Deploy Production Web**
   - Build optimized production bundle
   - Point to Production Supabase database
   - Deploy to S3: `s3://bucket/production/` (root domain)
   - Invalidate CloudFront cache globally
   - Create GitHub release
   - **Duration**: ~2-3 minutes

5. **Post-Deployment Monitoring**
   - Monitor error rates for 30 minutes
   - Check Supabase logs
   - Verify web app health
   - Monitor mobile crash reports

6. **Notify Team**
   - Slack/Discord notification with deployment summary
   - Include links to releases
   - Note any manual steps needed

**Rollback Procedure:**
If issues detected:

1. Revert main branch commit
2. Re-run deployment workflow
3. Or: Restore database from backup
4. Redeploy previous version

## Web Application Deployment (S3 + CloudFront)

### Three-Environment Hosting Strategy

The web application uses a **three-environment hosting strategy** with separate S3 buckets and CloudFront distributions:

1. **Production** (`beakerstack.com` / `www.beakerstack.com`)
   - S3 bucket: `beakerstack.com-prod`
   - CloudFront distribution: Serves from bucket root
   - Deployment: On merge to `main` branch
   - Uses production Supabase database

2. **Staging** (`staging.beakerstack.com`)
   - S3 bucket: `beakerstack.com-staging`
   - CloudFront distribution: Serves from bucket root
   - Deployment: On merge to `develop` branch
   - Uses staging Supabase database

3. **Deploy/Preview** (`deploy.beakerstack.com`)
   - S3 bucket: `beakerstack.com-deploy`
   - CloudFront distribution: Uses path-based routing via CloudFront Function
   - **Path-based PR previews**: Each PR deploys to `/pr-{number}/` path prefix
   - Example: `https://deploy.beakerstack.com/pr-123/`
   - Deployment: On PR open/update
   - Uses shared PR testing Supabase database

**Why Path-Based Routing Instead of Subdomains?**

- **OAuth compatibility**: Single domain (`deploy.beakerstack.com`) works better with Google OAuth and Supabase auth configurations
- **Simpler DNS**: No need for wildcard DNS records (`*.beakerstack.com`)
- **Single certificate**: One SSL certificate covers all preview environments
- **Better for ephemeral environments**: Easier to clean up (just delete S3 prefix)

**How Path-Based Routing Works:**

1. Each PR build sets `VITE_BASE_PATH=/pr-{number}` during build
2. React Router uses this base path via `BrowserRouter basename`
3. Assets are uploaded to S3 at `s3://deploy-bucket/pr-{number}/`
4. CloudFront Function (`PRPathRouter.js`) maps incoming `/pr-{number}/*` requests to S3 prefix `pr-{number}/*`
5. SPA fallback: Routes like `/pr-123/dashboard` serve `pr-123/index.html` (handled by CloudFront Function)

### Build Output

React (with Vite) builds to static files:

```bash
cd apps/web
npm run build

# Output: apps/web/dist/
# ├── index.html
# ├── assets/
# │   ├── index-[hash].js      # Main JS bundle
# │   ├── index-[hash].css      # Styles
# │   ├── vendor-[hash].js      # Third-party code
# │   └── [images/fonts]        # Static assets
```

### AWS Infrastructure Setup

#### S3 Bucket Configuration

**Create and configure bucket**:

```bash
# Create bucket
aws s3 mb s3://your-app-web-production

# Enable static website hosting
aws s3 website s3://your-app-web-production \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for CloudFront access
aws s3api put-bucket-policy --bucket your-app-web-production --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "CloudFrontAccess",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR-OAI-ID"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-app-web-production/*"
  }]
}'
```

#### CloudFront Distribution Setup

**Critical configuration for SPA routing**:

```json
{
  "DistributionConfig": {
    "Origins": [
      {
        "Id": "S3-your-app-web",
        "DomainName": "your-app-web-production.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/YOUR-OAI-ID"
        }
      }
    ],
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-your-app-web",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    },
    "CustomErrorResponses": [
      {
        "ErrorCode": 403,
        "ResponseCode": 200,
        "ResponsePagePath": "/index.html",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 404,
        "ResponseCode": 200,
        "ResponsePagePath": "/index.html",
        "ErrorCachingMinTTL": 300
      }
    ],
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
      "AcmCertificateArn": "arn:aws:acm:us-east-1:...",
      "SslSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }
  }
}
```

**Why the error responses matter**: React Router uses client-side routing. When a user visits `/profile` directly, S3 returns 404 (no such file). CloudFront intercepts this and serves `index.html` instead, then React Router handles the route client-side.

### React Router Configuration

Use `BrowserRouter` with `basename` support for path-based PR previews:

```typescript
// apps/web/src/main.tsx
import { BrowserRouter } from 'react-router-dom'

// Get base path from environment variable (e.g., /pr-123 or / for prod/staging)
const basePath = import.meta.env.VITE_BASE_PATH || '/'

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter basename={basePath}>
    <App />
  </BrowserRouter>
)
```

**Why `basename` is needed:**

- **Production/Staging**: `basename="/"` (served from root)
- **PR Previews**: `basename="/pr-123"` (served from `/pr-123/` path)
- React Router uses this to handle client-side routing correctly for each environment

### Vite Configuration for Optimal Deployment

```typescript
// apps/web/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Respect VITE_BASE_PATH for asset URLs (defaults to '/' for local/prod/staging)
  const basePath = env.VITE_BASE_PATH || '/';

  return {
    base: basePath, // This ensures assets are served from the correct base path
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true, // For error tracking
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor splitting for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
```

**Base Path Configuration:**

- **Production/Staging**: `VITE_BASE_PATH` not set (defaults to `/`)
- **PR Previews**: `VITE_BASE_PATH=/pr-{number}` (set during build)
- Vite uses this to rewrite asset URLs (e.g., `/assets/` → `/pr-123/assets/`)
- HTML plugin also transforms absolute paths in `index.html` to respect base path

### Deployment Script

**Manual deployment**:

```bash
#!/bin/bash
# scripts/deploy-web.sh

set -e

ENV=${1:-production}
BUCKET="your-app-web-${ENV}"
DISTRIBUTION_ID="${ENV}_CLOUDFRONT_ID"

echo "🚀 Deploying web app to ${ENV}..."

# Build
cd apps/web
npm run build

# Upload to S3
echo "📦 Uploading to S3..."
aws s3 sync dist/ s3://${BUCKET} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# index.html should not be cached
aws s3 cp dist/index.html s3://${BUCKET}/index.html \
  --cache-control "public, max-age=0, must-revalidate"

# Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"

echo "✅ Deployment complete!"
echo "🌐 URL: https://your-domain.com"
```

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy-web-production.yml
name: Deploy Web to Production

on:
  push:
    branches: [main]
  workflow_dispatch: # Allow manual triggers

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        working-directory: apps/web
        run: npm ci

      - name: Build application
        working-directory: apps/web
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.PRODUCTION_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PRODUCTION_SUPABASE_ANON_KEY }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          # Upload assets with long cache
          aws s3 sync apps/web/dist/ s3://${{ secrets.PRODUCTION_S3_BUCKET }} \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"

          # Upload index.html with no cache
          aws s3 cp apps/web/dist/index.html s3://${{ secrets.PRODUCTION_S3_BUCKET }}/index.html \
            --cache-control "public, max-age=0, must-revalidate"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

      - name: Create deployment notification
        run: |
          echo "✅ Web app deployed successfully!"
          echo "🌐 URL: https://your-domain.com"
```

### Cost Estimation (AWS S3 + CloudFront)

**Monthly costs for a typical small app**:

- **S3 Storage**: ~$0.023/GB → ~$0.50/month for 20GB
- **S3 Requests**: ~$0.0004/1000 requests → ~$0.10/month for 250k requests
- **CloudFront Transfer**: ~$0.085/GB for first 10TB → ~$2.00/month for 25GB
- **CloudFront Requests**: ~$0.0075/10,000 requests → ~$0.20/month for 250k requests

**Total: ~$3-5/month for small to medium traffic**

Scales linearly with usage. Much cheaper than managed hosting platforms.

### Domain Configuration

**Route 53 (or your DNS provider)**:

```
Type: A (Alias)
Name: your-domain.com
Value: [CloudFront Distribution Domain]

Type: AAAA (Alias)
Name: your-domain.com
Value: [CloudFront Distribution Domain]
```

### Security Best Practices

1. **HTTPS Only**: Enforce via CloudFront viewer protocol policy
2. **CORS**: Configure in `apps/web/public/_headers` if needed
3. **CSP Headers**: Add via CloudFront Functions for security
4. **Origin Access Identity**: Use OAI to prevent direct S3 access

### Monitoring

**CloudWatch Metrics**:

- CloudFront cache hit rate (target: >80%)
- 4xx/5xx error rates
- Request volume
- Data transfer

**Set up alarms**:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## Environment Configuration

### Environment Variables

#### Local Development (`.env.local`)

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OAuth (for local testing)
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id
```

#### Mobile App (`.env`)

```bash
# Expo/React Native
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
EXPO_PUBLIC_APPLE_CLIENT_ID=
```

#### Web App (`.env`)

```bash
# Vite
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_APPLE_CLIENT_ID=
```

#### GitHub Secrets (for CI/CD)

```
# Supabase - Production
PRODUCTION_SUPABASE_URL
PRODUCTION_SUPABASE_ANON_KEY
PRODUCTION_SUPABASE_SERVICE_ROLE_KEY
PRODUCTION_SUPABASE_PROJECT_REF

# Supabase - Staging
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_SERVICE_ROLE_KEY
STAGING_SUPABASE_PROJECT_REF

# Supabase - PR Testing (shared for all PRs)
PR_TESTING_SUPABASE_URL
PR_TESTING_SUPABASE_ANON_KEY
PR_TESTING_SUPABASE_SERVICE_ROLE_KEY
PR_TESTING_SUPABASE_PROJECT_REF

# Supabase Access Token (for CLI operations)
SUPABASE_ACCESS_TOKEN

# AWS (for web deployment)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
WEB_BUCKET                              # S3 bucket name
CLOUDFRONT_DISTRIBUTION_ID              # For PR previews
STAGING_S3_BUCKET                       # Staging web bucket
STAGING_CLOUDFRONT_DISTRIBUTION_ID
PRODUCTION_S3_BUCKET                    # Production web bucket
PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID
BACKUP_BUCKET                           # For database backups

# OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_CLIENT_SECRET

# EAS (Expo Application Services)
EXPO_TOKEN                              # For mobile deployments
```

## Package Scripts

### Root `package.json`

```json
{
  "scripts": {
    "mobile": "cd apps/mobile && npm start",
    "web": "cd apps/web && npm run dev",
    "dev:supabase": "supabase start",
    "dev:all": "concurrently \"npm run dev:supabase\" \"npm run mobile\" \"npm run web\"",

    "gen:types": "supabase gen types typescript --local > apps/mobile/src/types/database.ts && cp apps/mobile/src/types/database.ts apps/web/src/types/database.ts",
    "gen:types:staging": "supabase gen types typescript --project-id $STAGING_PROJECT_REF > apps/mobile/src/types/database.ts && cp apps/mobile/src/types/database.ts apps/web/src/types/database.ts",

    "test": "npm run test:unit && npm run test:integration && npm run test:db",
    "test:all": "npm run test && npm run test:e2e",
    "test:unit": "npm run test:unit:mobile && npm run test:unit:web && npm run test:unit:shared",
    "test:unit:mobile": "cd apps/mobile && npm test",
    "test:unit:web": "cd apps/web && npm test",
    "test:unit:shared": "cd packages/shared && npm test",
    "test:integration": "jest --config tests/jest.config.js --testMatch='**/tests/integration/**/*.test.ts'",
    "test:db": "supabase test db",
    "test:e2e": "npm run test:e2e:web && npm run test:e2e:mobile",
    "test:e2e:web": "maestro test tests/e2e/web/flows/",
    "test:e2e:mobile": "maestro test tests/e2e/mobile/flows/",
    "test:watch": "concurrently \"cd apps/mobile && npm run test:watch\" \"cd apps/web && npm run test:watch\" \"cd packages/shared && npm run test:watch\"",
    "test:coverage": "npm run test:unit -- --coverage",

    "lint": "npm run lint:mobile && npm run lint:web && npm run lint:shared",
    "lint:mobile": "cd apps/mobile && npm run lint",
    "lint:web": "cd apps/web && npm run lint",
    "lint:shared": "cd packages/shared && npm run lint",
    "lint:fix": "npm run lint:mobile -- --fix && npm run lint:web -- --fix && npm run lint:shared -- --fix",

    "type-check": "npm run type-check:mobile && npm run type-check:web && npm run type-check:shared",
    "type-check:mobile": "cd apps/mobile && npx tsc --noEmit",
    "type-check:web": "cd apps/web && npx tsc --noEmit",
    "type-check:shared": "cd packages/shared && npx tsc --noEmit",

    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",

    "db:link:local": "supabase link --project-ref local",
    "db:link:pr": "supabase link --project-ref $PR_TESTING_SUPABASE_PROJECT_REF",
    "db:link:staging": "supabase link --project-ref $STAGING_SUPABASE_PROJECT_REF",
    "db:link:production": "supabase link --project-ref $PRODUCTION_SUPABASE_PROJECT_REF",
    "db:reset:pr": "./scripts/reset-pr-database.sh",
    "db:status": "supabase db status",
    "db:diff": "supabase db diff",

    "migration:new": "supabase migration new",
    "migration:up": "supabase migration up",
    "migration:list": "supabase migration list",

    "setup": "./scripts/setup-local.sh",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist apps/*/build",
    "clean:all": "npm run clean && supabase stop && docker system prune -f"
  }
}
```

## Code Quality & Standards

### ESLint Configuration

- TypeScript recommended rules
- React/React Native specific rules
- Import order enforcement
- Unused variable detection
- Consistent code style

### Prettier Configuration

- Single quotes
- 2-space indentation
- Trailing commas
- Semi-colons required
- 80-character line width

### TypeScript Configuration

- Strict mode enabled
- No implicit any
- Strict null checks
- No unused locals/parameters
- Path aliases (@/ for src)

### Pre-commit Hooks (Husky + lint-staged)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check && npm test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Performance Considerations

### Mobile App

- **Image optimization**: Use react-native-fast-image for caching
- **List virtualization**: Use FlatList for long lists
- **Bundle size**: Monitor JS bundle size, code-split if needed
- **Navigation**: Use React Navigation native stack for performance
- **State updates**: Minimize re-renders with React.memo and useMemo

### Web App

- **Code splitting**: Dynamic imports for routes
- **Image optimization**: WebP format, lazy loading
- **Bundle analysis**: Use vite-bundle-analyzer
- **Caching**: Service worker for offline support
- **CSS**: Tailwind purge for minimal CSS bundle

### Backend

- **Database indexes**: Index frequently queried columns
- **RLS optimization**: Keep policies simple and indexed
- **Connection pooling**: Use Supabase connection pooler
- **Edge Functions**: Keep cold start time low (<100ms)

## Security Considerations

### Authentication

- Never store sensitive tokens in code
- Use secure storage (AsyncStorage on mobile, httpOnly cookies on web)
- Implement token refresh logic
- Handle expired sessions gracefully

### Database

- All tables must have RLS enabled
- Policies should be restrictive by default
- Never expose service role key to clients
- Validate all inputs server-side (Edge Functions)

### Storage

- Restrict file upload sizes
- Validate file types server-side
- Scan uploaded files for malware (if handling user uploads)
- Use signed URLs for sensitive files

### API Keys

- Never commit API keys to repository
- Use environment variables
- Rotate keys regularly
- Use separate keys for each environment

## Monitoring & Logging

### Supabase Dashboard

- Monitor API usage
- Track database performance
- Review auth logs
- Check storage usage

### Application Logging

- Use structured logging (JSON)
- Log errors with context
- Track user actions (with privacy in mind)
- Monitor crash rates

### Alerts

- Set up budget alerts in Supabase
- Monitor error rates in CI/CD
- Track deployment failures
- Alert on security issues

## Deployment Checklist

### Before Opening PR

- [ ] All tests pass locally
- [ ] Code follows style guide (linted and formatted)
- [ ] Database migrations tested locally with `supabase db reset`
- [ ] Types generated and committed if schema changed
- [ ] If PR changes database: Add label 'database-changes'

### Before Merging PR to Develop

- [ ] PR review completed
- [ ] All CI checks pass (tests, linting, type checking)
- [ ] PR preview environment tested manually
- [ ] E2E tests pass on PR preview
- [ ] Database migrations verified in Supabase Studio
- [ ] No merge conflicts with develop
- [ ] Breaking changes documented

### Before Deploying to Staging (Automatic on merge to develop)

- [ ] Code merged to develop branch
- [ ] Staging deployment workflow completed successfully
- [ ] Staging environment smoke tested
- [ ] Migration applied correctly (check Supabase Studio)

### Before Deploying to Production

- [ ] All staging tests pass
- [ ] Features tested on staging for 24+ hours minimum
- [ ] Migration tested on staging without issues
- [ ] Database backup verified and accessible
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] No critical bugs in staging
- [ ] Mobile builds submitted to stores (if needed)
- [ ] Release notes prepared

### After Deploying to Production

- [ ] Monitor error rates for 30 minutes
- [ ] Check Supabase logs for issues
- [ ] Verify web app health and performance
- [ ] Monitor mobile crash reports
- [ ] Verify migrations applied correctly
- [ ] Test critical user flows manually
- [ ] Update documentation if needed
- [ ] Announce deployment to team/users

## Future Enhancements

### Potential Features to Add

- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Offline sync capability
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Analytics (PostHog, Mixpanel)
- [ ] Error tracking (Sentry)
- [ ] Feature flags (LaunchDarkly)
- [ ] A/B testing

### Scalability Considerations

- Consider database sharding if user base grows >100k
- Implement Redis caching layer for high-traffic endpoints
- Use CDN for static assets
- Consider separate read replicas for analytics

## Support & Resources

### Documentation Links

- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Docs](https://react.dev/)
- [Maestro Docs](https://maestro.mobile.dev/)

### Internal Documentation

- See `docs/DEVELOPMENT.md` for detailed development guide
- See `docs/DEPLOYMENT.md` for deployment procedures
- See `docs/API.md` for API endpoint documentation

### Getting Help

- Check existing GitHub issues
- Review PR discussions
- Consult architecture decision records (ADRs)
- Reach out to team lead

## Quick Reference: Shared vs Platform-Specific

### 100% Shared (Write Once, Use Everywhere)

- ✅ Business logic hooks (`useAuth`, `useProfile`, etc.)
- ✅ Data validation schemas (Zod)
- ✅ TypeScript types and interfaces
- ✅ Utility functions (formatters, helpers)
- ✅ API client configuration patterns
- ✅ Form validation logic
- ✅ State management patterns

### 60-80% Shared (Shared Interface, Platform Adapters)

- ✅ Smart/container components (business logic)
- ✅ Presentational components (with styled-components/native)
- ⚠️ Platform-specific UI implementations when needed

### Platform-Specific (Separate Implementations)

- ❌ Navigation structure (React Navigation vs React Router)
- ❌ Platform-specific features (camera, permissions, etc.)
- ❌ Native module integrations
- ❌ Build configurations
- ❌ Deployment pipelines (App Store vs S3/CloudFront)
- ❌ Deep linking implementations
- ❌ Push notification handlers

## Quick Reference: Database Environments

### Local Development

```bash
# Start local Supabase
supabase start

# Create migration
supabase migration new feature_name

# Test migration
supabase db reset

# Generate types
npm run gen:types
```

**URL**: http://localhost:54321  
**Studio**: http://localhost:54323  
**Cost**: Free (runs in Docker)  
**Data**: Seeded test data, reset anytime

### PR Testing Database (Shared)

```bash
# Link to PR database
npm run db:link:pr

# Check status
npm run db:status

# Reset to develop
npm run db:reset:pr

# Generate types from PR DB
npm run gen:types:staging
```

**URL**: `$PR_TESTING_SUPABASE_URL`  
**Studio**: https://app.supabase.com/project/[pr-ref]  
**Cost**: $0 (Free tier) or $25/month (Pro)  
**Data**: Seeded test data, reset per PR with DB changes  
**Usage**: All PR previews share this database

### Staging Database

```bash
# Link to staging
npm run db:link:staging

# Push migrations (via CI/CD on merge to develop)
supabase db push

# Generate types
npm run gen:types:staging
```

**URL**: `$STAGING_SUPABASE_URL`  
**Studio**: https://app.supabase.com/project/[staging-ref]  
**Cost**: $25/month (Pro)  
**Data**: Test data that persists  
**Usage**: staging.yourdomain.com + staging mobile channel

### Production Database

```bash
# Link to production
npm run db:link:production

# NEVER push directly - only via CI/CD
# Check status only
npm run db:status
```

**URL**: `$PRODUCTION_SUPABASE_URL`  
**Studio**: https://app.supabase.com/project/[prod-ref]  
**Cost**: $25/month (Pro)  
**Data**: Real user data - handle with care!  
**Usage**: yourdomain.com + production mobile builds

### Database Environment Matrix

| Environment    | Branch     | Auto-Deploy    | Usage               | Can Break?          |
| -------------- | ---------- | -------------- | ------------------- | ------------------- |
| **Local**      | Any        | No             | Development         | ✅ Yes              |
| **PR Testing** | feature/\* | Yes (on PR)    | Testing PRs         | ✅ Yes              |
| **Staging**    | develop    | Yes (on merge) | Integration testing | ⚠️ Should be stable |
| **Production** | main       | Yes (on merge) | Real users          | ❌ Never!           |

### Typical Development Flow

```
1. Start local development
   └─> supabase start
   └─> Create migration locally
   └─> Test with supabase db reset
   └─> Commit migration

2. Open PR
   └─> Add label 'database-changes' (if migration exists)
   └─> CI resets PR Testing DB to develop
   └─> CI applies PR migration
   └─> CI deploys web/mobile pointing to PR Testing DB
   └─> Test at https://deploy.yourdomain.com/pr-123/

3. Merge to develop
   └─> CI applies migration to Staging DB
   └─> CI deploys staging environment
   └─> Test at staging.yourdomain.com

4. Merge to main
   └─> CI backs up Production DB
   └─> CI applies migration to Production DB
   └─> CI deploys production
   └─> Monitor for issues
```

### Example: Building a New Feature

**Step 1**: Start with shared code

```typescript
// packages/shared/src/hooks/useFeature.ts
export function useFeature() {
  /* business logic */
}

// packages/shared/src/validation/feature.ts
export const featureSchema = z.object({
  /* validation */
});

// packages/shared/src/types/feature.ts
export interface Feature {
  /* types */
}
```

**Step 2**: Create shared components where possible

```typescript
// packages/shared/src/components/feature/FeatureCard.tsx
export function FeatureCard({ data }: { data: Feature }) {
  const { handleAction } = useFeature()
  return (/* shared UI logic */)
}
```

**Step 3**: Add platform-specific screens/pages

```typescript
// apps/mobile/src/screens/FeatureScreen.tsx
export function FeatureScreen() {
  return <FeatureCard data={data} />  // Uses shared component
}

// apps/web/src/pages/FeaturePage.tsx
export function FeaturePage() {
  return <FeatureCard data={data} />  // Same shared component
}
```

**Result**: ~60% of code written once, works on both platforms.

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-10-18  
**Maintained By**: Development Team
