import "@testing-library/jest-dom";

// Mock ResizeObserver — Recharts ResponsiveContainer measures 0x0 in jsdom
// without this, causing "ResizeObserver is not defined" errors in tests.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
