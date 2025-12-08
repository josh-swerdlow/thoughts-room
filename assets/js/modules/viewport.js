import { getViewportMetrics } from "./utils.js";

const setViewportProperties = () => {
  const metrics = getViewportMetrics();
  const root = document.documentElement;
  if (!root || !root.style) {
    return metrics;
  }

  const visualHeight = metrics.visualHeight || metrics.height || window.innerHeight || 0;
  const layoutHeight = metrics.layoutHeight || visualHeight;
  const visualWidth = metrics.visualWidth || metrics.width || window.innerWidth || 0;
  const offsetBottom = metrics.keyboardOffset || metrics.offsetBottom || 0;
  const offsetTop = metrics.offsetTop || 0;

  // Use layoutHeight (full screen height) instead of visualHeight for --layout-min-height
  root.style.setProperty("--layout-min-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-visible-height", `${visualHeight}px`);
  root.style.setProperty("--viewport-visible-unit", `${visualHeight / 100}px`);
  root.style.setProperty("--viewport-visible-width", `${visualWidth}px`);
  root.style.setProperty("--viewport-layout-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-offset-bottom", `${offsetBottom}px`);
  root.style.setProperty("--viewport-offset-top", `${offsetTop}px`);

  // Calculate textarea height based on visual viewport
  // Use a percentage of visual height, clamped between min and max values
  const textareaHeightPercent = metrics.isKeyboardVisible ? 0.15 : 0.12; // Smaller when keyboard is visible
  const textareaHeight = visualHeight * textareaHeightPercent;
  const textareaMinHeight = 48; // 3rem
  const textareaMaxHeight = 100; // ~6.25rem
  const clampedTextareaHeight = Math.max(textareaMinHeight, Math.min(textareaMaxHeight, textareaHeight));
  root.style.setProperty("--textarea-height", `${clampedTextareaHeight}px`);

  // Removed scene translation - thoughts-shell is position: fixed and handles positioning via --viewport-offset-bottom
  // The scene should not be translated as it causes unwanted shifting of all content including the textarea

  return metrics;
};

export const initViewportUnits = () => {
  if (typeof window === "undefined") {
    return null;
  }

  let rafId = 0;
  const requestUpdate = () => {
    if (rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      setViewportProperties();
    });
  };

  const visual = window.visualViewport;

  setViewportProperties();

  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("orientationchange", requestUpdate, { passive: true });

  if (visual) {
    visual.addEventListener("resize", requestUpdate, { passive: true });
    visual.addEventListener("scroll", requestUpdate, { passive: true });
  }

  return {
    refresh: () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      setViewportProperties();
    },
    destroy: () => {
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("orientationchange", requestUpdate);
      if (visual) {
        visual.removeEventListener("resize", requestUpdate);
        visual.removeEventListener("scroll", requestUpdate);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
  };
};
