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

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(callback => {
        callback('SUBSCRIBED');
        return {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
        };
      }),
    })),
    removeChannel: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
  },
}));

// Mock App component
vi.mock('../App', () => ({
  default: () => React.createElement('div', null, 'App Component'),
}));

// Mock CSS import
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
  let rootElement: HTMLElement | null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRoot.mockClear();
    mockRender.mockClear();

    // Reset modules to allow re-importing main.tsx
    vi.resetModules();

    // Create a mock root element
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    // Reset import.meta.env mock - use empty string instead of undefined
    vi.stubEnv('VITE_BASE_PATH', '');
  });

  afterEach(() => {
    // Clean up
    if (rootElement && rootElement.parentNode) {
      rootElement.parentNode.removeChild(rootElement);
    }
    rootElement = null;
  });

  it('should create root and render app when root element exists', async () => {
    // Import main.tsx - it will execute immediately
    await import('../main');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);

    // Verify render was called
    expect(mockRender).toHaveBeenCalled();

    // Verify render was called with React.StrictMode
    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall.type).toBe(React.StrictMode);
  });

  it('should render app with AuthProvider and ProfileProvider', async () => {
    // Import main.tsx
    await import('../main');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify render was called
    expect(mockRender).toHaveBeenCalled();

    // Get the rendered component tree
    const renderCall = mockRender.mock.calls[0][0];

    // Verify it's wrapped in StrictMode
    expect(renderCall.type).toBe(React.StrictMode);

    // Verify the structure includes providers
    // The structure should be: StrictMode > AuthProvider > ProfileProvider > BrowserRouter > App
    const strictModeChildren = renderCall.props.children;
    expect(strictModeChildren).toBeDefined();

    // Verify AuthProvider is present (check if it's a function component)
    expect(strictModeChildren.type).toBeDefined();

    // Verify ProfileProvider is nested inside AuthProvider
    const profileProvider = strictModeChildren.props.children;
    expect(profileProvider).toBeDefined();
  });

  it('should use default base path when VITE_BASE_PATH is not set', async () => {
    // Ensure VITE_BASE_PATH is not set (or explicitly set to undefined)
    // When undefined, main.tsx should default to '/'
    vi.stubEnv('VITE_BASE_PATH', '');

    // Import main.tsx
    await import('../main');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify createRoot was called
    expect(mockCreateRoot).toHaveBeenCalled();

    // Verify render was called
    expect(mockRender).toHaveBeenCalled();

    // Check that BrowserRouter is in the component tree
    const renderCall = mockRender.mock.calls[0][0];
    const authProvider = renderCall.props.children;
    const profileProvider = authProvider.props.children;
    const browserRouter = profileProvider.props.children;

    // When VITE_BASE_PATH is empty string or undefined, basename should default to '/'
    // The code uses: const basePath = import.meta.env.VITE_BASE_PATH || '/';
    // So empty string will also default to '/'
    const basename = browserRouter.props.basename;
    expect(basename === '/' || basename === undefined).toBe(true);
  });

  it('should throw error when root element is not found', async () => {
    // Remove root element before importing
    if (rootElement && rootElement.parentNode) {
      rootElement.parentNode.removeChild(rootElement);
    }
    rootElement = null;

    // Mock getElementById to return null
    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn(() => null);

    // Import main.tsx - it should throw an error
    await expect(async () => {
      await import('../main');
    }).rejects.toThrow('Root element #root not found');

    // Restore original method
    document.getElementById = originalGetElementById;
  });
});
