// Jest setup file


// Mock PullToRefresh.js since it's loaded from CDN
global.PullToRefresh = {
    init: jest.fn(),
    destroy: jest.fn()
};

// Mock fetch for dictionary loading
global.fetch = jest.fn();

// The following are DOM-only mocks: they don't apply (and `window`/`Event`
// don't exist) for suites that opt into the "node" test environment via an
// `@jest-environment node` docblock, e.g. test/worker-seo.test.js.
if (typeof window !== 'undefined') {
    // Mock DOM methods that might not be available in jsdom
    Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 0
    });

    // Mock touch events
    global.TouchEvent = class TouchEvent extends Event {
        constructor(type, options = {}) {
            super(type, options);
            this.touches = options.touches || [];
            this.changedTouches = options.changedTouches || [];
        }
    };
}
