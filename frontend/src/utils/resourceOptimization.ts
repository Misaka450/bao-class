/**
 * Resource optimization utilities for Pro template
 * Handles static asset loading, caching, and performance optimization
 */

/**
 * Image lazy loading with intersection observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              this.loadImage(img);
              this.observer?.unobserve(img);
              this.images.delete(img);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01,
        }
      );
    }
  }

  observe(img: HTMLImageElement) {
    if (this.observer && img.dataset.src) {
      this.images.add(img);
      this.observer.observe(img);
    }
  }

  private loadImage(img: HTMLImageElement) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      img.classList.add('loaded');
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.images.clear();
    }
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  // 只预加载真正存在的静态资源
  // 字体通过 CSS 加载，不需要手动预加载
  const criticalResources: Array<{ href: string; as: string; type?: string; crossorigin?: string }> = [];

  criticalResources.forEach(({ href, as, type, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  });
}

/**
 * Prefetch resources for likely navigation
 */
export function prefetchResources(urls: string[]) {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Service Worker registration for caching
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

/**
 * Optimize bundle loading with module preloading
 */
export function preloadModules(moduleIds: string[]) {
  moduleIds.forEach((moduleId) => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = moduleId;
    document.head.appendChild(link);
  });
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();

  startTiming(label: string) {
    this.metrics.set(`${label}_start`, performance.now());
  }

  endTiming(label: string) {
    const startTime = this.metrics.get(`${label}_start`);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.set(label, duration);
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    return 0;
  }

  getMetric(label: string): number | undefined {
    return this.metrics.get(label);
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  reportWebVitals() {
    // Report Core Web Vitals using Performance API
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Report navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log('Navigation timing:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstByte: navigation.responseStart - navigation.requestStart,
        });
      }

      // Report paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        console.log(`${entry.name}: ${entry.startTime}ms`);
      });
    }
  }
}

/**
 * Resource hints for better loading performance
 */
export function addResourceHints() {
  const hints = [
    // DNS prefetch for external domains
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//cdn.jsdelivr.net' },
    // Preconnect to critical origins
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
  ];

  hints.forEach(({ rel, href, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  });
}

/**
 * Chunk loading optimization
 */
export function optimizeChunkLoading() {
  // Preload vendor chunks that are likely to be needed
  const vendorChunks: string[] = [
    // These should not be hardcoded as Vite appends hashes
    // '/assets/js/vendor-react.js',
    // '/assets/js/vendor-antd.js',
    // '/assets/js/vendor-pro-core.js',
  ];

  // Use requestIdleCallback for non-critical preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadModules(vendorChunks);
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadModules(vendorChunks);
    }, 1000);
  }
}

/**
 * Initialize all performance optimizations
 */
export function initializePerformanceOptimizations() {
  // Add resource hints
  addResourceHints();

  // Preload critical resources
  preloadCriticalResources();

  // Optimize chunk loading
  optimizeChunkLoading();

  // Register service worker
  registerServiceWorker();

  // Initialize performance monitoring
  const monitor = new PerformanceMonitor();
  monitor.reportWebVitals();

  return monitor;
}

export default {
  ImageLazyLoader,
  PerformanceMonitor,
  preloadCriticalResources,
  prefetchResources,
  registerServiceWorker,
  preloadModules,
  addResourceHints,
  optimizeChunkLoading,
  initializePerformanceOptimizations,
};