# @beakerstack/test-utils

Internal workspace scaffold for a publishable `@beakerstack/*` package layout. Not published to npm; use the workspace import from the monorepo root.

## Usage (monorepo)

```typescript
import { wait, testId } from '@beakerstack/test-utils';

await wait(100);
const id = testId('user'); // "user-a1b2c3d4"
```

## License

MIT © Artificer Innovations, LLC
