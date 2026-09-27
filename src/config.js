// Frame constants, dependency-free so any module can import them (shots must NOT import main.js:
// main.js awaits the shot registry, so importing it from a shot deadlocks module loading).
export const W = 2206, H = 946, FPS = 25, DUR = 140.8;
