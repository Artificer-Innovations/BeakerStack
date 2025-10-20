# MVP Development Tasks

This document contains granular, step-by-step tasks to build the MVP based on the architecture defined in ARCHITECTURE.md. Each task is designed to be:

- **Incredibly small and testable** - has both unit tests and manual tests
- **Clear start and end** - well-defined scope and completion criteria
- **Single concern** - focuses on one specific functionality
- **Sequential** - can be completed one at a time with testing in between

## Phase 1: Project Foundation & Setup

### DONE - Task 1.1: Initialize Monorepo Structure
**Goal**: Create the basic monorepo structure with package.json files
**Scope**: Root package.json, workspace configuration, basic scripts
**Tests**:
- Unit: `npm run test` should run without errors
- Manual: `npm install` should install all dependencies successfully

**Deliverables**:
- Root `package.json` with workspace configuration
- Basic npm scripts for development
- `.gitignore` file
- `README.md` with setup instructions

---

### DONE - Task 1.2: Setup Shared Package
**Goal**: Create the shared package structure for cross-platform code
**Scope**: Basic package structure, TypeScript config, initial exports
**Tests**:
- Unit: `cd packages/shared && npm test` should pass
- Manual: `npm run type-check:shared` should pass

**Deliverables**:
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts` (empty exports)
- Basic Jest configuration

---

### DONE - Task 1.3: Setup Web App Foundation
**Goal**: Create React web app with Vite, TypeScript, and basic routing
**Scope**: Vite config, React setup, basic routing structure
**Tests**:
- Unit: `cd apps/web && npm test` should pass
- Manual: `npm run web` should start dev server on port 5173

**Deliverables**:
- `apps/web/package.json` with React, Vite, TypeScript dependencies
- `apps/web/vite.config.ts` with path aliases
- `apps/web/tsconfig.json`
- `apps/web/src/App.tsx` with basic routing
- `apps/web/src/index.tsx` entry point
- `apps/web/public/index.html`

---

### Task 1.4: Setup Mobile App Foundation
**Goal**: Create React Native app with Expo, TypeScript, and basic navigation
**Scope**: Expo config, React Native setup, basic navigation structure
**Tests**:
- Unit: `cd apps/mobile && npm test` should pass
- Manual: `npm run mobile` should start Expo dev server

**Deliverables**:
- `apps/mobile/package.json` with React Native, Expo dependencies
- `apps/mobile/app.json` Expo configuration
- `apps/mobile/tsconfig.json`
- `apps/mobile/src/App.tsx` with basic navigation
- `apps/mobile/babel.config.js`
- `apps/mobile/metro.config.js`

---

### Task 1.5: Setup Supabase Local Environment
**Goal**: Configure Supabase for local development with Docker
**Scope**: Supabase CLI setup, local database, basic configuration
**Tests**:
- Unit: `supabase status` should show all services running
- Manual: Access Supabase Studio at http://localhost:54323

**Deliverables**:
- `supabase/config.toml` configuration file
- `supabase/seed.sql` with basic test data
- Working local Supabase instance
- Environment variables setup

---

## Phase 2: Database Schema & Types

### Task 2.1: Create Initial Database Schema
**Goal**: Set up basic user profiles table with RLS policies
**Scope**: User profiles table, RLS policies, basic constraints
**Tests**:
- Unit: `supabase test db` should pass
- Manual: Can create/read/update user profile in Supabase Studio

**Deliverables**:
- `supabase/migrations/20241018000001_initial_schema.sql`
- `supabase/migrations/20241018000002_user_profiles.sql`
- RLS policies for user_profiles table
- Database tests in `supabase/tests/`

---

### Task 2.2: Generate TypeScript Types
**Goal**: Generate TypeScript types from database schema
**Scope**: Type generation script, type exports, integration with apps
**Tests**:
- Unit: Generated types should compile without errors
- Manual: `npm run gen:types` should update type files

**Deliverables**:
- `scripts/generate-types.sh`
- `apps/mobile/src/types/database.ts`
- `apps/web/src/types/database.ts`
- `packages/shared/src/types/database.ts`
- npm script for type generation

---

### Task 2.3: Setup Supabase Client Configuration
**Goal**: Configure Supabase clients for both web and mobile apps
**Scope**: Client setup, environment variables, type safety
**Tests**:
- Unit: Supabase client should connect successfully
- Manual: Can make basic query to database from both apps

**Deliverables**:
- `apps/mobile/src/lib/supabase.ts`
- `apps/web/src/lib/supabase.ts`
- Environment variable configuration
- Type-safe database client setup

---

## Phase 3: Authentication Foundation

### Task 3.1: Create Shared Auth Hook
**Goal**: Build useAuth hook that works on both platforms
**Scope**: Authentication state management, session handling
**Tests**:
- Unit: `useAuth` hook should manage auth state correctly
- Manual: Hook should return loading/user/session states

**Deliverables**:
- `packages/shared/src/hooks/useAuth.ts`
- `packages/shared/__tests__/hooks/useAuth.test.ts`
- Auth state interface and types
- Session persistence logic

---

### Task 3.2: Create Auth Context Provider
**Goal**: Provide authentication context to both apps
**Scope**: React context for auth state, provider component
**Tests**:
- Unit: Auth context should provide user state to children
- Manual: Components should access auth state via context

**Deliverables**:
- `packages/shared/src/contexts/AuthContext.tsx`
- `packages/shared/__tests__/contexts/AuthContext.test.tsx`
- Auth provider component
- Context hook for consuming auth state

---

### Task 3.3: Implement Web Authentication
**Goal**: Add Google/Apple sign-in to web app
**Scope**: OAuth integration, redirect handling, session management
**Tests**:
- Unit: Auth functions should handle OAuth flow correctly
- Manual: Can sign in with Google/Apple on web app

**Deliverables**:
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/components/auth/SocialLoginButton.tsx`
- OAuth configuration
- Redirect handling after authentication

---

### Task 3.4: Implement Mobile Authentication
**Goal**: Add Google/Apple sign-in to mobile app
**Scope**: Native auth libraries, token handling, session storage
**Tests**:
- Unit: Auth functions should handle native auth correctly
- Manual: Can sign in with Google/Apple on mobile app

**Deliverables**:
- `apps/mobile/src/screens/LoginScreen.tsx`
- `apps/mobile/src/components/auth/SocialLoginButton.tsx`
- Native auth library integration
- AsyncStorage session management

---

### Task 3.5: Create Protected Route Components
**Goal**: Build components to protect authenticated routes
**Scope**: Route protection, loading states, redirect logic
**Tests**:
- Unit: Protected routes should redirect unauthenticated users
- Manual: Unauthenticated users should be redirected to login

**Deliverables**:
- `packages/shared/src/components/auth/ProtectedRoute.tsx`
- `packages/shared/__tests__/components/auth/ProtectedRoute.test.tsx`
- Route protection logic
- Loading and redirect states

---

## Phase 4: User Profile Management

### Task 4.1: Create Profile Hook
**Goal**: Build useProfile hook for profile data management
**Scope**: Profile CRUD operations, loading states, error handling
**Tests**:
- Unit: Profile hook should handle CRUD operations correctly
- Manual: Can create, read, update profile data

**Deliverables**:
- `packages/shared/src/hooks/useProfile.ts`
- `packages/shared/__tests__/hooks/useProfile.test.ts`
- Profile data interface
- CRUD operation functions

---

### Task 4.2: Create Profile Validation Schema
**Goal**: Set up Zod validation for profile data
**Scope**: Validation rules, error messages, type inference
**Tests**:
- Unit: Validation should catch invalid profile data
- Manual: Form should show validation errors for invalid input

**Deliverables**:
- `packages/shared/src/validation/profileSchema.ts`
- `packages/shared/__tests__/validation/profileSchema.test.ts`
- Validation rules for all profile fields
- Type-safe form data interface

---

### Task 4.3: Create Shared Form Components
**Goal**: Build reusable form components for both platforms
**Scope**: Form inputs, buttons, error display, validation integration
**Tests**:
- Unit: Form components should handle input and validation correctly
- Manual: Forms should work identically on web and mobile

**Deliverables**:
- `packages/shared/src/components/forms/FormInput.tsx`
- `packages/shared/src/components/forms/FormButton.tsx`
- `packages/shared/src/components/forms/FormError.tsx`
- `packages/shared/__tests__/components/forms/` test files

---

### Task 4.4: Create Profile Editor Component
**Goal**: Build profile editing form that works on both platforms
**Scope**: Form logic, validation, submission, error handling
**Tests**:
- Unit: Profile editor should validate and submit data correctly
- Manual: Can edit and save profile on both web and mobile

**Deliverables**:
- `packages/shared/src/components/profile/ProfileEditor.tsx`
- `packages/shared/__tests__/components/profile/ProfileEditor.test.tsx`
- Form state management
- Integration with useProfile hook

---

### Task 4.5: Create Profile Display Components
**Goal**: Build components to display user profile information
**Scope**: Profile header, stats, avatar display
**Tests**:
- Unit: Profile display should render user data correctly
- Manual: Profile should display correctly on both platforms

**Deliverables**:
- `packages/shared/src/components/profile/ProfileHeader.tsx`
- `packages/shared/src/components/profile/ProfileStats.tsx`
- `packages/shared/src/components/profile/ProfileAvatar.tsx`
- `packages/shared/__tests__/components/profile/` test files

---

## Phase 5: Platform-Specific Screens/Pages

### Task 5.1: Create Web Profile Page
**Goal**: Build profile page for web app using shared components
**Scope**: Page layout, routing, component integration
**Tests**:
- Unit: Profile page should render without errors
- Manual: Can navigate to profile page and see user data

**Deliverables**:
- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/__tests__/pages/ProfilePage.test.tsx`
- Page routing configuration
- Integration with shared components

---

### Task 5.2: Create Mobile Profile Screen
**Goal**: Build profile screen for mobile app using shared components
**Scope**: Screen layout, navigation, component integration
**Tests**:
- Unit: Profile screen should render without errors
- Manual: Can navigate to profile screen and see user data

**Deliverables**:
- `apps/mobile/src/screens/ProfileScreen.tsx`
- `apps/mobile/__tests__/screens/ProfileScreen.test.tsx`
- Screen navigation configuration
- Integration with shared components

---

### Task 5.3: Create Web Home Page
**Goal**: Build home page for web app with navigation
**Scope**: Page layout, navigation menu, basic content
**Tests**:
- Unit: Home page should render without errors
- Manual: Can navigate between pages on web app

**Deliverables**:
- `apps/web/src/pages/HomePage.tsx`
- `apps/web/__tests__/pages/HomePage.test.tsx`
- Navigation component
- Basic page content

---

### Task 5.4: Create Mobile Home Screen
**Goal**: Build home screen for mobile app with navigation
**Scope**: Screen layout, tab navigation, basic content
**Tests**:
- Unit: Home screen should render without errors
- Manual: Can navigate between screens on mobile app

**Deliverables**:
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/__tests__/screens/HomeScreen.test.tsx`
- Tab navigation setup
- Basic screen content

---

## Phase 6: Avatar Upload & Storage

### Task 6.1: Setup Storage Bucket Configuration
**Goal**: Configure Supabase storage for avatar uploads
**Scope**: Storage bucket setup, policies, file size limits
**Tests**:
- Unit: Storage policies should allow authenticated uploads
- Manual: Can upload files to storage bucket via Supabase Studio

**Deliverables**:
- `supabase/migrations/20241018000003_storage_policies.sql`
- Storage bucket configuration
- RLS policies for file access
- File size and type restrictions

---

### Task 6.2: Create Avatar Upload Hook
**Goal**: Build hook for handling avatar uploads
**Scope**: File upload logic, progress tracking, error handling
**Tests**:
- Unit: Upload hook should handle file uploads correctly
- Manual: Can upload avatar image and get URL back

**Deliverables**:
- `packages/shared/src/hooks/useAvatarUpload.ts`
- `packages/shared/__tests__/hooks/useAvatarUpload.test.ts`
- File upload logic
- Progress and error state management

---

### Task 6.3: Create Avatar Upload Component
**Goal**: Build avatar upload component for both platforms
**Scope**: File picker, upload progress, preview, error handling
**Tests**:
- Unit: Avatar upload component should handle file selection and upload
- Manual: Can select and upload avatar on both platforms

**Deliverables**:
- `packages/shared/src/components/profile/AvatarUpload.tsx`
- `packages/shared/__tests__/components/profile/AvatarUpload.test.tsx`
- File picker integration
- Upload progress display

---

### Task 6.4: Integrate Avatar Upload in Profile Editor
**Goal**: Add avatar upload functionality to profile editor
**Scope**: Component integration, state management, UI updates
**Tests**:
- Unit: Profile editor should handle avatar uploads correctly
- Manual: Can upload avatar while editing profile

**Deliverables**:
- Updated `ProfileEditor.tsx` with avatar upload
- Integration with useAvatarUpload hook
- UI updates for avatar preview
- Error handling for upload failures

---

## Phase 7: Testing Infrastructure

### Task 7.1: Setup Unit Test Infrastructure
**Goal**: Configure Jest and React Testing Library for all packages
**Scope**: Test configuration, mocking, coverage setup
**Tests**:
- Unit: All test configurations should work correctly
- Manual: `npm run test:unit` should run all unit tests

**Deliverables**:
- Jest configurations for all packages
- React Testing Library setup
- Test utilities and mocks
- Coverage configuration

---

### Task 7.2: Setup Integration Test Infrastructure
**Goal**: Configure integration tests for cross-platform functionality
**Scope**: Test database setup, client factories, test utilities
**Tests**:
- Unit: Integration test setup should work correctly
- Manual: `npm run test:integration` should run integration tests

**Deliverables**:
- `tests/integration/` directory structure
- `tests/utils/test-database.ts`
- `tests/utils/test-clients.ts`
- Integration test configuration

---

### Task 7.3: Setup E2E Test Infrastructure
**Goal**: Configure Maestro for end-to-end testing
**Scope**: E2E test structure, test data, flow definitions
**Tests**:
- Unit: E2E test configuration should be valid
- Manual: `npm run test:e2e` should run E2E tests

**Deliverables**:
- `tests/e2e/` directory structure
- `tests/e2e/web/flows/` test files
- `tests/e2e/mobile/flows/` test files
- Maestro configuration

---

### Task 7.4: Create Database Test Suite
**Goal**: Set up database tests for RLS policies and constraints
**Scope**: SQL-based tests, policy validation, constraint testing
**Tests**:
- Unit: Database tests should validate all policies
- Manual: `npm run test:db` should run database tests

**Deliverables**:
- `supabase/tests/user_profiles.test.sql`
- `supabase/tests/rls_policies.test.sql`
- `supabase/tests/storage_policies.test.sql`
- Database test runner configuration

---

## Phase 8: Development Scripts & Tooling

### Task 8.1: Create Development Scripts
**Goal**: Build helper scripts for common development tasks
**Scope**: Setup scripts, database management, type generation
**Tests**:
- Unit: Scripts should execute without errors
- Manual: Scripts should perform their intended functions

**Deliverables**:
- `scripts/setup-local.sh`
- `scripts/generate-types.sh`
- `scripts/reset-pr-database.sh`
- `scripts/check-db-status.sh`

---

### Task 8.2: Setup Code Quality Tools
**Goal**: Configure ESLint, Prettier, and TypeScript strict mode
**Scope**: Linting rules, formatting, type checking
**Tests**:
- Unit: Code quality tools should catch issues
- Manual: `npm run lint` and `npm run type-check` should pass

**Deliverables**:
- ESLint configurations for all packages
- Prettier configuration
- TypeScript strict mode setup
- Pre-commit hooks with Husky

---

### Task 8.3: Setup Package Scripts
**Goal**: Create comprehensive npm scripts for all development tasks
**Scope**: Development, testing, building, deployment scripts
**Tests**:
- Unit: All scripts should execute without errors
- Manual: Scripts should perform their intended functions

**Deliverables**:
- Root `package.json` with all scripts
- Package-specific scripts
- Development workflow scripts
- Build and deployment scripts

---

## Phase 9: CI/CD Pipeline

### Task 9.1: Create Test Workflow
**Goal**: Set up GitHub Actions for running tests on PRs
**Scope**: Unit tests, integration tests, linting, type checking
**Tests**:
- Unit: Workflow should run all tests successfully
- Manual: PR should trigger test workflow

**Deliverables**:
- `.github/workflows/test.yml`
- Test job configurations
- Coverage reporting
- Test result artifacts

---

### Task 9.2: Create PR Preview Workflow
**Goal**: Set up automated PR preview deployments
**Scope**: Database reset, web deployment, mobile updates
**Tests**:
- Unit: Workflow should deploy PR previews successfully
- Manual: PR should create preview environment

**Deliverables**:
- `.github/workflows/pr-preview-environment.yml`
- Database reset logic
- Web deployment to S3/CloudFront
- Mobile EAS update deployment

---

### Task 9.3: Create Staging Deployment Workflow
**Goal**: Set up automated staging deployments
**Scope**: Database migrations, web deployment, mobile updates
**Tests**:
- Unit: Workflow should deploy to staging successfully
- Manual: Merge to develop should trigger staging deployment

**Deliverables**:
- `.github/workflows/deploy-staging.yml`
- Staging database management
- Staging environment deployment
- Deployment notifications

---

### Task 9.4: Create Production Deployment Workflow
**Goal**: Set up production deployment with safety checks
**Scope**: Database backups, production deployment, monitoring
**Tests**:
- Unit: Workflow should deploy to production safely
- Manual: Merge to main should trigger production deployment

**Deliverables**:
- `.github/workflows/deploy-production.yml`
- Database backup procedures
- Production deployment logic
- Post-deployment monitoring

---

## Phase 10: Documentation & Final Integration

### Task 10.1: Create Development Documentation
**Goal**: Write comprehensive development guide
**Scope**: Setup instructions, development workflow, troubleshooting
**Tests**:
- Unit: Documentation should be accurate and complete
- Manual: New developer should be able to set up project using docs

**Deliverables**:
- `docs/DEVELOPMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/API.md`
- Setup troubleshooting guide

---

### Task 10.2: Create User Documentation
**Goal**: Write user-facing documentation and help
**Scope**: User guides, FAQ, feature documentation
**Tests**:
- Unit: Documentation should be clear and accurate
- Manual: Users should be able to use app features using docs

**Deliverables**:
- User guide for web app
- User guide for mobile app
- FAQ section
- Feature documentation

---

### Task 10.3: Final Integration Testing
**Goal**: Test complete user flows across both platforms
**Scope**: End-to-end testing, cross-platform sync, error handling
**Tests**:
- Unit: All integration tests should pass
- Manual: Complete user flows should work on both platforms

**Deliverables**:
- Complete E2E test suite
- Cross-platform integration tests
- Error handling validation
- Performance testing

---

### Task 10.4: Production Readiness Checklist
**Goal**: Ensure MVP is ready for production deployment
**Scope**: Security review, performance optimization, monitoring setup
**Tests**:
- Unit: All production readiness checks should pass
- Manual: App should be stable and performant in production

**Deliverables**:
- Security audit results
- Performance optimization
- Monitoring and alerting setup
- Production deployment checklist

---

## Testing Strategy for Each Task

### Unit Tests
Each task should include unit tests that:
- Test the specific functionality in isolation
- Use mocks for external dependencies
- Have clear test cases for success and failure scenarios
- Run quickly (< 1 second per test)

### Manual Tests
Each task should include manual tests that:
- Can be run from command line or browser
- Verify the functionality works end-to-end
- Include steps to reproduce the test
- Have clear success/failure criteria

### Integration Tests
Tasks that involve multiple systems should include:
- Tests that verify components work together
- Database integration tests where applicable
- Cross-platform functionality tests
- Real API calls where appropriate

## Success Criteria

Each task is considered complete when:
1. ✅ All unit tests pass
2. ✅ All manual tests pass
3. ✅ Code follows project standards (linting, formatting)
4. ✅ TypeScript compilation succeeds
5. ✅ Documentation is updated if needed
6. ✅ Task deliverables are implemented and working

## Dependencies

Tasks should be completed in order, as later tasks depend on earlier ones:
- Phase 1 (Foundation) must be completed before any other phases
- Phase 2 (Database) must be completed before Phase 3 (Auth)
- Phase 3 (Auth) must be completed before Phase 4 (Profile)
- And so on...

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Foundation & Database)
- **Phase 3**: 3-4 days (Authentication)
- **Phase 4**: 2-3 days (Profile Management)
- **Phase 5**: 2-3 days (Platform Screens)
- **Phase 6**: 2-3 days (Avatar Upload)
- **Phase 7**: 2-3 days (Testing)
- **Phase 8**: 1-2 days (Scripts & Tooling)
- **Phase 9**: 2-3 days (CI/CD)
- **Phase 10**: 1-2 days (Documentation)

**Total Estimated Time**: 17-26 days

This timeline assumes working on one task at a time with proper testing between each task.
