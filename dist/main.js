// assets/js/modules/prompt-glow.js
var setGlowState = (input, isActive) => {
  if (!input) {
    return;
  }
  if (isActive) {
    input.classList.add("prompt-active");
  } else {
    input.classList.remove("prompt-active");
  }
};
var initPromptGlow = (input) => {
  if (!input) {
    return;
  }
  setGlowState(input, true);
  input.addEventListener("focus", () => {
    setGlowState(input, false);
  });
  input.addEventListener("blur", () => {
    setGlowState(input, true);
  });
  window.addEventListener("visibilitychange", () => {
    if (document.activeElement === input) {
      setGlowState(input, false);
    } else {
      setGlowState(input, true);
    }
  });
  window.addEventListener("load", () => {
    if (document.activeElement === input) {
      setGlowState(input, false);
    } else {
      setGlowState(input, true);
    }
  });
};

// assets/js/modules/backgrounds.js
var DEFAULT_BACKGROUNDS = [
  "images/hubble-m44.webp",
  "images/hubble-m48.webp",
  "images/wild-duck-cluster.webp"
];
var initBackgrounds = ({
  skyElement: skyElement2,
  preloadLink = document.getElementById("background-preload"),
  backgrounds = DEFAULT_BACKGROUNDS
} = {}) => {
  if (!skyElement2 || !backgrounds.length) {
    return null;
  }
  const choice = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  if (preloadLink) {
    preloadLink.href = choice;
  }
  const img = new Image();
  img.src = choice;
  img.onload = () => {
    skyElement2.style.backgroundImage = `url("${choice}")`;
  };
  img.onerror = () => {
    skyElement2.style.backgroundImage = `url("${choice}")`;
  };
  return choice;
};

// assets/js/modules/utils.js
var randomBetween = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  if (Number.isNaN(low) || Number.isNaN(high)) {
    return 0;
  }
  return low + Math.random() * (high - low);
};
var clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }
  if (typeof max === "number") {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
};
var ensureOrder = (object, minKey, maxKey) => {
  if (object[minKey] > object[maxKey]) {
    const temp = object[minKey];
    object[minKey] = object[maxKey];
    object[maxKey] = temp;
  }
};
var formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "0";
  }
  const decimals = seconds >= 5 ? 1 : 2;
  const trimmed = Number(seconds.toFixed(decimals));
  return trimmed.toString();
};
var applyConfig = (target, source) => {
  Object.keys(source).forEach((key) => {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (typeof target[key] !== "object" || target[key] === null) {
        target[key] = Array.isArray(source[key]) ? [] : {};
      }
      applyConfig(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
};
var getViewportMetrics = () => {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      scale: 1,
      offsetTop: 0,
      offsetBottom: 0,
      isKeyboardVisible: false
    };
  }
  const innerWidth = window.innerWidth || 0;
  const innerHeight = window.innerHeight || 0;
  const visual = window.visualViewport;
  if (!visual) {
    return {
      width: innerWidth,
      height: innerHeight,
      scale: 1,
      offsetTop: 0,
      offsetBottom: 0,
      isKeyboardVisible: false
    };
  }
  const offsetTop = typeof visual.offsetTop === "number" ? visual.offsetTop : 0;
  const offsetBottom = Math.max(innerHeight - (visual.height + offsetTop), 0);
  const isKeyboardVisible = offsetBottom > 0 || visual.height < innerHeight;
  return {
    width: visual.width,
    height: visual.height,
    scale: typeof visual.scale === "number" ? visual.scale : 1,
    offsetTop,
    offsetBottom,
    isKeyboardVisible
  };
};

// assets/js/modules/animation-config.js
var DEFAULT_ANIMATION = {
  duration: {
    base: 4.2,
    random: 2.6
  },
  delay: {
    max: 0.36,
    lineStep: 0.45
  },
  travel: {
    vertical: {
      base: 110,
      random: 220
    },
    horizontal: {
      ratio: 0.28,
      min: 160
    },
    fadeBufferRatio: 0.18
  },
  velocity: {
    average: 0.6
  },
  erratic: {
    rotationMax: 10
  },
  filter: {
    blur: {
      startMin: 0.2,
      startMax: 0.8,
      endMin: 1.2,
      endMax: 2.6
    },
    hue: {
      startMin: -6,
      startMax: 6,
      endMin: -18,
      endMax: 18
    }
  },
  opacity: {
    startMin: 0.75,
    startMax: 1,
    endMin: 0,
    endMax: 0
  }
};
var animationConfig = JSON.parse(JSON.stringify(DEFAULT_ANIMATION));
var settingsInputs = /* @__PURE__ */ new Map();
var settingsConstraints = /* @__PURE__ */ new Map();
var settingsSchema = null;
var animationsFormEl = null;
var animationsResetEl = null;
var defaultsInitialized = false;
var getNestedValue = (target, path) => {
  return path.split(".").reduce((cursor, segment) => {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return cursor[segment];
    }
    return void 0;
  }, target);
};
var setNestedValue = (target, path, value) => {
  const segments = path.split(".");
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments.at(-1)] = value;
};
var resolveDynamicBound = (bound) => {
  if (bound == null) {
    return void 0;
  }
  if (typeof bound === "number") {
    return bound;
  }
  if (typeof bound === "object" && bound.type === "dynamic") {
    const scale = typeof bound.scale === "number" ? bound.scale : 1;
    const fallback = typeof bound.fallback === "number" ? bound.fallback : 0;
    const round = bound.round === true;
    const metrics = getViewportMetrics();
    const innerWidth = typeof window !== "undefined" ? window.innerWidth || 0 : 0;
    const innerHeight = typeof window !== "undefined" ? window.innerHeight || 0 : 0;
    let value;
    switch (bound.key) {
      case "viewportHeight":
        value = Math.max((metrics.height || innerHeight || fallback) * scale, 0);
        break;
      case "viewportWidth":
        value = Math.max((metrics.width || innerWidth || fallback) * scale, 0);
        break;
      default:
        return void 0;
    }
    return round ? Math.round(value) : value;
  }
  return void 0;
};
var clampBySchema = (path, value, fallbackMin, fallbackMax) => {
  const field = settingsConstraints.get(path);
  let minBound = typeof fallbackMin === "number" ? fallbackMin : void 0;
  let maxBound = typeof fallbackMax === "number" ? fallbackMax : void 0;
  if (field) {
    const absoluteMin = resolveDynamicBound(field.absoluteMin);
    const absoluteMax = resolveDynamicBound(field.absoluteMax);
    const fieldMin = resolveDynamicBound(field.min);
    const fieldMax = resolveDynamicBound(field.max);
    if (typeof absoluteMin === "number") {
      minBound = typeof minBound === "number" ? Math.max(minBound, absoluteMin) : absoluteMin;
    } else if (typeof fieldMin === "number") {
      minBound = typeof minBound === "number" ? Math.max(minBound, fieldMin) : fieldMin;
    }
    if (typeof absoluteMax === "number") {
      maxBound = typeof maxBound === "number" ? Math.min(maxBound, absoluteMax) : absoluteMax;
    } else if (typeof fieldMax === "number") {
      maxBound = typeof maxBound === "number" ? Math.min(maxBound, fieldMax) : fieldMax;
    }
  }
  if (typeof maxBound === "number") {
    let minValue = typeof minBound === "number" ? minBound : -Infinity;
    if (minValue > maxBound) {
      minValue = maxBound;
    }
    return clamp(value, minValue, maxBound);
  }
  if (typeof minBound === "number") {
    return clamp(value, minBound);
  }
  return value;
};
var clampProperty = (target, path, fallbackMin, fallbackMax) => {
  const current = getNestedValue(target, path);
  if (typeof current !== "number" || Number.isNaN(current)) {
    return;
  }
  const clamped = clampBySchema(path, current, fallbackMin, fallbackMax);
  setNestedValue(target, path, clamped);
};
var registerSchemaDefaults = (schema) => {
  settingsConstraints.clear();
  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      settingsConstraints.set(field.path, field);
      const resolvedDefault = resolveDynamicBound(field.default);
      if (typeof resolvedDefault === "number") {
        setNestedValue(DEFAULT_ANIMATION, field.path, resolvedDefault);
        setNestedValue(animationConfig, field.path, resolvedDefault);
      }
    });
  });
  normalizeAnimationConfig(DEFAULT_ANIMATION);
  applyConfig(animationConfig, DEFAULT_ANIMATION);
};
var loadInlineSettingsSchema = () => {
  const script = document.getElementById("animation-settings-data");
  if (!script || !script.textContent) {
    return null;
  }
  try {
    return JSON.parse(script.textContent);
  } catch (error) {
    console.error("Failed to parse inline animation settings", error);
  }
  return null;
};
var ensureAnimationConfigDefaults = () => {
  if (defaultsInitialized) {
    return;
  }
  const inlineSchema = loadInlineSettingsSchema();
  if (inlineSchema) {
    settingsSchema = inlineSchema;
    registerSchemaDefaults(inlineSchema);
    defaultsInitialized = true;
    return;
  }
  normalizeAnimationConfig(animationConfig);
  defaultsInitialized = true;
};
var createFieldControl = (field) => {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-field";
  const head = document.createElement("div");
  head.className = "slider-head";
  const fieldId = `field-${field.path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const titleLabel = document.createElement("label");
  titleLabel.setAttribute("for", fieldId);
  titleLabel.textContent = field.label;
  head.appendChild(titleLabel);
  if (field.type === "range") {
    const valueEl = document.createElement("span");
    valueEl.className = "slider-value";
    valueEl.dataset.valueDisplay = field.path;
    head.appendChild(valueEl);
  }
  wrapper.appendChild(head);
  if (field.prompt) {
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = field.prompt;
    wrapper.appendChild(hint);
  }
  const input = document.createElement("input");
  input.id = fieldId;
  input.type = field.type === "range" ? "range" : field.type || "number";
  input.dataset.configPath = field.path;
  if (field.unit) {
    input.dataset.unit = field.unit;
  }
  if (typeof field.step === "number") {
    input.step = field.step;
  }
  const minBound = resolveDynamicBound(field.min);
  if (typeof minBound === "number") {
    input.min = minBound;
  }
  const maxBound = resolveDynamicBound(field.max);
  if (typeof maxBound === "number") {
    input.max = maxBound;
  }
  settingsInputs.set(field.path, input);
  wrapper.appendChild(input);
  return wrapper;
};
var buildAnimationsForm = (schema) => {
  if (!animationsFormEl) {
    return;
  }
  const container = animationsFormEl.querySelector("[data-settings-container]");
  if (!container) {
    return;
  }
  settingsInputs.clear();
  container.innerHTML = "";
  schema.sections.forEach((section) => {
    const visibleFields = section.fields.filter((field) => field.public);
    if (!visibleFields.length) {
      return;
    }
    const sectionEl = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = section.title;
    sectionEl.appendChild(heading);
    if (section.prompt) {
      const sectionPrompt = document.createElement("p");
      sectionPrompt.className = "section-prompt";
      sectionPrompt.textContent = section.prompt;
      sectionEl.appendChild(sectionPrompt);
    }
    visibleFields.forEach((field) => {
      const control = createFieldControl(field);
      sectionEl.appendChild(control);
    });
    container.appendChild(sectionEl);
  });
  if (!container.children.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "modal-hint";
    emptyMessage.textContent = "No adjustable settings available.";
    container.appendChild(emptyMessage);
  }
};
var populateAnimationsForm = () => {
  if (!animationsFormEl || !settingsInputs.size) {
    return;
  }
  settingsInputs.forEach((input, path) => {
    const value = getConfigValue(path);
    if (typeof value === "number" && !Number.isNaN(value)) {
      input.value = value;
      if (input.type === "range") {
        updateSliderDisplay(path, value, input.dataset.unit || "");
      }
    }
  });
};
var normalizeAnimationConfig = (config) => {
  const pathsToClamp = [
    "duration.base",
    "duration.random",
    "delay.max",
    "delay.lineStep",
    "travel.vertical.base",
    "travel.vertical.random",
    "travel.horizontal.ratio",
    "travel.horizontal.min",
    "travel.fadeBufferRatio",
    "velocity.average",
    "erratic.rotationMax",
    "filter.blur.startMin",
    "filter.blur.startMax",
    "filter.blur.endMin",
    "filter.blur.endMax",
    "filter.hue.startMin",
    "filter.hue.startMax",
    "filter.hue.endMin",
    "filter.hue.endMax",
    "opacity.startMin",
    "opacity.startMax",
    "opacity.endMin",
    "opacity.endMax"
  ];
  pathsToClamp.forEach((path) => {
    clampProperty(config, path);
  });
  const blur = config.filter.blur;
  ensureOrder(blur, "startMin", "startMax");
  ensureOrder(blur, "endMin", "endMax");
  const hue = config.filter.hue;
  ensureOrder(hue, "startMin", "startMax");
  ensureOrder(hue, "endMin", "endMax");
  const opacity = config.opacity;
  ensureOrder(opacity, "startMin", "startMax");
  ensureOrder(opacity, "endMin", "endMax");
  clampProperty(config, "filter.blur.startMin");
  clampProperty(config, "filter.blur.startMax");
  clampProperty(config, "filter.blur.endMin");
  clampProperty(config, "filter.blur.endMax");
  clampProperty(config, "filter.hue.startMin");
  clampProperty(config, "filter.hue.startMax");
  clampProperty(config, "filter.hue.endMin");
  clampProperty(config, "filter.hue.endMax");
  clampProperty(config, "opacity.startMin");
  clampProperty(config, "opacity.startMax");
  clampProperty(config, "opacity.endMin");
  clampProperty(config, "opacity.endMax");
};
var getConfigValue = (path) => {
  return getNestedValue(animationConfig, path);
};
var setConfigValue = (path, value) => {
  setNestedValue(animationConfig, path, value);
};
var updateSliderDisplay = (path, value, unit = "") => {
  if (!animationsFormEl) {
    return;
  }
  const nodes = animationsFormEl.querySelectorAll(`[data-value-display="${path}"]`);
  if (!nodes.length) {
    return;
  }
  let formatted = "";
  if (unit === "seconds") {
    formatted = `${formatSeconds(value)}s`;
  } else if (Number.isFinite(value)) {
    formatted = value.toString();
  }
  nodes.forEach((node) => {
    node.textContent = formatted;
  });
};
var updateDynamicBounds = () => {
  if (!settingsSchema) {
    return;
  }
  settingsInputs.forEach((input, path) => {
    const field = settingsConstraints.get(path);
    if (!field) {
      return;
    }
    const resolvedMin = resolveDynamicBound(field.min);
    if (typeof resolvedMin === "number") {
      input.min = resolvedMin;
    }
    const resolvedMax = resolveDynamicBound(field.max);
    if (typeof resolvedMax === "number") {
      input.max = resolvedMax;
    }
  });
  normalizeAnimationConfig(animationConfig);
  if (animationsFormEl) {
    populateAnimationsForm();
  }
};
var initializeSettings = async () => {
  if (!animationsFormEl) {
    return;
  }
  const placeholder = animationsFormEl.querySelector("[data-settings-placeholder]");
  const inlineSchema = loadInlineSettingsSchema();
  const applySchema = (schema) => {
    settingsSchema = schema;
    registerSchemaDefaults(schema);
    defaultsInitialized = true;
    buildAnimationsForm(schema);
    updateDynamicBounds();
  };
  if (window.location.protocol === "file:") {
    if (inlineSchema) {
      applySchema(inlineSchema);
      return;
    }
  }
  try {
    const response = await fetch(new URL("animation-settings.json", window.location.href).href, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load settings: ${response.status}`);
    }
    const schema = await response.json();
    applySchema(schema);
  } catch (error) {
    if (inlineSchema) {
      applySchema(inlineSchema);
      return;
    }
    if (placeholder) {
      placeholder.textContent = "Unable to load settings.";
      placeholder.classList.add("error");
    }
    console.error(error);
  }
};
var handleFormInput = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const { configPath } = target.dataset;
  if (!configPath) {
    return;
  }
  const value = parseFloat(target.value);
  if (Number.isNaN(value)) {
    return;
  }
  setConfigValue(configPath, value);
  normalizeAnimationConfig(animationConfig);
  const updatedValue = getConfigValue(configPath);
  if (typeof updatedValue === "number" && !Number.isNaN(updatedValue)) {
    target.value = updatedValue;
    if (target.type === "range") {
      updateSliderDisplay(configPath, updatedValue, target.dataset.unit || "");
    }
  }
};
var resetToDefaults = () => {
  applyConfig(animationConfig, DEFAULT_ANIMATION);
  normalizeAnimationConfig(animationConfig);
  populateAnimationsForm();
};
normalizeAnimationConfig(animationConfig);
var initAnimationControls = ({
  form = document.getElementById("animations-form"),
  resetButton = document.getElementById("animations-reset")
} = {}) => {
  animationsFormEl = form;
  animationsResetEl = resetButton;
  if (animationsFormEl) {
    animationsFormEl.addEventListener("input", handleFormInput);
  }
  animationsResetEl == null ? void 0 : animationsResetEl.addEventListener("click", resetToDefaults);
  initializeSettings();
  const handleViewportChange = () => {
    if (!settingsSchema) {
      return;
    }
    updateDynamicBounds();
  };
  window.addEventListener("resize", handleViewportChange);
  if (typeof window !== "undefined" && window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
  }
  populateAnimationsForm();
  return {
    animationConfig,
    DEFAULT_ANIMATION,
    populateAnimationsForm,
    normalizeAnimationConfig,
    getConfigValue,
    setConfigValue,
    updateSliderDisplay,
    updateDynamicBounds,
    resetToDefaults
  };
};

// assets/js/modules/thought-spawner.js
var DEFAULT_PROMPT_TEXT = "This is your thoughts room. Type out your thoughts in this box and then watch them float away when you press enter.";
var initThoughtSpawner = ({
  scene: scene2,
  thoughtInput: thoughtInput2,
  thoughtLayer: thoughtLayer2,
  animationConfig: animationConfig2,
  promptText = DEFAULT_PROMPT_TEXT
} = {}) => {
  if (!scene2 || !thoughtInput2 || !thoughtLayer2 || !animationConfig2) {
    return null;
  }
  let promptActive = Boolean(thoughtInput2);
  let activeModalChecker = () => false;
  const spawnThought = (text) => {
    if (!scene2 || !thoughtInput2 || !thoughtLayer2) {
      return;
    }
    const sceneRect = scene2.getBoundingClientRect();
    const boxRect = thoughtInput2.getBoundingClientRect();
    const computed = window.getComputedStyle(thoughtInput2);
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
      boxRect.width * animationConfig2.travel.horizontal.ratio,
      animationConfig2.travel.horizontal.min
    );
    const viewportMetrics = getViewportMetrics();
    const visibleHeight = viewportMetrics.height || window.innerHeight || 0;
    const fadeBuffer = visibleHeight * (animationConfig2.travel.fadeBufferRatio || 0.18);
    const registerAnimation = (el, lineNumber = 0) => {
      const durationSeconds = animationConfig2.duration.base + Math.random() * animationConfig2.duration.random;
      const lineDelay = lineNumber * (animationConfig2.delay.lineStep || 0.45);
      const delaySeconds = lineDelay + Math.random() * animationConfig2.delay.max;
      const duration = durationSeconds * 1e3;
      const delay = delaySeconds * 1e3;
      const velocity = animationConfig2.velocity.average || 0.6;
      const screenHeight = visibleHeight || window.innerHeight || 1080;
      const keyboardMultiplier = viewportMetrics.isKeyboardVisible ? 0.6 : 0.35;
      const minDistanceFromTextBox = Math.max(screenHeight * keyboardMultiplier, 160);
      let baseVerticalTravel = animationConfig2.travel.vertical.base + Math.random() * animationConfig2.travel.vertical.random;
      baseVerticalTravel = Math.max(baseVerticalTravel, minDistanceFromTextBox);
      const totalVerticalTravel = baseVerticalTravel + fadeBuffer;
      const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
      const dy = -totalVerticalTravel * velocity;
      const rotation = (Math.random() - 0.5) * animationConfig2.erratic.rotationMax;
      const scale = 1;
      const blurStart = randomBetween(
        animationConfig2.filter.blur.startMin,
        animationConfig2.filter.blur.startMax
      );
      const blurEnd = randomBetween(
        animationConfig2.filter.blur.endMin,
        animationConfig2.filter.blur.endMax
      );
      const hueStart = randomBetween(
        animationConfig2.filter.hue.startMin,
        animationConfig2.filter.hue.startMax
      );
      const hueEnd = randomBetween(
        animationConfig2.filter.hue.endMin,
        animationConfig2.filter.hue.endMax
      );
      const opacityStart = randomBetween(
        animationConfig2.opacity.startMin,
        animationConfig2.opacity.startMax
      );
      let opacityEnd = randomBetween(
        animationConfig2.opacity.endMin,
        animationConfig2.opacity.endMax
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
    thoughtLayer2.appendChild(thought);
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
      const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 1e3;
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
    if (!promptActive || !thoughtInput2) {
      return;
    }
    promptActive = false;
    thoughtInput2.classList.remove("prompt-active");
    spawnThought(promptText);
    thoughtInput2.value = "";
  };
  if (promptActive) {
    thoughtInput2.value = promptText;
    thoughtInput2.classList.add("prompt-active");
  }
  thoughtInput2.addEventListener("pointerdown", () => {
    if (promptActive) {
      releasePrompt();
    }
  });
  thoughtInput2.addEventListener("focus", () => {
    if (promptActive) {
      releasePrompt();
    }
  });
  thoughtInput2.addEventListener("keydown", (event) => {
    if (promptActive) {
      releasePrompt();
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const trimmed = thoughtInput2.value.trim();
      if (!trimmed) {
        event.preventDefault();
        thoughtInput2.value = "";
        return;
      }
      event.preventDefault();
      spawnThought(trimmed);
      thoughtInput2.value = "";
    }
  });
  document.addEventListener("pointerdown", (event) => {
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    if (targetElement && (targetElement.closest(".nav-buttons") || targetElement.closest(".modal"))) {
      return;
    }
    if (activeModalChecker()) {
      return;
    }
    if (promptActive) {
      return;
    }
    if (thoughtInput2 && !thoughtInput2.contains(event.target)) {
      thoughtInput2.focus();
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
    isPromptActive: () => promptActive
  };
};

// assets/js/modules/audio.js
var initAudioControls = ({
  audioEl = document.getElementById("bg-audio"),
  muteButton = document.getElementById("music-toggle-mute"),
  playButton = document.getElementById("music-toggle-play"),
  trackSelect = document.getElementById("music-track"),
  volumeSlider = document.getElementById("music-volume"),
  musicForm = document.getElementById("music-form"),
  volumeDisplays = ((_a) => (_a = document.querySelectorAll("[data-volume-display]")) != null ? _a : [])()
} = {}) => {
  var _a2, _b;
  if (!audioEl) {
    return null;
  }
  let storedVolumeBeforeMute = 0.3;
  let audioFadedIn = false;
  const musicTrackOptions = trackSelect ? Array.from(trackSelect.options).map((option) => ({
    value: option.value,
    absolute: new URL(option.value, window.location.href).href
  })) : [];
  if (volumeSlider) {
    const initialVolume = parseFloat(volumeSlider.value);
    if (!Number.isNaN(initialVolume)) {
      audioEl.volume = clamp(initialVolume, 0, 1);
    }
  }
  if (audioEl && musicTrackOptions.length > 0 && !audioEl.getAttribute("src")) {
    audioEl.src = musicTrackOptions[0].absolute;
  }
  let currentTrack = audioEl ? new URL(
    audioEl.getAttribute("src") || audioEl.src || ((_a2 = musicTrackOptions[0]) == null ? void 0 : _a2.absolute) || "",
    window.location.href
  ).href : ((_b = musicTrackOptions[0]) == null ? void 0 : _b.absolute) || "";
  const updateVolumeDisplay = (value) => {
    if (!volumeDisplays.length) {
      return;
    }
    const safeValue = clamp(Number(value) || 0, 0, 1);
    const formatted = `${Math.round(safeValue * 100)}%`;
    volumeDisplays.forEach((node) => {
      node.textContent = formatted;
    });
  };
  const syncMusicControls = () => {
    if (muteButton) {
      muteButton.textContent = audioEl.muted ? "unmute" : "mute";
    }
    if (playButton) {
      playButton.textContent = audioEl.paused ? "resume" : "pause";
    }
    if (trackSelect) {
      const match = musicTrackOptions.find((option) => option.absolute === currentTrack);
      if (match) {
        trackSelect.value = match.value;
      }
    }
    if (volumeSlider) {
      volumeSlider.value = audioEl.muted ? 0 : audioEl.volume.toFixed(2);
    }
    updateVolumeDisplay(audioEl.muted ? 0 : audioEl.volume);
  };
  const fadeInAudio = () => {
    if (audioFadedIn || audioEl.muted) {
      return;
    }
    audioFadedIn = true;
    audioEl.volume = 0;
    const step = 0.015;
    const target = 0.3;
    const interval = window.setInterval(() => {
      try {
        if (audioEl.volume + step < target) {
          audioEl.volume = Math.min(audioEl.volume + step, target);
        } else {
          audioEl.volume = target;
          window.clearInterval(interval);
        }
      } catch (err) {
        window.clearInterval(interval);
      }
    }, 200);
  };
  const setMusicTrackByValue = (value) => {
    const match = musicTrackOptions.find((option) => option.value === value) || (value ? { value, absolute: new URL(value, window.location.href).href } : null);
    if (!match) {
      return;
    }
    currentTrack = match.absolute;
    audioEl.src = match.absolute;
    audioEl.load();
    audioEl.play().catch(() => {
    });
    syncMusicControls();
  };
  if (muteButton) {
    muteButton.addEventListener("click", () => {
      if (audioEl.muted) {
        audioEl.muted = false;
        audioEl.volume = storedVolumeBeforeMute > 0 ? storedVolumeBeforeMute : 0.3;
      } else {
        if (audioEl.volume > 0) {
          storedVolumeBeforeMute = audioEl.volume;
        }
        audioEl.volume = 0;
        audioEl.muted = true;
      }
      syncMusicControls();
    });
  }
  if (playButton) {
    playButton.addEventListener("click", () => {
      if (audioEl.paused) {
        audioEl.play().catch(() => {
        });
      } else {
        audioEl.pause();
      }
      syncMusicControls();
    });
  }
  if (trackSelect) {
    trackSelect.addEventListener("change", (event) => {
      setMusicTrackByValue(event.target.value);
    });
  }
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      if (Number.isNaN(value)) {
        return;
      }
      const clampedValue = clamp(value, 0, 1);
      if (clampedValue > 0) {
        if (audioEl.muted) {
          audioEl.muted = false;
        }
        audioEl.volume = clampedValue;
        storedVolumeBeforeMute = clampedValue;
      } else {
        audioEl.muted = true;
        audioEl.volume = 0;
      }
      syncMusicControls();
    });
  }
  if (volumeDisplays.length) {
    updateVolumeDisplay(audioEl.volume);
  }
  if (musicForm) {
    musicForm.addEventListener("submit", (event) => event.preventDefault());
  }
  window.addEventListener("load", () => {
    const startFade = () => {
      fadeInAudio();
      audioEl.removeEventListener("canplay", startFade);
    };
    audioEl.addEventListener("canplay", startFade, { once: true });
    audioEl.play().then(() => {
      fadeInAudio();
    }).catch(() => {
      document.addEventListener(
        "click",
        () => {
          audioEl.play().then(fadeInAudio).catch(() => {
          });
        },
        { once: true }
      );
    });
  });
  syncMusicControls();
  return {
    fadeInAudio,
    syncMusicControls,
    setMusicTrackByValue
  };
};

// assets/js/modules/modals.js
var initModals = ({
  aboutToggle = document.getElementById("about-toggle"),
  musicToggle = document.getElementById("music-toggle"),
  animationsToggle = document.getElementById("animations-toggle"),
  aboutModal = document.getElementById("about-modal"),
  musicModal = document.getElementById("music-modal"),
  animationsModal = document.getElementById("animations-modal"),
  onMusicOpen,
  onAnimationsOpen
} = {}) => {
  const modalRegistry = {
    about: {
      toggle: aboutToggle,
      modal: aboutModal
    },
    music: {
      toggle: musicToggle,
      modal: musicModal,
      onOpen: onMusicOpen
    },
    animations: {
      toggle: animationsToggle,
      modal: animationsModal,
      onOpen: onAnimationsOpen
    }
  };
  let activeModal = null;
  const setModalState = (name, expanded) => {
    var _a, _b, _c;
    const entry = modalRegistry[name];
    if (!entry) {
      return;
    }
    (_a = entry.modal) == null ? void 0 : _a.classList.toggle("active", expanded);
    (_b = entry.modal) == null ? void 0 : _b.setAttribute("aria-hidden", expanded ? "false" : "true");
    (_c = entry.toggle) == null ? void 0 : _c.setAttribute("aria-expanded", expanded ? "true" : "false");
  };
  const closeModal = () => {
    var _a, _b;
    if (!activeModal) {
      return;
    }
    const entry = modalRegistry[activeModal];
    setModalState(activeModal, false);
    (_a = entry.onClose) == null ? void 0 : _a.call(entry);
    (_b = entry.toggle) == null ? void 0 : _b.focus();
    activeModal = null;
  };
  const openModal = (name) => {
    var _a, _b;
    if (!modalRegistry[name]) {
      return;
    }
    if (activeModal && activeModal !== name) {
      closeModal();
    }
    activeModal = name;
    setModalState(name, true);
    (_b = (_a = modalRegistry[name]).onOpen) == null ? void 0 : _b.call(_a);
  };
  const toggleModal = (name) => {
    if (activeModal === name) {
      closeModal();
    } else {
      openModal(name);
    }
  };
  Object.entries(modalRegistry).forEach(([name, entry]) => {
    var _a, _b, _c, _d;
    (_a = entry.toggle) == null ? void 0 : _a.addEventListener("click", () => toggleModal(name));
    (_b = entry.modal) == null ? void 0 : _b.addEventListener("click", (event) => {
      if (event.target === entry.modal) {
        closeModal();
      }
    });
    (_d = (_c = entry.modal) == null ? void 0 : _c.querySelector(".modal-panel")) == null ? void 0 : _d.addEventListener("click", (event) => event.stopPropagation());
  });
  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal());
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal) {
      event.preventDefault();
      closeModal();
    }
  });
  return {
    openModal,
    closeModal,
    toggleModal,
    isAnyModalActive: () => Boolean(activeModal)
  };
};

// assets/js/main.js
var scene = document.getElementById("scene");
var thoughtInput = document.getElementById("thoughts");
var thoughtLayer = document.getElementById("thought-layer");
var skyElement = document.querySelector(".stars");
initPromptGlow(thoughtInput);
initBackgrounds({ skyElement });
ensureAnimationConfigDefaults();
var audioControls = initAudioControls();
var animationControls = null;
var ensureAnimationControls = () => {
  if (!animationControls) {
    animationControls = initAnimationControls();
  }
  return animationControls;
};
var modals = initModals({
  onMusicOpen: audioControls == null ? void 0 : audioControls.syncMusicControls,
  onAnimationsOpen: () => {
    var _a;
    const controls = ensureAnimationControls();
    (_a = controls == null ? void 0 : controls.populateAnimationsForm) == null ? void 0 : _a.call(controls);
  }
});
var thoughtSpawner = initThoughtSpawner({
  scene,
  thoughtInput,
  thoughtLayer,
  animationConfig
});
thoughtSpawner == null ? void 0 : thoughtSpawner.setActiveModalChecker(modals ? modals.isAnyModalActive : () => false);
//# sourceMappingURL=main.js.map
