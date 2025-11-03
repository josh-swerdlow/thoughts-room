import { randomBetween, getViewportMetrics } from "./utils.js";

const DEFAULT_PROMPT_TEXT =
  "This is your thoughts room. Type out your thoughts in this box and then watch them float away when you press enter.";

export const initThoughtSpawner = ({
  scene,
  thoughtInput,
  thoughtLayer,
  animationConfig,
  promptText = DEFAULT_PROMPT_TEXT,
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

    const sceneRect = scene.getBoundingClientRect();
    const boxRect = thoughtInput.getBoundingClientRect();
    const computed = window.getComputedStyle(thoughtInput);

    const thought = document.createElement("div");
    thought.className = "thought";
    thought.style.left = `${boxRect.left - sceneRect.left}px`;
    thought.style.top = `${boxRect.top - sceneRect.top}px`;
    thought.style.width = `${boxRect.width}px`;
    thought.style.padding = computed.padding;
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
    const viewportMetrics = getViewportMetrics();
    const visibleHeight = viewportMetrics.height || window.innerHeight || 0;
    const fadeBuffer = visibleHeight * (animationConfig.travel.fadeBufferRatio || 0.18);

    const registerAnimation = (el, lineNumber = 0) => {
      const durationSeconds =
        animationConfig.duration.base +
        Math.random() * animationConfig.duration.random;
      const lineDelay = lineNumber * (animationConfig.delay.lineStep || 0.45);
      const delaySeconds = lineDelay + Math.random() * animationConfig.delay.max;
      const duration = durationSeconds * 1000;
      const delay = delaySeconds * 1000;
      const velocity = animationConfig.velocity.average || 0.6;

      const screenHeight = visibleHeight || window.innerHeight || 1080;
      const keyboardMultiplier = viewportMetrics.isKeyboardVisible ? 0.6 : 0.35;
      const minDistanceFromTextBox = Math.max(screenHeight * keyboardMultiplier, 160);

      let baseVerticalTravel =
        animationConfig.travel.vertical.base +
        Math.random() * animationConfig.travel.vertical.random;

      baseVerticalTravel = Math.max(baseVerticalTravel, minDistanceFromTextBox);

      const totalVerticalTravel = baseVerticalTravel + fadeBuffer;

      const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
      const dy = -totalVerticalTravel * velocity;

      const rotation = (Math.random() - 0.5) * animationConfig.erratic.rotationMax;
      const scale = 1;
      const blurStart = randomBetween(
        animationConfig.filter.blur.startMin,
        animationConfig.filter.blur.startMax,
      );
      const blurEnd = randomBetween(
        animationConfig.filter.blur.endMin,
        animationConfig.filter.blur.endMax,
      );
      const hueStart = randomBetween(
        animationConfig.filter.hue.startMin,
        animationConfig.filter.hue.startMax,
      );
      const hueEnd = randomBetween(
        animationConfig.filter.hue.endMin,
        animationConfig.filter.hue.endMax,
      );
      const opacityStart = randomBetween(
        animationConfig.opacity.startMin,
        animationConfig.opacity.startMax,
      );
      let opacityEnd = randomBetween(
        animationConfig.opacity.endMin,
        animationConfig.opacity.endMax,
      );
      opacityEnd = Math.min(opacityEnd, opacityStart);

      el.style.setProperty("--duration", `${duration}ms`);
      el.style.setProperty("--delay", `${delay}ms`);
      el.style.setProperty("--dx", `${dx}px`);
      el.style.setProperty("--dy", `${dy}px`);
      el.style.setProperty("--rotation", `${rotation}deg`);
      el.style.setProperty("--scale", scale.toString());
      el.style.setProperty("--blur-start", `${blurStart}px`);
      el.style.setProperty("--blur-end", `${blurEnd}px`);
      el.style.setProperty("--hue-start", `${hueStart}deg`);
      el.style.setProperty("--hue-end", `${hueEnd}deg`);
      el.style.setProperty("--opacity-start", opacityStart.toFixed(3));
      el.style.setProperty("--opacity-end", opacityEnd.toFixed(3));

      const lifetime = duration + delay;
      if (lifetime > maxLifetime) {
        maxLifetime = lifetime;
      }
    };

    const appendWord = (word, lineNumber) => {
      if (!word.length) {
        return;
      }
      const span = document.createElement("span");
      span.className = "thought-word";
      span.textContent = word;
      registerAnimation(span, lineNumber);
      wordsWrapper.appendChild(span);
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

    thoughtLayer.appendChild(thought);

    const wordElements = thought.querySelectorAll(".thought-word, .thought-space");
    let completedAnimations = 0;
    const totalAnimations = wordElements.length;

    const handleAnimationEnd = () => {
      completedAnimations += 1;
      if (completedAnimations >= totalAnimations) {
        window.setTimeout(() => {
          if (thought.parentNode) {
            thought.remove();
          }
        }, 100);
      }
    };

    wordElements.forEach((el) => {
      el.addEventListener("animationend", handleAnimationEnd, { once: true });
    });

    const checkAndRemove = () => {
      if (!thought.parentNode) {
        return;
      }

      const thoughtRect = thought.getBoundingClientRect();
      const viewportBounds = getViewportMetrics();
      const screenHeight = viewportBounds.height || window.innerHeight || 0;
      const screenWidth = viewportBounds.width || window.innerWidth || 0;
      const spawnTime = Number(thought.dataset.spawnTime) || Date.now();

      const isOffScreenTop = thoughtRect.bottom < 0;
      const isOffScreenBottom = thoughtRect.top > screenHeight;
      const isOffScreenLeft = thoughtRect.right < 0;
      const isOffScreenRight = thoughtRect.left > screenWidth;
      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;

      const elapsed = Date.now() - spawnTime;
      const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 1000;

      if (isOffScreen || shouldBeComplete) {
        thought.remove();
        return;
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(checkAndRemove, 200);
      });
    };

    thought.dataset.spawnTime = Date.now();
    window.setTimeout(checkAndRemove, 500);
  };

  const releasePrompt = () => {
    if (!promptActive || !thoughtInput) {
      return;
    }

    promptActive = false;
    thoughtInput.classList.remove("prompt-active");
    spawnThought(promptText);
    thoughtInput.value = "";
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

    if (thoughtInput && !thoughtInput.contains(event.target)) {
      thoughtInput.focus();
    }
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

