import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../init.web.js', () => ({
  initAnalytics: vi.fn(),
}));

import { PlausibleAnalytics } from '../components/PlausibleAnalytics.web.js';
import * as initModule from '../init.web.js';

describe('PlausibleAnalytics', () => {
  beforeEach(() => {
    vi.mocked(initModule.initAnalytics).mockClear();
  });

  it('calls initAnalytics with config on mount', () => {
    const config = { domain: 'getskein.ai' };
    render(<PlausibleAnalytics config={config} />);

    expect(initModule.initAnalytics).toHaveBeenCalledWith(config);
  });

  it('returns null (no DOM output)', () => {
    const { container } = render(
      <PlausibleAnalytics config={{ domain: 'getskein.ai' }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
