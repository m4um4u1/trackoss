import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import 'jest-extended';

setupZoneTestEnv();

// Mock global objects
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance'],
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
  observe(target: Element) {}
  unobserve(target: Element) {}
  disconnect() {}
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL for MapLibre GL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
  writable: true,
});

// Mock URL.revokeObjectURL
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock performance API for MapLibre GL
Object.defineProperty(global, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn((): PerformanceEntry[] => []),
    getEntriesByType: jest.fn((): PerformanceEntry[] => []),
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock Worker for MapLibre GL
global.Worker = class Worker {
  constructor(url: string | URL) {
    // Mock worker implementation
  }
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
} as any;

// Mock Request API for MapLibre GL
global.Request = class Request {
  constructor(input: any, init?: any) {
    // Mock request implementation
  }
} as any;

// Mock WebGL context for MapLibre GL
HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return {
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      getAttribLocation: jest.fn(),
      getUniformLocation: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      uniform1f: jest.fn(),
      uniform2f: jest.fn(),
      uniform3f: jest.fn(),
      uniform4f: jest.fn(),
      uniformMatrix4fv: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      clearDepth: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      depthFunc: jest.fn(),
      viewport: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
    } as unknown as WebGLRenderingContext;
  }
  if (contextId === '2d') {
    return {
      canvas: {} as HTMLCanvasElement,
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
    } as Partial<CanvasRenderingContext2D>;
  }
  return null;
}) as any;
