import { randomBetween, getViewportMetrics } from "./utils.js";

const DEFAULT_PROMPT_TEXT =
  "Type out your thoughts in this box and then watch them float away when you press enter.";

export const initThoughtSpawner = ({
  scene,
  thoughtInput,
  thoughtLayer,
  animationConfig,
  promptText = DEFAULT_PROMPT_TEXT,
  viewport,
} = {}) => {
  if (!scene || !thoughtInput || !thoughtLayer || !animationConfig) {
    return null;
  }

  let promptActive = Boolean(thoughtInput);
  let activeModalChecker = () => false;

  const spawnThought = (text) => {
    if (!scene || !thoughtInput || !thoughtLayer) {
      return;
    }

    const boxRect = thoughtInput.getBoundingClientRect();
    const computed = window.getComputedStyle(thoughtInput);

    // DEBUG: Log textarea position and related info
    console.log('=== TEXTAREA DEBUG ===');
    console.log('boxRect:', {
      top: boxRect.top,
      left: boxRect.left,
      width: boxRect.width,
      height: boxRect.height,
      bottom: boxRect.bottom,
      right: boxRect.right
    });
    console.log('computed styles:', {
      borderTop: computed.borderTopWidth,
      borderLeft: computed.borderLeftWidth,
      paddingTop: computed.paddingTop,
      paddingLeft: computed.paddingLeft,
      position: computed.position,
      top: computed.top,
      left: computed.left
    });
    console.log('thoughtInput.getBoundingClientRect():', thoughtInput.getBoundingClientRect());
    console.log('thoughtLayer.getBoundingClientRect():', thoughtLayer.getBoundingClientRect());
    console.log('scene.getBoundingClientRect():', scene?.getBoundingClientRect());
    console.log('window.visualViewport:', window.visualViewport ? {
      offsetTop: window.visualViewport.offsetTop,
      offsetLeft: window.visualViewport.offsetLeft,
      height: window.visualViewport.height,
      width: window.visualViewport.width,
      scale: window.visualViewport.scale
    } : 'not available');
    console.log('window.scrollY:', window.scrollY);
    console.log('window.scrollX:', window.scrollX);

    const thought = document.createElement("div");
    thought.className = "thought";
    const viewportMetrics = getViewportMetrics();
    const spawnId = `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    thought.setAttribute("data-spawn-id", spawnId);

    // Since thought-layer is now fixed (like thoughts-shell), position relative to viewport
    // The textarea is fixed, so boxRect gives its viewport position directly
    // Account for border to align with content area
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const originLeft = boxRect.left + borderLeft;
    thought.style.left = `${originLeft}px`;

    // Position thought exactly where the text is in the textarea
    // Both thought-layer and thoughts-shell are fixed, so we can use viewport coordinates directly
    // Position at textStartTop (where text actually starts) so thought spawns directly on the text
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;

    // Position thought element at textStartTop - this is where the textarea's text actually begins
    let originTop = boxRect.top + borderTop + paddingTop;
    const originTopBeforeAdjust = originTop;

    console.log('=== POSITION CALCULATIONS ===');
    console.log('borderTop:', borderTop, 'paddingTop:', paddingTop);
    console.log('originTop (before adjustments):', originTop);
    console.log('originLeft:', originLeft);

    // Apply user-configurable spawn offset
    const spawnOffset = animationConfig.travel?.spawnOffset || 0;
    originTop = originTop + spawnOffset;

    // Clamp originTop to ensure thought doesn't extend below viewport
    // Only clamp if it would actually overflow - be much more permissive
    const estimatedMaxThoughtHeight = Math.max(boxRect.height * 2, 200);
    const viewportHeight = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomEstimate = originTop + estimatedMaxThoughtHeight;
    // Only clamp if the thought would extend WAY below viewport - use large buffer
    const buffer = 300; // Large buffer - only clamp if really necessary
    if (thoughtBottomEstimate > viewportHeight + buffer) {
      const maxAllowedTop = viewportHeight - estimatedMaxThoughtHeight - buffer;
      if (maxAllowedTop > 0 && originTop > maxAllowedTop) {
        // Only clamp if absolutely necessary, and preserve the original position as much as possible
        originTop = Math.min(maxAllowedTop, originTop); // Clamp down, but don't go below original
      }
    }

    const finalOriginTop = originTop;
    // Apply spawn offset from CSS custom property if set (check from thoughtLayer since thought isn't in DOM yet)
    const layerComputed = window.getComputedStyle(thoughtLayer);
    const cssOffset = layerComputed.getPropertyValue("--spawn-offset") ||
                      window.getComputedStyle(document.documentElement).getPropertyValue("--spawn-offset") ||
                      "0px";
    const cssOffsetValue = parseFloat(cssOffset) || 0;

    // Convert from viewport coordinates to thoughtLayer-relative coordinates
    // boxRect gives us viewport position, but thought.style.top is relative to thoughtLayer
    // So we need to subtract the thoughtLayer's viewport position
    const thoughtLayerRect = thoughtLayer.getBoundingClientRect();
    const thoughtLayerTop = thoughtLayerRect.top; // Viewport position of thoughtLayer (could be 0, -211, etc.)

    // Calculate position relative to thoughtLayer
    const relativeTop = finalOriginTop - thoughtLayerTop;
    const adjustedTop = relativeTop + cssOffsetValue;
    thought.style.top = `${adjustedTop}px`;
    thought.style.width = `${boxRect.width}px`;

    console.log('=== FINAL POSITION ===');
    console.log('finalOriginTop (viewport):', finalOriginTop);
    console.log('thoughtLayerTop (viewport):', thoughtLayerTop);
    console.log('relativeTop (relative to thoughtLayer):', relativeTop);
    console.log('cssOffsetValue:', cssOffsetValue);
    console.log('adjustedTop (thought.style.top):', adjustedTop);
    console.log('thought.style.left:', `${originLeft}px`);
    // Set padding with top padding removed since we're positioning at textStartTop
    // This makes the thought spawn directly on the text
    thought.style.padding = `0 ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    thought.style.font = computed.font;
    thought.style.lineHeight = computed.lineHeight;
    thought.style.letterSpacing = computed.letterSpacing;

    const wordsWrapper = document.createElement("span");
    wordsWrapper.className = "thought-words";
    thought.appendChild(wordsWrapper);

    const tokens = text.split(/(\s+)/);
    let maxLifetime = 0;
    let currentLineNumber = 0;
    const horizontalSpread = Math.max(
      boxRect.width * animationConfig.travel.horizontal.ratio,
      animationConfig.travel.horizontal.min,
    );
    const layoutHeight =
      viewportMetrics.layoutHeight ||
      viewportMetrics.height ||
      window.innerHeight ||
      0;
    const visualHeight = viewportMetrics.visualHeight || layoutHeight;
    const travelHeight = viewportMetrics.isKeyboardVisible ? layoutHeight : visualHeight;
    const fadeBuffer =
      layoutHeight * (animationConfig.travel.fadeBufferRatio || 0.18);
    const screenHeight = layoutHeight || window.innerHeight || 1080;
    const keyboardMultiplier = viewportMetrics.isKeyboardVisible ? 0.6 : 0.35;
    const minDistanceFromTextBox = Math.max(screenHeight * keyboardMultiplier, 160);

    const registerAnimation = (el, lineNumber = 0, wordIndex = 0) => {
      const registerStartTime = performance.now();
      const durationSeconds =
        animationConfig.duration.base +
        Math.random() * animationConfig.duration.random;
      const lineDelay = lineNumber * (animationConfig.delay.lineStep || 0.45);
      const delaySeconds = lineDelay + Math.random() * animationConfig.delay.max;
      const duration = durationSeconds * 1000;
      const delay = delaySeconds * 1000;
      const velocity = animationConfig.velocity.average || 0.6;

      let baseVerticalTravel =
        animationConfig.travel.vertical.base +
        Math.random() * animationConfig.travel.vertical.random;

      baseVerticalTravel = Math.max(baseVerticalTravel, minDistanceFromTextBox);

      const totalVerticalTravel = baseVerticalTravel + fadeBuffer;

      const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
      const dy = -totalVerticalTravel * velocity;

      const rotation = (Math.random() - 0.5) * animationConfig.erratic.rotationMax;
      const scale = 1;
      // Use constant values instead of random ranges
      const blurStart = animationConfig.filter?.blur?.start ??
                        (animationConfig.filter?.blur?.startMin ?? 0.5);
      const blurEnd = animationConfig.filter?.blur?.end ??
                      (animationConfig.filter?.blur?.endMin ?? 2.0);
      const hueStart = animationConfig.filter?.hue?.start ??
                       (animationConfig.filter?.hue?.startMin ?? 0);
      const hueEnd = animationConfig.filter?.hue?.end ??
                     (animationConfig.filter?.hue?.endMin ?? 0);
      const opacityStart = animationConfig.opacity?.start ??
                           (animationConfig.opacity?.startMin ?? 1);
      const opacityEnd = animationConfig.opacity?.end ??
                         (animationConfig.opacity?.endMin ?? 0);

      const calculatedValues = {
        durationSeconds,
        duration,
        delaySeconds,
        delay,
        lineNumber,
        wordIndex,
        dx,
        dy,
        rotation,
        opacityStart,
        opacityEnd,
        blurStart,
        blurEnd,
        hueStart,
        hueEnd,
        registerTime: registerStartTime,
      };

      // Store debug data on element
      if (window.__thoughtsDebug) {
        el.dataset.debugWordIndex = wordIndex;
        el.dataset.debugLineNumber = lineNumber;
        el.dataset.debugDuration = duration;
        el.dataset.debugDelay = delay;
      }

      // Round to integers to avoid CSS parsing issues with very long decimals
      // CSS doesn't need sub-millisecond precision for animations
      const durationMs = Math.round(duration);
      const delayMs = Math.round(delay);

      // Set CSS custom properties for keyframe variables
      el.style.setProperty("--duration", `${durationMs}ms`);
      el.style.setProperty("--delay", `${delayMs}ms`);
      el.style.setProperty("--dx", `${Math.round(dx * 100) / 100}px`);
      el.style.setProperty("--dy", `${Math.round(dy * 100) / 100}px`);
      el.style.setProperty("--rotation", `${rotation}deg`);
      el.style.setProperty("--scale", scale.toString());
      el.style.setProperty("--blur-start", `${blurStart}px`);
      el.style.setProperty("--blur-end", `${blurEnd}px`);
      el.style.setProperty("--hue-start", `${hueStart}deg`);
      el.style.setProperty("--hue-end", `${hueEnd}deg`);
      el.style.setProperty("--opacity-start", opacityStart.toFixed(3));
      el.style.setProperty("--opacity-end", opacityEnd.toFixed(3));

      // CRITICAL: Set the full animation property as inline style to override CSS rule
      // The animation shorthand with CSS variables may not resolve correctly in some browsers
      // Setting the full animation property ensures the browser uses our values
      // Format: name duration timing-function delay fill-mode
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;

      // Also set individual properties as backup (some browsers need this)
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;

      const lifetime = duration + delay;
      if (lifetime > maxLifetime) {
        maxLifetime = lifetime;
      }

      // Debug: Log if duration is suspiciously short
      if (duration <= 0 || delay < 0) {
        console.warn("Animation has invalid timing:", calculatedValues);
      }

      // Debug: Verify CSS properties were set
      if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
        const computedAfterSet = window.getComputedStyle(el);
        const verifyProps = {
          duration: computedAfterSet.getPropertyValue("--duration"),
          delay: computedAfterSet.getPropertyValue("--delay"),
          dx: computedAfterSet.getPropertyValue("--dx"),
          dy: computedAfterSet.getPropertyValue("--dy"),
        };

        const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
        const existing = getSpawnData(spawnId);
        const registrations = existing?.animationRegistrations || [];
        registrations.push({
          wordIndex,
          lineNumber,
          calculated: calculatedValues,
          cssPropsAfterSet: verifyProps,
          timestamp: performance.now(),
        });

        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationRegistrations: registrations,
        });
      }
    };

    let wordIndexCounter = 0;
    const appendWord = (word, lineNumber) => {
      if (!word.length) {
        return;
      }
      const wordIndex = wordIndexCounter++;
      const span = document.createElement("span");
      span.className = "thought-word";
      span.textContent = word;
      registerAnimation(span, lineNumber, wordIndex);
      wordsWrapper.appendChild(span);

      // Track when word is added
      if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          wordAdditions: [
            ...(window.__thoughtsDebug.getSpawnData?.(spawnId)?.wordAdditions || []),
            {
              wordIndex,
              lineNumber,
              word,
              timestamp: performance.now(),
              inDOM: span.parentNode !== null,
            },
          ],
        });
      }
    };

    const appendSpace = (spaceStr, lineNumber) => {
      if (!spaceStr.length) {
        return;
      }
      const span = document.createElement("span");
      span.className = "thought-space";
      span.textContent = spaceStr;
      registerAnimation(span, lineNumber);
      wordsWrapper.appendChild(span);
    };

    const appendBreak = (lineNumber) => {
      const span = document.createElement("span");
      span.className = "thought-break";
      registerAnimation(span, lineNumber);
      wordsWrapper.appendChild(span);
    };

    tokens.forEach((token) => {
      if (!token) {
        return;
      }

      if (/^\s+$/.test(token)) {
        let buffer = "";
        for (const char of token) {
          if (char === "\n") {
            if (buffer) {
              appendSpace(buffer, currentLineNumber);
              buffer = "";
            }
            appendBreak(currentLineNumber);
            currentLineNumber += 1;
          } else {
            buffer += char;
          }
        }
        if (buffer) {
          appendSpace(buffer, currentLineNumber);
        }
      } else {
        appendWord(token, currentLineNumber);
      }
    });

    if (!wordsWrapper.children.length) {
      appendWord(text, currentLineNumber);
    }

    if (!thoughtLayer) {
      if (window.__thoughtsDebug?.setSpawnData) {
        window.__thoughtsDebug.setSpawnData({
          id: spawnId,
          timestamp: Date.now(),
          originLeft,
          originTop,
          width: boxRect.width,
          travelHeight,
          fadeBuffer,
          layoutHeight,
          keyboardVisible: viewportMetrics.isKeyboardVisible,
          minDistance: minDistanceFromTextBox,
          textLength: text.length,
          textPreview: text.length > 20 ? text.substring(0, 20) + "..." : text,
          error: "thoughtLayer is null",
        });
      }
      return;
    }

    if (!thoughtLayer) {
      console.error("Thought spawner: thoughtLayer is null, cannot append thought");
      if (window.__thoughtsDebug?.setSpawnData) {
        window.__thoughtsDebug.setSpawnData({
          id: spawnId,
          timestamp: Date.now(),
          error: "thoughtLayer is null",
        });
      }
      return;
    }

    thoughtLayer.appendChild(thought);

    // Verify it was actually added
    const isInDOM = thought.parentNode === thoughtLayer;
    if (!isInDOM) {
      console.error("Thought spawner: Thought was not added to DOM after appendChild", {
        spawnId,
        thoughtParent: thought.parentNode,
        thoughtLayer,
      });
    }

    // After appending, check if thought extends below viewport and adjust if needed
    const thoughtRect = thought.getBoundingClientRect();

    console.log('=== AFTER APPEND TO DOM ===');
    console.log('thought.style.top:', thought.style.top);
    console.log('thought.style.left:', thought.style.left);
    console.log('thought.getBoundingClientRect():', {
      top: thoughtRect.top,
      left: thoughtRect.left,
      width: thoughtRect.width,
      height: thoughtRect.height,
      bottom: thoughtRect.bottom,
      right: thoughtRect.right
    });
    console.log('Difference from expected:', {
      topDiff: thoughtRect.top - adjustedTop,
      leftDiff: thoughtRect.left - originLeft
    });

    const viewportHeightAfterAppend = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomInViewport = thoughtRect.bottom;

    if (thoughtBottomInViewport > viewportHeightAfterAppend) {
      // Thought extends below viewport, adjust position
      const overflow = thoughtBottomInViewport - viewportHeightAfterAppend;
      const newTop = Math.max(0, finalOriginTop - overflow - 10); // 10px buffer
      thought.style.top = `${newTop}px`;

      if (window.__thoughtsDebug?.updateSpawnData) {
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          adjustedForOverflow: true,
          originalTop: finalOriginTop,
          adjustedTop: newTop,
          overflow,
        });
      }
    }

    if (window.__thoughtsDebug?.setSpawnData) {
      const computed = window.getComputedStyle(thought);
      // Recalculate thoughtRect in case position was adjusted
      const thoughtRectForDebug = thought.getBoundingClientRect();
      window.__thoughtsDebug.setSpawnData({
        id: spawnId,
        timestamp: Date.now(),
        originLeft,
        originTop: finalOriginTop,
        originTopBeforeAdjust,
        width: boxRect.width,
        travelHeight,
        fadeBuffer,
        layoutHeight,
        keyboardVisible: viewportMetrics.isKeyboardVisible,
        minDistance: minDistanceFromTextBox,
        textLength: text.length,
        textPreview: text.length > 20 ? text.substring(0, 20) + "..." : text,
        textareaRect: {
          top: boxRect.top,
          left: boxRect.left,
          width: boxRect.width,
          height: boxRect.height,
        },
        viewportRect: {
          width: viewportMetrics.visualWidth || viewportMetrics.width || window.innerWidth || 0,
          height: viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0,
        },
        zIndex: computed.zIndex || "auto",
        wordCount: 0,
        inDOMAfterAppend: isInDOM,
        thoughtRectAfterAppend: {
          top: thoughtRectForDebug.top,
          left: thoughtRectForDebug.left,
          bottom: thoughtRectForDebug.bottom,
          right: thoughtRectForDebug.right,
          width: thoughtRectForDebug.width,
          height: thoughtRectForDebug.height,
        },
      });
      window.setTimeout(() => {
        if (window.__thoughtsDebug?.refresh) {
          window.__thoughtsDebug.refresh();
        }
        // Check again after a delay
        const stillInDOM = thought.parentNode === thoughtLayer;
        if (!stillInDOM && isInDOM) {
          console.warn("Thought was removed from DOM between append and first check", spawnId);
          if (window.__thoughtsDebug?.updateSpawnData) {
            window.__thoughtsDebug.updateSpawnData(spawnId, {
              removedBeforeFirstCheck: true,
            });
          }
        }
      }, 50);
    }

    const wordElements = thought.querySelectorAll(".thought-word, .thought-space");
    let completedAnimations = 0;
    const totalAnimations = wordElements.length;

    if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
      window.__thoughtsDebug.updateSpawnData(spawnId, {
        wordCount: totalAnimations,
      });
    }

    // CRITICAL: Re-apply animation properties after thought is in DOM
    // Use double requestAnimationFrame to ensure this happens after browser applies CSS
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        wordElements.forEach((el) => {
          const expectedDuration = el.dataset.debugDuration;
          const expectedDelay = el.dataset.debugDelay;

          if (expectedDuration && expectedDelay) {
            const durationMs = Math.round(parseFloat(expectedDuration));
            const delayMs = Math.round(parseFloat(expectedDelay));

            // Force reflow before setting
            void el.offsetHeight;

            // Set animation properties with !important - this MUST override the CSS rule
            // Use setProperty with important flag
            el.style.setProperty("animation-duration", `${durationMs}ms`, "important");
            el.style.setProperty("animation-delay", `${delayMs}ms`, "important");
            el.style.setProperty("animation", `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`, "important");

            // Force another reflow after setting
            void el.offsetHeight;

            // Verify it was set correctly
            const computed = window.getComputedStyle(el);
            if (computed.animationDuration === "0.001s" || computed.animationDuration === "0s") {
              console.warn("Animation duration not applied correctly, retrying...", {
                expected: `${durationMs}ms`,
                got: computed.animationDuration,
                element: el,
              });
              // Retry with direct property assignment
              el.style.animationDuration = `${durationMs}ms`;
              el.style.animationDelay = `${delayMs}ms`;
              el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
            }
          }
        });
      });
    });

    const animationEndEvents = [];
    const handleAnimationEnd = (event) => {
      const endTime = performance.now();
      const target = event?.target || event?.currentTarget;
      const wordIndex = target?.dataset?.debugWordIndex;
      const lineNumber = target?.dataset?.debugLineNumber;
      const expectedDuration = target?.dataset?.debugDuration;
      const expectedDelay = target?.dataset?.debugDelay;

      completedAnimations += 1;

      // Track this animation end event
      if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
        const computedAtEnd = target ? window.getComputedStyle(target) : null;
        const animationsAtEnd = target?.getAnimations ? target.getAnimations() : [];

        animationEndEvents.push({
          wordIndex: wordIndex ? parseInt(wordIndex) : null,
          lineNumber: lineNumber ? parseInt(lineNumber) : null,
          timestamp: endTime,
          completedAnimations,
          totalAnimations,
          expectedDuration: expectedDuration ? parseFloat(expectedDuration) : null,
          expectedDelay: expectedDelay ? parseFloat(expectedDelay) : null,
          computedStyle: computedAtEnd ? {
            animationName: computedAtEnd.animationName,
            animationDuration: computedAtEnd.animationDuration,
            animationDelay: computedAtEnd.animationDelay,
            animationPlayState: computedAtEnd.animationPlayState,
            opacity: computedAtEnd.opacity,
            transform: computedAtEnd.transform,
          } : null,
          animations: animationsAtEnd.map(a => ({
            name: a.animationName,
            playState: a.playState,
            currentTime: a.currentTime,
            duration: a.effect?.timing?.duration ?? null,
            delay: a.effect?.timing?.delay ?? null,
          })),
        });

        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationEndEvents: [...animationEndEvents],
        });
      }

      if (completedAnimations >= totalAnimations) {
        window.setTimeout(() => {
          if (thought.parentNode) {
            const spawnId = thought.getAttribute("data-spawn-id");
            if (spawnId && window.__thoughtsDebug?.setRemovalReason) {
              window.__thoughtsDebug.setRemovalReason(spawnId, {
                reason: "all animations completed",
                completedAnimations,
                totalAnimations,
                timestamp: Date.now(),
                source: "handleAnimationEnd",
                allEndEvents: animationEndEvents,
              });
            }
            thought.remove();
          }
        }, 100);
      }
    };

    wordElements.forEach((el, index) => {
      const wordIndex = el.dataset.debugWordIndex;
      const lineNumber = el.dataset.debugLineNumber;
      const expectedDuration = el.dataset.debugDuration;
      const expectedDelay = el.dataset.debugDelay;

      // CRITICAL: Re-apply animation properties after element is in DOM
      // This ensures the inline styles override the CSS rule
      const durationMs = expectedDuration ? Math.round(parseFloat(expectedDuration)) : 5400;
      const delayMs = expectedDelay ? Math.round(parseFloat(expectedDelay)) : 0;

      // Force reflow and then set animation
      void el.offsetHeight; // Force reflow
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;

      // Track when listener is attached
      if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
        const computedBeforeListen = window.getComputedStyle(el);
        const animationsBeforeListen = el.getAnimations ? el.getAnimations() : [];
        const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
        const existing = getSpawnData(spawnId);

        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationListeners: [
            ...(existing?.animationListeners || []),
            {
              wordIndex: wordIndex ? parseInt(wordIndex) : index,
              lineNumber: lineNumber ? parseInt(lineNumber) : null,
              expectedDuration: expectedDuration ? parseFloat(expectedDuration) : null,
              expectedDelay: expectedDelay ? parseFloat(expectedDelay) : null,
              timestamp: performance.now(),
              appliedDuration: durationMs,
              appliedDelay: delayMs,
              computedBeforeListen: {
                animationName: computedBeforeListen.animationName,
                animationDuration: computedBeforeListen.animationDuration,
                animationDelay: computedBeforeListen.animationDelay,
                animationPlayState: computedBeforeListen.animationPlayState,
                cssVars: {
                  duration: computedBeforeListen.getPropertyValue("--duration"),
                  delay: computedBeforeListen.getPropertyValue("--delay"),
                  dx: computedBeforeListen.getPropertyValue("--dx"),
                  dy: computedBeforeListen.getPropertyValue("--dy"),
                },
              },
              animationsBeforeListen: animationsBeforeListen.map(a => ({
                name: a.animationName,
                playState: a.playState,
                currentTime: a.currentTime,
              })),
            },
          ],
        });
      }

      el.addEventListener("animationend", handleAnimationEnd, { once: true });

      // Also track animationstart if available
      el.addEventListener("animationstart", (event) => {
        if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
          const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
          const existing = getSpawnData(spawnId);
          window.__thoughtsDebug.updateSpawnData(spawnId, {
            animationStartEvents: [
              ...(existing?.animationStartEvents || []),
              {
                wordIndex: wordIndex ? parseInt(wordIndex) : index,
                timestamp: performance.now(),
                target: event.target?.className,
              },
            ],
          });
        }
      }, { once: true });

      // Debug: Check animation state immediately and after a delay
      if (window.__thoughtsDebug?.updateSpawnData && spawnId) {
        // Check immediately
        const checkAnimation = () => {
          if (!thought.parentNode) {
            // Thought was removed, can't check
            return;
          }

          const animations = el.getAnimations ? el.getAnimations() : [];
          const computedStyle = window.getComputedStyle(el);
          const animationName = computedStyle.animationName;
          const animationPlayState = computedStyle.animationPlayState;
          const animationDuration = computedStyle.animationDuration;
          const animationDelay = computedStyle.animationDelay;

          // Get CSS custom properties
          const duration = computedStyle.getPropertyValue("--duration");
          const delay = computedStyle.getPropertyValue("--delay");
          const dx = computedStyle.getPropertyValue("--dx");
          const dy = computedStyle.getPropertyValue("--dy");

          const checkData = {
            hasAnimations: animations.length > 0,
            animationCount: animations.length,
            animationName: animationName !== "none" ? animationName : null,
            animationPlayState,
            animationDuration,
            animationDelay,
            animationRunning: animations.some(a => a.playState === "running"),
            cssVars: {
              duration,
              delay,
              dx,
              dy,
            },
            animationDetails: animations.map(a => {
              try {
                return {
                  name: a.animationName,
                  duration: a.effect?.timing?.duration ?? null,
                  delay: a.effect?.timing?.delay ?? null,
                  playState: a.playState,
                  currentTime: a.currentTime,
                };
              } catch (e) {
                return {
                  name: a.animationName || "unknown",
                  error: e.message,
                  playState: a.playState,
                };
              }
            }),
          };

          window.__thoughtsDebug.updateSpawnData(spawnId, {
            animationCheck: checkData,
          });
        };

        // Check immediately
        checkAnimation();

        // Check again after a short delay
        window.setTimeout(checkAnimation, 50);
        window.setTimeout(checkAnimation, 200);
      }
    });

    const checkAndRemove = () => {
      if (!thought.parentNode) {
        // Thought was already removed by something else
        const spawnId = thought.getAttribute("data-spawn-id");
        if (spawnId && window.__thoughtsDebug?.setRemovalReason) {
          const existingReason = window.__thoughtsDebug.getRemovalReason?.(spawnId);
          if (!existingReason) {
            window.__thoughtsDebug.setRemovalReason(spawnId, {
              reason: "removed by external code (parentNode is null)",
              timestamp: Date.now(),
            });
          }
        }
        return;
      }

      // Check if cleanup is disabled for debugging
      if (typeof window !== "undefined" && window.__thoughtsDebugCleanupDisabled) {
        window.requestAnimationFrame(() => {
          window.setTimeout(checkAndRemove, 200);
        });
        return;
      }

      const thoughtRect = thought.getBoundingClientRect();
    const viewportBounds = getViewportMetrics();
    const visualHeight =
      viewportBounds.visualHeight ||
      viewportBounds.height ||
      window.innerHeight ||
      0;
    const layoutHeight =
      viewportBounds.layoutHeight ||
      viewportBounds.height ||
      window.innerHeight ||
      0;
    const screenHeight = viewportBounds.isKeyboardVisible ? layoutHeight : visualHeight;
    const screenWidth =
      viewportBounds.layoutWidth ||
      viewportBounds.width ||
      window.innerWidth ||
      0;
      const spawnTime = Number(thought.dataset.spawnTime) || Date.now();

      // getBoundingClientRect() returns coordinates relative to viewport
      // screenHeight/screenWidth are viewport dimensions
      // Add buffer to prevent premature removal (thoughts might be animating into view)
      const buffer = 150; // Increased buffer to account for animations
      const isOffScreenTop = thoughtRect.bottom < -buffer;
      const isOffScreenBottom = thoughtRect.top > screenHeight + buffer;
      const isOffScreenLeft = thoughtRect.right < -buffer;
      const isOffScreenRight = thoughtRect.left > screenWidth + buffer;
      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;

      const elapsed = Date.now() - spawnTime;
      const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 1000;

      if (isOffScreen || shouldBeComplete) {
        const spawnId = thought.getAttribute("data-spawn-id");
        if (spawnId && window.__thoughtsDebug?.setRemovalReason) {
          const reason = isOffScreen
            ? `off-screen: ${isOffScreenTop ? "top" : ""}${isOffScreenBottom ? "bottom" : ""}${isOffScreenLeft ? "left" : ""}${isOffScreenRight ? "right" : ""}`
            : "lifetime expired";
          window.__thoughtsDebug.setRemovalReason(spawnId, {
            reason,
            elapsed,
            maxLifetime,
            rect: {
              top: thoughtRect.top,
              bottom: thoughtRect.bottom,
              left: thoughtRect.left,
              right: thoughtRect.right,
            },
            screenHeight,
            screenWidth,
            viewportBounds: {
              visualHeight: viewportBounds.visualHeight,
              layoutHeight: viewportBounds.layoutHeight,
              isKeyboardVisible: viewportBounds.isKeyboardVisible,
            },
            checks: {
              isOffScreenTop,
              isOffScreenBottom,
              isOffScreenLeft,
              isOffScreenRight,
            },
          });
        }
        const spawnIdForCleanup = thought.getAttribute("data-spawn-id");
        if (spawnIdForCleanup && window.__thoughtsDebug?.setRemovalReason) {
          // Only set if not already set (to avoid overwriting)
          const existing = window.__thoughtsDebug.getRemovalReason?.(spawnIdForCleanup);
          if (!existing) {
            window.__thoughtsDebug.setRemovalReason(spawnIdForCleanup, {
              reason: isOffScreen
                ? `off-screen: ${isOffScreenTop ? "top" : ""}${isOffScreenBottom ? "bottom" : ""}${isOffScreenLeft ? "left" : ""}${isOffScreenRight ? "right" : ""}`
                : "lifetime expired",
              elapsed,
              maxLifetime,
              source: "checkAndRemove",
              timestamp: Date.now(),
            });
          }
        }
        thought.remove();
        return;
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(checkAndRemove, 200);
      });
    };

    thought.dataset.spawnTime = Date.now();
    // Delay cleanup start to give animations time to begin
    // Use a longer delay to ensure animations have started
    window.setTimeout(checkAndRemove, 1000);
  };

  const releasePrompt = () => {
    if (!promptActive || !thoughtInput) {
      return;
    }

    promptActive = false;
    thoughtInput.classList.remove("prompt-active");

    // Refresh viewport before spawning to ensure textarea position is accurate
    if (viewport && viewport.refresh) {
      viewport.refresh();
    }

    // Use requestAnimationFrame to ensure layout is updated before getting bounding rect
    requestAnimationFrame(() => {
      spawnThought(promptText);
      thoughtInput.value = "";
    });
  };

  if (promptActive) {
    thoughtInput.value = promptText;
    thoughtInput.classList.add("prompt-active");
  }

  thoughtInput.addEventListener("pointerdown", () => {
    if (promptActive) {
      releasePrompt();
    }
  });

  thoughtInput.addEventListener("focus", () => {
    if (promptActive) {
      releasePrompt();
    }
    // Immediately refresh viewport when textarea gains focus
    if (viewport && viewport.refresh) {
      viewport.refresh();
    }
  });

  thoughtInput.addEventListener("blur", () => {
    // Immediately refresh viewport when textarea loses focus
    if (viewport && viewport.refresh) {
      // Use a small delay to allow keyboard to fully dismiss
      setTimeout(() => {
        if (viewport && viewport.refresh) {
          viewport.refresh();
        }
      }, 100);
    }
  });

  thoughtInput.addEventListener("input", () => {
    // Refresh viewport when typing to ensure textarea stays positioned correctly
    if (viewport && viewport.refresh) {
      viewport.refresh();
    }
  });

  thoughtInput.addEventListener("keydown", (event) => {
    if (promptActive) {
      releasePrompt();
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      const trimmed = thoughtInput.value.trim();

      if (!trimmed) {
        event.preventDefault();
        thoughtInput.value = "";
        return;
      }

      event.preventDefault();
      spawnThought(trimmed);
      thoughtInput.value = "";
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    if (
      targetElement &&
      (targetElement.closest(".nav-buttons") || targetElement.closest(".modal"))
    ) {
      return;
    }

    if (activeModalChecker()) {
      return;
    }

    if (promptActive) {
      return;
    }

    if (!thoughtInput || thoughtInput.contains(event.target)) {
      return;
    }

    const pointerType = typeof event.pointerType === "string" ? event.pointerType : "";
    if (pointerType && pointerType !== "mouse") {
      thoughtInput.blur();
      return;
    }

    if (!pointerType) {
      const isCoarsePointer =
        typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;
      if (isCoarsePointer) {
        thoughtInput.blur();
        return;
      }
    }

    thoughtInput.focus();
  });

  const setActiveModalChecker = (fn) => {
    if (typeof fn === "function") {
      activeModalChecker = fn;
    }
  };

  return {
    spawnThought,
    releasePrompt,
    setActiveModalChecker,
    isPromptActive: () => promptActive,
  };
};

export { DEFAULT_PROMPT_TEXT };

