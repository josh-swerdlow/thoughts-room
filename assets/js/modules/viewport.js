import { getViewportMetrics } from "./utils.js";

const DEBUG_ENABLED = (() => {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search || "");
  if (params.has("debug")) {
    localStorage.setItem("thoughts-debug", params.get("debug") !== "0" ? "true" : "false");
  }
  const stored = localStorage.getItem("thoughts-debug");
  return stored === "true" || params.get("debug") === "true";
})();

const debugState = {
  metrics: null,
  lastSpawn: null,
  spawnHistory: [],
  thoughtCount: 0,
  overlay: null,
  removalReasons: new Map(),
};

const ensureDebugOverlay = () => {
  if (!DEBUG_ENABLED || typeof document === "undefined") {
    return null;
  }
  if (debugState.overlay) {
    return debugState.overlay;
  }
  const overlay = document.createElement("aside");
  overlay.id = "thoughts-debug-overlay";
  overlay.style.position = "fixed";
  overlay.style.zIndex = "999";
  overlay.style.top = "0.5rem";
  overlay.style.left = "0.5rem";
  overlay.style.padding = "0.75rem 1rem";
  overlay.style.borderRadius = "0.75rem";
  overlay.style.background = "rgba(12, 16, 35, 0.82)";
  overlay.style.color = "#dfe4ff";
  overlay.style.fontSize = "0.75rem";
  overlay.style.lineHeight = "1.25";
  overlay.style.maxWidth = "18rem";
  overlay.style.pointerEvents = "none";
  overlay.style.backdropFilter = "blur(12px)";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.fontFamily = "monospace";
  document.body?.appendChild(overlay);
  debugState.overlay = overlay;
  return overlay;
};

const renderDebugOverlay = () => {
  if (!DEBUG_ENABLED) {
    return;
  }
  const overlay = ensureDebugOverlay();
  if (!overlay) {
    return;
  }
  const metrics = debugState.metrics;
  if (!metrics) {
    overlay.textContent = "(no metrics yet)";
    return;
  }
  const lines = [
    `viewport: ${Math.round(metrics.visualWidth || metrics.width || 0)} x ${Math.round(
      metrics.visualHeight || metrics.height || 0,
    )}`,
    `layout:   ${Math.round(metrics.layoutWidth || 0)} x ${Math.round(metrics.layoutHeight || 0)}`,
    `offsets:  top ${Math.round(metrics.offsetTop || 0)} | bottom ${Math.round(
      metrics.keyboardOffset || metrics.offsetBottom || 0,
    )}`,
    `keyboard: ${metrics.isKeyboardVisible ? "visible" : "hidden"}`,
  ];
  if (debugState.lastSpawn) {
    const spawn = debugState.lastSpawn;
    const thoughtEl =
      typeof document !== "undefined"
        ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawn.id}"]`)
        : null;
    const thoughtExists = thoughtEl !== null;
    const thoughtVisible = thoughtEl ? thoughtEl.getBoundingClientRect().height > 0 : false;
    const thoughtRect = thoughtEl ? thoughtEl.getBoundingClientRect() : null;

    lines.push(
      "--- last thought ---",
      `created: ${spawn.timestamp ? new Date(spawn.timestamp).toLocaleTimeString() : "unknown"}`,
      `total: ${debugState.thoughtCount}`,
      `words: ${spawn.wordCount || 0}`,
      `origin: (${Math.round(spawn.originLeft || 0)}, ${Math.round(spawn.originTop)})`,
    );

    if (spawn.originTopBeforeAdjust !== undefined && spawn.originTopBeforeAdjust !== spawn.originTop) {
      lines.push(`origin (raw): ${Math.round(spawn.originTopBeforeAdjust)}`);
    }

    lines.push(
      `width: ${Math.round(spawn.width)}`,
      `z-index: ${spawn.zIndex || "auto"}`,
      `in DOM: ${thoughtExists ? "yes" : "no"}`,
      `visible: ${thoughtVisible ? "yes" : "no"}`,
    );

    if (spawn.error) {
      lines.push(`ERROR: ${spawn.error}`);
    }

    const removalReason = debugState.removalReasons.get(spawn.id);
    if (removalReason) {
      const lifetime = removalReason.elapsed ? `${(removalReason.elapsed / 1000).toFixed(2)}s` : "?";
      const maxLifetime = removalReason.maxLifetime ? `${(removalReason.maxLifetime / 1000).toFixed(2)}s` : "?";
      lines.push(`REMOVED: ${removalReason.reason}`);
      lines.push(`  lifetime: ${lifetime} / ${maxLifetime}`);
      if (removalReason.rect) {
        lines.push(
          `  at: (${Math.round(removalReason.rect.left)}, ${Math.round(removalReason.rect.top)})`,
          `  screen: ${Math.round(removalReason.screenHeight)}h x ${Math.round(removalReason.screenWidth)}w`,
        );
      }
    }

    const thoughtLayerExists =
      typeof document !== "undefined" ? document.getElementById("thought-layer") !== null : false;
    if (!thoughtLayerExists) {
      lines.push("WARNING: #thought-layer missing!");
    }

    if (spawn.textareaRect) {
      lines.push(
        `textarea: (${Math.round(spawn.textareaRect.left)}, ${Math.round(spawn.textareaRect.top)})`,
      );
    }

    if (thoughtRect) {
      const computedStyle = thoughtEl ? window.getComputedStyle(thoughtEl) : null;
      const styleTop = thoughtEl ? thoughtEl.style.top : "?";
      const transform = computedStyle?.transform || "none";
      lines.push(
        `DOM pos: (${Math.round(thoughtRect.left)}, ${Math.round(thoughtRect.top)})`,
        `style.top: ${styleTop}`,
        `transform: ${transform !== "none" ? transform.substring(0, 30) + "..." : "none"}`,
        `size: ${Math.round(thoughtRect.width)} x ${Math.round(thoughtRect.height)}`,
      );

      if (thoughtEl) {
        const wordEl = thoughtEl.querySelector(".thought-word");
        if (wordEl) {
          const wordStyle = window.getComputedStyle(wordEl);
          const wordDuration = wordStyle.getPropertyValue("--duration") || wordStyle.animationDuration || "?";
          const wordDelay = wordStyle.getPropertyValue("--delay") || wordStyle.animationDelay || "?";
          const wordDy = wordStyle.getPropertyValue("--dy") || "?";
          const animationName = wordStyle.animationName || "none";
          const wordOpacity = wordStyle.opacity || "?";
          const wordColor = wordStyle.color || "?";
          const wordTransform = wordStyle.transform || "none";
          const wordRect = wordEl.getBoundingClientRect();
          const animationState = wordEl.style.animationPlayState || wordStyle.animationPlayState || "?";
          const animationRunning = wordEl.getAnimations ? wordEl.getAnimations().length > 0 : "?";
          lines.push(
            `word anim: ${animationName}`,
            `duration: ${wordDuration}, delay: ${wordDelay}`,
            `dy: ${wordDy}`,
            `word pos: (${Math.round(wordRect.left)}, ${Math.round(wordRect.top)})`,
            `word size: ${Math.round(wordRect.width)}x${Math.round(wordRect.height)}`,
            `opacity: ${wordOpacity}, color: ${wordColor.substring(0, 15)}`,
            `transform: ${wordTransform !== "none" ? wordTransform.substring(0, 40) + "..." : "none"}`,
            `anim running: ${animationRunning}`,
          );
        } else {
          lines.push("WARNING: no .thought-word found!");
        }
      }
    } else if (thoughtExists) {
      lines.push("position: (no rect available)");
    }

    if (spawn.sceneRect) {
      lines.push(`scene top: ${Math.round(spawn.sceneRect.top)}`);
    }

    lines.push(
      `travel: ${Math.round(spawn.travelHeight)} + ${Math.round(spawn.fadeBuffer)}`,
      `minDist: ${Math.round(spawn.minDistance)}`,
      `text: "${spawn.textPreview || ""}" (${spawn.textLength} chars)`,
    );
  } else {
    lines.push("--- no thoughts yet ---");
  }

  const activeThoughts =
    typeof document !== "undefined" ? document.querySelectorAll("#thought-layer .thought").length : 0;
  if (activeThoughts > 0) {
    lines.push(`active thoughts: ${activeThoughts}`);
  }

  overlay.textContent = lines.join("\n");

  const offsetTop = metrics.offsetTop || 0;
  const offsetBottom = metrics.keyboardOffset || metrics.offsetBottom || 0;
  const visualHeight = metrics.visualHeight || metrics.height || window.innerHeight || 0;

  overlay.style.top = `${8 + offsetTop}px`;
  overlay.style.bottom = "auto";

  const rect = overlay.getBoundingClientRect();
  const availableBottom = visualHeight - offsetBottom - 8;
  if (rect.bottom > availableBottom) {
    overlay.style.top = "auto";
    overlay.style.bottom = `${8 + offsetBottom}px`;
  }
};

const setViewportProperties = () => {
  const metrics = getViewportMetrics();
  const root = document.documentElement;
  if (!root || !root.style) {
    debugState.metrics = metrics;
    renderDebugOverlay();
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

  debugState.metrics = metrics;
  renderDebugOverlay();

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

if (typeof window !== "undefined") {
  if (!window.__thoughtsDebug) {
    window.__thoughtsDebug = {};
  }
  window.__thoughtsDebug.getViewportMetrics = () => ({ ...debugState.metrics });
  window.__thoughtsDebug.setSpawnData = (data) => {
    if (!debugState.lastSpawn || debugState.lastSpawn.id !== data.id) {
      debugState.thoughtCount += 1;
    }
    debugState.lastSpawn = data;
    const existingIndex = debugState.spawnHistory.findIndex((s) => s.id === data.id);
    if (existingIndex >= 0) {
      debugState.spawnHistory[existingIndex] = { ...debugState.spawnHistory[existingIndex], ...data };
    } else {
      debugState.spawnHistory.push({ ...data, count: debugState.thoughtCount });
      if (debugState.spawnHistory.length > 10) {
        debugState.spawnHistory.shift();
      }
    }
    renderDebugOverlay();
  };
  window.__thoughtsDebug.updateSpawnData = (id, updates) => {
    if (debugState.lastSpawn && debugState.lastSpawn.id === id) {
      Object.assign(debugState.lastSpawn, updates);
    }
    const existing = debugState.spawnHistory.find((s) => s.id === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    renderDebugOverlay();
  };
  window.__thoughtsDebug.setRemovalReason = (id, reason) => {
    debugState.removalReasons.set(id, reason);
    if (debugState.lastSpawn && debugState.lastSpawn.id === id) {
      renderDebugOverlay();
    }
  };
  window.__thoughtsDebug.getRemovalReason = (id) => {
    return debugState.removalReasons.get(id) || null;
  };
  window.__thoughtsDebug.getSpawnData = (id) => {
    if (id) {
      return debugState.spawnHistory.find((s) => s.id === id) ||
             (debugState.lastSpawn && debugState.lastSpawn.id === id ? debugState.lastSpawn : null);
    }
    return debugState.lastSpawn;
  };
  window.__thoughtsDebug.refresh = () => {
    renderDebugOverlay();
  };

  // Set up MutationObserver to track thought removals
  if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
    const thoughtLayer = document.getElementById("thought-layer");
    if (thoughtLayer) {
      const removalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList && node.classList.contains("thought")) {
              const spawnId = node.getAttribute("data-spawn-id");
              if (spawnId) {
                const existingReason = debugState.removalReasons.get(spawnId);
                if (!existingReason) {
                  // Thought was removed but we don't know why
                  debugState.removalReasons.set(spawnId, {
                    reason: "removed by MutationObserver (unknown cause)",
                    timestamp: Date.now(),
                    stack: new Error().stack,
                  });
                  if (debugState.lastSpawn && debugState.lastSpawn.id === spawnId) {
                    renderDebugOverlay();
                  }
                }
              }
            }
          });
        });
      });
      removalObserver.observe(thoughtLayer, { childList: true });
      if (DEBUG_ENABLED) {
        console.log("Thought removal observer active");
      }
    }
  }

  // Define snapshot functions
  try {
    window.__thoughtsDebug.listActiveThoughts = function() {
      const inDOM = typeof document !== "undefined"
        ? Array.from(document.querySelectorAll("#thought-layer .thought")).map((el) => ({
            id: el.getAttribute("data-spawn-id"),
            inDOM: true,
            rect: el.getBoundingClientRect(),
          }))
        : [];
      const inHistory = debugState.spawnHistory.map((s) => ({
        id: s.id,
        inDOM: false,
        timestamp: s.timestamp,
      }));
      return {
        inDOM,
        inHistory,
        lastSpawn: debugState.lastSpawn ? { id: debugState.lastSpawn.id, timestamp: debugState.lastSpawn.timestamp } : null,
        totalInDOM: inDOM.length,
        totalInHistory: inHistory.length,
      };
    };

    window.__thoughtsDebug.snapshotThought = function(spawnId) {
      if (!spawnId && debugState.lastSpawn) {
        spawnId = debugState.lastSpawn.id;
      }
      if (!spawnId) {
        const active = window.__thoughtsDebug.listActiveThoughts();
        return {
          error: "No thought ID provided and no last spawn found",
          availableThoughts: active,
        };
      }
      const thoughtEl = typeof document !== "undefined"
        ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`)
        : null;
      if (!thoughtEl) {
        const active = window.__thoughtsDebug.listActiveThoughts();
        return {
          error: `Thought with id ${spawnId} not found in DOM`,
          searchedId: spawnId,
          availableThoughts: active,
        };
      }
      const metrics = getViewportMetrics();
      const thoughtRect = thoughtEl.getBoundingClientRect();
      const thoughtStyle = window.getComputedStyle(thoughtEl);
      const wordEl = thoughtEl.querySelector(".thought-word");
      const wordRect = wordEl ? wordEl.getBoundingClientRect() : null;
      const wordStyle = wordEl ? window.getComputedStyle(wordEl) : null;
      const wordAnimations = wordEl && wordEl.getAnimations ? wordEl.getAnimations() : [];
      const isOnScreen = {
        top: thoughtRect.top >= 0,
        bottom: thoughtRect.bottom <= (metrics.visualHeight || window.innerHeight || 0),
        left: thoughtRect.left >= 0,
        right: thoughtRect.right <= (metrics.visualWidth || window.innerWidth || 0),
        fullyVisible: thoughtRect.top >= 0 &&
          thoughtRect.bottom <= (metrics.visualHeight || window.innerHeight || 0) &&
          thoughtRect.left >= 0 &&
          thoughtRect.right <= (metrics.visualWidth || window.innerWidth || 0),
      };
      const snapshot = {
        timestamp: new Date().toISOString(),
        spawnId,
        viewport: {
          visual: {
            width: metrics.visualWidth || metrics.width || 0,
            height: metrics.visualHeight || metrics.height || 0,
          },
          layout: {
            width: metrics.layoutWidth || 0,
            height: metrics.layoutHeight || 0,
          },
          keyboard: {
            visible: metrics.isKeyboardVisible,
            offsetTop: metrics.offsetTop || 0,
            offsetBottom: metrics.keyboardOffset || metrics.offsetBottom || 0,
          },
        },
        thought: {
          style: {
            top: thoughtEl.style.top,
            left: thoughtEl.style.left,
            width: thoughtEl.style.width,
          },
          computed: {
            top: thoughtStyle.top,
            left: thoughtStyle.left,
            width: thoughtStyle.width,
            height: thoughtStyle.height,
            zIndex: thoughtStyle.zIndex,
            opacity: thoughtStyle.opacity,
            transform: thoughtStyle.transform,
            position: thoughtStyle.position,
          },
          rect: {
            top: thoughtRect.top,
            left: thoughtRect.left,
            bottom: thoughtRect.bottom,
            right: thoughtRect.right,
            width: thoughtRect.width,
            height: thoughtRect.height,
          },
          onScreen: isOnScreen,
        },
        word: wordEl ? {
          rect: {
            top: wordRect.top,
            left: wordRect.left,
            bottom: wordRect.bottom,
            right: wordRect.right,
            width: wordRect.width,
            height: wordRect.height,
          },
          style: {
            opacity: wordStyle.opacity,
            color: wordStyle.color,
            transform: wordStyle.transform,
            animationName: wordStyle.animationName,
            animationDuration: wordStyle.animationDuration,
            animationDelay: wordStyle.animationDelay,
            animationPlayState: wordStyle.animationPlayState,
          },
          cssVars: {
            duration: wordStyle.getPropertyValue("--duration"),
            delay: wordStyle.getPropertyValue("--delay"),
            dx: wordStyle.getPropertyValue("--dx"),
            dy: wordStyle.getPropertyValue("--dy"),
            rotation: wordStyle.getPropertyValue("--rotation"),
            opacityStart: wordStyle.getPropertyValue("--opacity-start"),
            opacityEnd: wordStyle.getPropertyValue("--opacity-end"),
          },
          animations: wordAnimations.map((anim) => ({
            name: anim.animationName,
            duration: anim.effect ? anim.effect.timing.duration : null,
            delay: anim.effect ? anim.effect.timing.delay : null,
            playbackRate: anim.playbackRate,
            playState: anim.playState,
            currentTime: anim.currentTime,
          })),
        } : null,
        spawnData: debugState.lastSpawn && debugState.lastSpawn.id === spawnId ? debugState.lastSpawn : null,
      };
      return snapshot;
    };

    window.__thoughtsDebug.snapshotAllThoughts = function() {
      const thoughts = typeof document !== "undefined"
        ? document.querySelectorAll("#thought-layer .thought")
        : [];
      return Array.from(thoughts).map((el) => {
        const spawnId = el.getAttribute("data-spawn-id");
        return window.__thoughtsDebug.snapshotThought(spawnId);
      });
    };

    // Debug spawn functions
    window.__thoughtsDebug.spawnTestThought = function(options = {}) {
      const {
        text = "Test Thought",
        left = null, // px from left of scene
        top = null, // px from top of scene
        width = null, // px width
      } = options;

      const scene = document.getElementById("scene");
      const thoughtLayer = document.getElementById("thought-layer");
      const thoughtInput = document.getElementById("thoughts");

      if (!scene || !thoughtLayer) {
        return { error: "Scene or thought layer not found" };
      }

      const sceneRect = scene.getBoundingClientRect();
      const boxRect = thoughtInput ? thoughtInput.getBoundingClientRect() : null;
      const computed = thoughtInput ? window.getComputedStyle(thoughtInput) : null;

      const thought = document.createElement("div");
      thought.className = "thought";
      const spawnId = `debug-thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      thought.setAttribute("data-spawn-id", spawnId);
      thought.setAttribute("data-spawn-time", Date.now());

      // Set position
      const finalLeft = left !== null ? left : (boxRect ? boxRect.left - sceneRect.left : 0);
      const finalTop = top !== null ? top : (boxRect ? boxRect.top - sceneRect.top : 100);
      const finalWidth = width !== null ? width : (boxRect ? boxRect.width : 300);

      thought.style.left = `${finalLeft}px`;
      thought.style.top = `${finalTop}px`;
      thought.style.width = `${finalWidth}px`;

      if (computed) {
        thought.style.padding = computed.padding;
        thought.style.font = computed.font;
        thought.style.lineHeight = computed.lineHeight;
        thought.style.letterSpacing = computed.letterSpacing;
      }

      // Add text
      const wordsWrapper = document.createElement("span");
      wordsWrapper.className = "thought-words";
      const wordSpan = document.createElement("span");
      wordSpan.className = "thought-word";
      wordSpan.textContent = text;
      wordsWrapper.appendChild(wordSpan);
      thought.appendChild(wordsWrapper);

      // Add to DOM
      thoughtLayer.appendChild(thought);

      const rect = thought.getBoundingClientRect();

      return {
        success: true,
        spawnId,
        position: { left: finalLeft, top: finalTop, width: finalWidth },
        domRect: {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
        sceneRect: {
          top: sceneRect.top,
          left: sceneRect.left,
          width: sceneRect.width,
          height: sceneRect.height,
        },
      };
    };

    window.__thoughtsDebug.spawnTestGrid = function() {
      const scene = document.getElementById("scene");
      if (!scene) {
        return { error: "Scene not found" };
      }
      const sceneRect = scene.getBoundingClientRect();
      const centerX = sceneRect.width / 2;
      const centerY = sceneRect.height / 2;

      const positions = [
        { text: "Top-Left", left: 20, top: 20 },
        { text: "Top-Center", left: centerX - 100, top: 20 },
        { text: "Top-Right", left: sceneRect.width - 220, top: 20 },
        { text: "Middle-Left", left: 20, top: centerY - 20 },
        { text: "Center", left: centerX - 100, top: centerY - 20 },
        { text: "Middle-Right", left: sceneRect.width - 220, top: centerY - 20 },
        { text: "Bottom-Left", left: 20, top: sceneRect.height - 60 },
        { text: "Bottom-Center", left: centerX - 100, top: sceneRect.height - 60 },
        { text: "Bottom-Right", left: sceneRect.width - 220, top: sceneRect.height - 60 },
      ];

      const results = positions.map((pos) => {
        return window.__thoughtsDebug.spawnTestThought(pos);
      });

      return {
        success: true,
        count: results.length,
        results,
      };
    };

    window.__thoughtsDebug.clearAllThoughts = function() {
      const thoughtLayer = document.getElementById("thought-layer");
      if (!thoughtLayer) {
        return { error: "Thought layer not found" };
      }
      const thoughts = thoughtLayer.querySelectorAll(".thought");
      const count = thoughts.length;
      thoughts.forEach((thought) => thought.remove());
      return { success: true, removed: count };
    };

    window.__thoughtsDebug.getFullSnapshot = function(spawnId) {
      if (!spawnId && debugState.lastSpawn) {
        spawnId = debugState.lastSpawn.id;
      }
      if (!spawnId) {
        return { error: "No thought ID provided" };
      }

      const spawnData = window.__thoughtsDebug.getSpawnData(spawnId);
      const removalReason = debugState.removalReasons.get(spawnId);
      const thoughtEl = typeof document !== "undefined"
        ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`)
        : null;

      const snapshot = {
        timestamp: new Date().toISOString(),
        spawnId,
        inDOM: thoughtEl !== null,
        spawnData: spawnData || null,
        removalReason: removalReason || null,
      };

      if (thoughtEl) {
        const thoughtRect = thoughtEl.getBoundingClientRect();
        const thoughtStyle = window.getComputedStyle(thoughtEl);
        const wordElements = thoughtEl.querySelectorAll(".thought-word, .thought-space");

        snapshot.currentState = {
          thought: {
            rect: {
              top: thoughtRect.top,
              left: thoughtRect.left,
              bottom: thoughtRect.bottom,
              right: thoughtRect.right,
              width: thoughtRect.width,
              height: thoughtRect.height,
            },
            style: {
              top: thoughtEl.style.top,
              left: thoughtEl.style.left,
              width: thoughtEl.style.width,
            },
            computed: {
              zIndex: thoughtStyle.zIndex,
              opacity: thoughtStyle.opacity,
              position: thoughtStyle.position,
            },
          },
          words: Array.from(wordElements).map((el, idx) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const animations = el.getAnimations ? el.getAnimations() : [];
            return {
              index: idx,
              wordIndex: el.dataset.debugWordIndex ? parseInt(el.dataset.debugWordIndex) : null,
              lineNumber: el.dataset.debugLineNumber ? parseInt(el.dataset.debugLineNumber) : null,
              className: el.className,
              textContent: el.textContent,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
              computed: {
                animationName: style.animationName,
                animationDuration: style.animationDuration,
                animationDelay: style.animationDelay,
                animationPlayState: style.animationPlayState,
                opacity: style.opacity,
                transform: style.transform,
                cssVars: {
                  duration: style.getPropertyValue("--duration"),
                  delay: style.getPropertyValue("--delay"),
                  dx: style.getPropertyValue("--dx"),
                  dy: style.getPropertyValue("--dy"),
                },
              },
              animations: animations.map(a => {
                try {
                  return {
                    name: a.animationName,
                    playState: a.playState,
                    currentTime: a.currentTime,
                    duration: a.effect?.timing?.duration ?? null,
                    delay: a.effect?.timing?.delay ?? null,
                  };
                } catch (e) {
                  return { error: e.message };
                }
              }),
            };
          }),
        };
      }

      return snapshot;
    };

    window.__thoughtsDebug.disableCleanup = function() {
      if (typeof window !== "undefined") {
        window.__thoughtsDebugCleanupDisabled = true;
        return { success: true, message: "Cleanup disabled - thoughts will not be automatically removed" };
      }
      return { error: "Window not available" };
    };

    window.__thoughtsDebug.enableCleanup = function() {
      if (typeof window !== "undefined") {
        window.__thoughtsDebugCleanupDisabled = false;
        return { success: true, message: "Cleanup enabled" };
      }
      return { error: "Window not available" };
    };

    window.__thoughtsDebug.inspectThought = function(spawnId) {
      if (!spawnId && debugState.lastSpawn) {
        spawnId = debugState.lastSpawn.id;
      }
      if (!spawnId) {
        return { error: "No thought ID provided" };
      }

      const thoughtEl = typeof document !== "undefined"
        ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`)
        : null;

      if (!thoughtEl) {
        const removalReason = debugState.removalReasons.get(spawnId);
        const spawnData = debugState.spawnHistory.find((s) => s.id === spawnId) || debugState.lastSpawn;
        return {
          error: "Thought not found in DOM",
          spawnId,
          removalReason: removalReason || null,
          inHistory: spawnData || null,
          animationCheck: spawnData?.animationCheck || null,
        };
      }

      const thoughtRect = thoughtEl.getBoundingClientRect();
      const metrics = getViewportMetrics();
      const screenHeight = metrics.isKeyboardVisible ? metrics.layoutHeight : metrics.visualHeight;
      const screenWidth = metrics.layoutWidth || metrics.width || window.innerWidth || 0;
      const spawnTime = Number(thoughtEl.dataset.spawnTime) || null;
      const elapsed = spawnTime ? Date.now() - spawnTime : null;

      const isOffScreenTop = thoughtRect.bottom < -100;
      const isOffScreenBottom = thoughtRect.top > screenHeight + 100;
      const isOffScreenLeft = thoughtRect.right < 0;
      const isOffScreenRight = thoughtRect.left > screenWidth;
      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;

      return {
        spawnId,
        inDOM: true,
        rect: {
          top: thoughtRect.top,
          left: thoughtRect.left,
          bottom: thoughtRect.bottom,
          right: thoughtRect.right,
          width: thoughtRect.width,
          height: thoughtRect.height,
        },
        viewport: {
          screenHeight,
          screenWidth,
          visualHeight: metrics.visualHeight,
          layoutHeight: metrics.layoutHeight,
          keyboardVisible: metrics.isKeyboardVisible,
        },
        offScreenChecks: {
          top: isOffScreenTop,
          bottom: isOffScreenBottom,
          left: isOffScreenLeft,
          right: isOffScreenRight,
          any: isOffScreen,
        },
        spawnTime,
        elapsed,
        style: {
          top: thoughtEl.style.top,
          left: thoughtEl.style.left,
          width: thoughtEl.style.width,
        },
      };
    };
  } catch (e) {
    console.error("Error defining snapshot functions:", e);
  }
  window.__thoughtsDebug.enable = () => {
    localStorage.setItem("thoughts-debug", "true");
    window.location.reload();
  };
  window.__thoughtsDebug.disable = () => {
    localStorage.setItem("thoughts-debug", "false");
    window.location.reload();
  };

  if (DEBUG_ENABLED) {
    console.log("Thoughts Debug: Available functions:", Object.keys(window.__thoughtsDebug));
  }
}


