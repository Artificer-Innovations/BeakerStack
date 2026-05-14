import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock ReactDOM before importing main.tsx
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}));

vi.mock('../AuthShell', () => ({
  AuthShell: (props: { basePath: string }) =>
    React.createElement('div', null, `AuthShell(${props.basePath})`),
}));

// Mock CSS import
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
  let rootElement: HTMLElement | null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    vi.stubEnv('VITE_BASE_PATH', '');
  });

  afterEach(() => {
    if (rootElement && rootElement.parentNode) {
      rootElement.parentNode.removeChild(rootElement);
    }
    rootElement = null;
  });

  it('should create root and render app when root element exists', async () => {
    await import('../main');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
    expect(mockRender).toHaveBeenCalled();

    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall.type).toBe(React.StrictMode);
  });

  it('should use createRoot even when root has prerendered content', async () => {
    const prerendered = document.createElement('div');
    rootElement!.appendChild(prerendered);

    await import('../main');
    await new Promise(resolve => setTimeout(resolve, 10));

    // createRoot is always used — hydrateRoot was dropped due to structural
    // fiber-tree mismatch between the hand-maintained prerender and App's full tree
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
    expect(mockRender).toHaveBeenCalled();
  });

  it('should render with ThemeProvider wrapping lazy AuthShell', async () => {
    await import('../main');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockRender).toHaveBeenCalled();
    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall.type).toBe(React.StrictMode);

    const themeProvider = renderCall.props.children;
    expect(themeProvider).toBeDefined();
    expect(themeProvider.type).toBeDefined();

    const suspense = themeProvider.props.children;
    expect(suspense).toBeDefined();
    expect(suspense.type).toBe(React.Suspense);
  });

  it('should use default base path when VITE_BASE_PATH is not set', async () => {
    vi.stubEnv('VITE_BASE_PATH', '');
    await import('../main');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
  });

  it('should throw error when root element is not found', async () => {
    if (rootElement && rootElement.parentNode) {
      rootElement.parentNode.removeChild(rootElement);
    }
    rootElement = null;

    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn(() => null);

    await expect(async () => {
      await import('../main');
    }).rejects.toThrow('Root element #root not found');

    document.getElementById = originalGetElementById;
  });
});
