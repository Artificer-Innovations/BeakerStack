import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { LandingPage } from '../src/components/landing/LandingPage';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const html = renderToStaticMarkup(
  createElement(
    StaticRouter,
    { location: '/' },
    createElement(LandingPage)
  )
);

// Structural smoke check — catches a broken render without hardcoding copy text.
// Fails the build if LandingPage produced no heading element.
if (!html.includes('<h1')) {
  console.error(
    'pre-render smoke check: no <h1> in output — LandingPage did not render'
  );
  process.exit(1);
}

const template = readFileSync(join(webRoot, 'dist', 'index.html'), 'utf8');

// canonical and og:url are home-only; inject here rather than in the base
// template which is also served as the SPA fallback for all other routes.
const withHomeMeta = template.replace(
  '</head>',
  [
    '  <link rel="canonical" href="https://beakerstack.com/" />',
    '  <meta property="og:url" content="https://beakerstack.com/" />',
    '  </head>',
  ].join('\n')
);

const out = withHomeMeta.replace(
  '<div id="root"></div>',
  `<div id="root">${html}</div>`
);

writeFileSync(join(webRoot, 'dist', 'prerender-home.html'), out);
console.log(`pre-render complete — ${html.length} chars`);
