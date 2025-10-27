// Jest setup file
require('@testing-library/jest-dom');

// Mock PullToRefresh.js since it's loaded from CDN
global.PullToRefresh = {
    init: jest.fn(),
    destroy: jest.fn()
};

// Mock fetch for dictionary loading
global.fetch = jest.fn();

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
