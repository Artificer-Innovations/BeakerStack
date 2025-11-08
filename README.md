# Beaker Stack

A full-stack monorepo with React Native mobile app, React web app, and Supabase backend.

## Features

- **React Native iOS/Android mobile app**
- **React web application**
- **Supabase backend** (PostgreSQL, Auth, Storage, Edge Functions)
- **40-60% code sharing** between mobile and web
- **Comprehensive testing** (unit, integration, E2E)
- **Production-ready CI/CD** pipeline

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for Supabase local)
- Supabase CLI: `npm install -g supabase`
- React Native development environment (Xcode for iOS, Android Studio for Android)
- Maestro CLI: `curl -Ls https://get.maestro.mobile.dev | bash`

## Documentation

- [Branding Guide](docs/BRANDING.md) - How to customize app icon, colors, and display strings
- [Testing Guide](docs/TESTING.md) - Testing strategies and best practices
- [Architecture](ARCHITECTURE.md) - System architecture and design decisions

## Quick Start

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd BeakerStack
   npm install
   ```

2. **Setup environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your local Supabase credentials
   ```

3. **Start Supabase local:**

   ```bash
   supabase start
   ```

4. **Generate TypeScript types:**

   ```bash
   npm run gen:types
   ```

5. **Start development servers:**

   ```bash
   # Start all services
   npm run dev:all

   # Or individually:
   npm run web      # Web app on http://localhost:5173
   npm run mobile   # Mobile app (Expo)
   ```

## Project Structure

```
BeakerStack/
├── apps/
│   ├── mobile/          # React Native app
│   └── web/             # React web app
├── packages/
│   └── shared/          # Shared components, hooks, types
├── supabase/            # Database migrations, functions
├── tests/               # Integration & E2E tests
├── scripts/             # Development scripts
└── docs/                # Documentation
```

## Development

### Available Scripts

- `npm run dev:all` - Start all development servers
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages
- `npm run format` - Format all code

### Database

- `supabase start` - Start local Supabase
- `supabase stop` - Stop local Supabase
- `npm run gen:types` - Generate TypeScript types from database
- `supabase db reset` - Reset local database

### Testing

- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:db` - Run database tests

### Development Helper

The project includes a development helper script to manage processes and port conflicts:

- `npm run dev:check` - Check which ports are available
- `npm run dev:clean` - Kill all development processes
- `npm run dev:start` - Start all servers with automatic cleanup

#### Mobile App Specific Commands

- `npm run mobile` - Start mobile app on port 8082
- `npm run mobile:ios` - Start mobile app in iOS simulator
- `npm run mobile:android` - Start mobile app in Android emulator
- `npm run mobile:clean` - Kill mobile-related processes

#### iOS Build Commands (from `apps/mobile` directory)

- `npm run ios` - Build and run on iOS (uses existing native folders)
- `npm run ios:clean` - Clean build artifacts and rebuild (handles missing ios folder, uninstalls app from booted simulators)
- `npm run rebuild` or `npm run rebuild:ios` - Full clean rebuild: runs clean-rebuild.sh script then builds (recommended after deleting apps from simulator)
- `npm run ios:uninstall` - Uninstall app from booted iOS simulators
- `npm run prebuild:clean` - Regenerate native Android/iOS folders with clean slate

**When to use each command:**

- **`ios`**: Normal development builds
- **`ios:clean`**: Quick clean when build artifacts are stale
- **`rebuild` / `rebuild:ios`**: After deleting apps from simulator, when native code changes, or when experiencing build issues
- **`ios:uninstall`**: Manually remove app from booted simulator before rebuild

#### Android Build Commands (from `apps/mobile` directory)

- `npm run android` - Build and run on Android (uses existing native folders)
- `npm run android:clean` - Clean build artifacts and rebuild (handles missing android folder, uninstalls app from device)
- `npm run rebuild:android` - Full clean rebuild: runs clean-rebuild.sh script then builds (recommended after deleting apps from simulator)
- `npm run android:uninstall` - Uninstall app from connected Android devices/emulators
- `npm run prebuild:clean` - Regenerate native Android/iOS folders with clean slate

**When to use each command:**

- **`android`**: Normal development builds
- **`android:clean`**: Quick clean when build artifacts are stale
- **`rebuild:android`**: After deleting apps from simulator, when native code changes, or when experiencing build issues
- **`android:uninstall`**: Manually remove app from device before rebuild

#### Troubleshooting

If you encounter port conflicts or processes that won't stop:

1. Run `npm run dev:clean` to kill all development processes
2. Run `npm run dev:check` to verify ports are available
3. Use `./scripts/dev-helper.sh help` for more options

## Architecture

This project uses a monorepo structure with:

- **Shared Package**: Common components, hooks, validation, and business logic
- **Platform-Specific Apps**: Mobile (React Native) and Web (React) applications
- **Supabase Backend**: Database, authentication, storage, and edge functions
- **Three-Database Architecture**: Local, staging, and production environments

## Code Sharing Strategy

- **100% Shared**: Business logic, validation, types, utilities
- **60-80% Shared**: Smart components with platform adapters
- **Platform-Specific**: Navigation, native features, build configs

## Deployment

- **Local**: Development environment with Docker
- **PR Previews**: Automated deployments for pull requests
- **Staging**: Integration testing environment
- **Production**: Live application

## Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Documentation](./docs/API.md)

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm run test`
4. Commit your changes: `git commit -m "feat: add my feature"`
5. Push to the branch: `git push origin feature/my-feature`
6. Open a Pull Request

## License

MIT
