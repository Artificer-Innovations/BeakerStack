# @beakerstack/test-utils

Testing utilities for [BeakerStack](https://github.com/Artificer-Innovations/BeakerStack)-based projects.

## Installation

```bash
npm install --save-dev @beakerstack/test-utils
```

## Usage

```typescript
import { wait, testId } from '@beakerstack/test-utils';

await wait(100);
const id = testId('user'); // "user-a1b2c3d4"
```

## License

MIT © Artificer Innovations, LLC
