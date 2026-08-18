# @beakerstack/image-size

In-repo copy of [`image-size@1.2.1`](https://www.npmjs.com/package/image-size/v/1.2.1) (MIT, Aditya Yadav / netroy). Metro 0.84 still `require('image-size')` for React Native asset dimensions; upstream never published a patched release (`2.0.3` is listed in advisories but is not on npm).

Root `overrides` map `image-size` to `file:vendor/image-size` so npm audit does not match GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq against the original package name.

## BeakerStack patches

Authored here from the CVE writeups; not taken from third-party forks.

- **ICNS** (CVE-2025-71330): stop walking when an entry length is smaller than the 8-byte header, or when the next offset would not advance.
- **`findBox`** (CVE-2025-71329): reject boxes whose size is smaller than the 8-byte ISO BMFF header (including size `0`), so JXL/HEIF/JP2 parsers cannot spin.

No install scripts. Original `LICENSE` is unchanged.
