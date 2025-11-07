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
      layoutWidth: 0,
      layoutHeight: 0,
      visualWidth: 0,
      visualHeight: 0,
      keyboardOffset: 0,
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
      layoutWidth: innerWidth,
      layoutHeight: innerHeight,
      visualWidth: innerWidth,
      visualHeight: innerHeight,
      keyboardOffset: 0,
      scale: 1,
      offsetTop: 0,
      offsetBottom: 0,
      isKeyboardVisible: false
    };
  }
  const offsetTop = typeof visual.offsetTop === "number" ? visual.offsetTop : 0;
  const offsetBottom = Math.max(innerHeight - (visual.height + offsetTop), 0);
  const isKeyboardVisible = offsetBottom > 0 || offsetTop > 0 || visual.height < innerHeight * 0.85;
  const layoutWidth = innerWidth;
  const layoutHeight = innerHeight || visual.height || 0;
  const visualWidth = visual.width || layoutWidth;
  const visualHeight = visual.height || layoutHeight;
  const effectiveHeight = isKeyboardVisible ? Math.max(layoutHeight, visualHeight) : visualHeight;
  const keyboardOffset = isKeyboardVisible ? offsetBottom : 0;
  return {
    width: visualWidth,
    height: effectiveHeight,
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    keyboardOffset,
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
    max: 0,
    lineStep: 0
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
    fadeBufferRatio: 0.18,
    spawnOffset: 0
  },
  velocity: {
    average: 0.6
  },
  erratic: {
    rotationMax: 10
  },
  filter: {
    blur: {
      start: 0.5,
      end: 2
    },
    hue: {
      start: 0,
      end: 0
    }
  },
  opacity: {
    start: 1,
    end: 0
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
    const layoutWidth = metrics.layoutWidth || innerWidth;
    const layoutHeight = metrics.layoutHeight || innerHeight;
    let value;
    switch (bound.key) {
      case "viewportHeight":
        value = Math.max((metrics.height || layoutHeight || fallback) * scale, 0);
        break;
      case "viewportWidth":
        value = Math.max((metrics.width || layoutWidth || fallback) * scale, 0);
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
  promptText = DEFAULT_PROMPT_TEXT,
  viewport: viewport2
} = {}) => {
  if (!scene2 || !thoughtInput2 || !thoughtLayer2 || !animationConfig2) {
    return null;
  }
  let promptActive = Boolean(thoughtInput2);
  let activeModalChecker = () => false;
  const spawnThought = (text) => {
    var _a, _b, _c, _d, _e, _f;
    if (!scene2 || !thoughtInput2 || !thoughtLayer2) {
      return;
    }
    const boxRect = thoughtInput2.getBoundingClientRect();
    const computed = window.getComputedStyle(thoughtInput2);
    console.log("=== TEXTAREA DEBUG ===");
    console.log("boxRect:", {
      top: boxRect.top,
      left: boxRect.left,
      width: boxRect.width,
      height: boxRect.height,
      bottom: boxRect.bottom,
      right: boxRect.right
    });
    console.log("computed styles:", {
      borderTop: computed.borderTopWidth,
      borderLeft: computed.borderLeftWidth,
      paddingTop: computed.paddingTop,
      paddingLeft: computed.paddingLeft,
      position: computed.position,
      top: computed.top,
      left: computed.left
    });
    console.log("thoughtInput.getBoundingClientRect():", thoughtInput2.getBoundingClientRect());
    console.log("thoughtLayer.getBoundingClientRect():", thoughtLayer2.getBoundingClientRect());
    console.log("scene.getBoundingClientRect():", scene2 == null ? void 0 : scene2.getBoundingClientRect());
    console.log("window.visualViewport:", window.visualViewport ? {
      offsetTop: window.visualViewport.offsetTop,
      offsetLeft: window.visualViewport.offsetLeft,
      height: window.visualViewport.height,
      width: window.visualViewport.width,
      scale: window.visualViewport.scale
    } : "not available");
    console.log("window.scrollY:", window.scrollY);
    console.log("window.scrollX:", window.scrollX);
    const thought = document.createElement("div");
    thought.className = "thought";
    const viewportMetrics = getViewportMetrics();
    const spawnId = `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    thought.setAttribute("data-spawn-id", spawnId);
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const originLeft = boxRect.left + borderLeft;
    thought.style.left = `${originLeft}px`;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    let originTop = boxRect.top + borderTop + paddingTop;
    const originTopBeforeAdjust = originTop;
    console.log("=== POSITION CALCULATIONS ===");
    console.log("borderTop:", borderTop, "paddingTop:", paddingTop);
    console.log("originTop (before adjustments):", originTop);
    console.log("originLeft:", originLeft);
    const spawnOffset = ((_a = animationConfig2.travel) == null ? void 0 : _a.spawnOffset) || 0;
    originTop = originTop + spawnOffset;
    const estimatedMaxThoughtHeight = Math.max(boxRect.height * 2, 200);
    const viewportHeight = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomEstimate = originTop + estimatedMaxThoughtHeight;
    const buffer = 300;
    if (thoughtBottomEstimate > viewportHeight + buffer) {
      const maxAllowedTop = viewportHeight - estimatedMaxThoughtHeight - buffer;
      if (maxAllowedTop > 0 && originTop > maxAllowedTop) {
        originTop = Math.min(maxAllowedTop, originTop);
      }
    }
    const finalOriginTop = originTop;
    const layerComputed = window.getComputedStyle(thoughtLayer2);
    const cssOffset = layerComputed.getPropertyValue("--spawn-offset") || window.getComputedStyle(document.documentElement).getPropertyValue("--spawn-offset") || "0px";
    const cssOffsetValue = parseFloat(cssOffset) || 0;
    const thoughtLayerRect = thoughtLayer2.getBoundingClientRect();
    const thoughtLayerTop = thoughtLayerRect.top;
    const relativeTop = finalOriginTop - thoughtLayerTop;
    const adjustedTop = relativeTop + cssOffsetValue;
    thought.style.top = `${adjustedTop}px`;
    thought.style.width = `${boxRect.width}px`;
    console.log("=== FINAL POSITION ===");
    console.log("finalOriginTop (viewport):", finalOriginTop);
    console.log("thoughtLayerTop (viewport):", thoughtLayerTop);
    console.log("relativeTop (relative to thoughtLayer):", relativeTop);
    console.log("cssOffsetValue:", cssOffsetValue);
    console.log("adjustedTop (thought.style.top):", adjustedTop);
    console.log("thought.style.left:", `${originLeft}px`);
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
      boxRect.width * animationConfig2.travel.horizontal.ratio,
      animationConfig2.travel.horizontal.min
    );
    const layoutHeight = viewportMetrics.layoutHeight || viewportMetrics.height || window.innerHeight || 0;
    const visualHeight = viewportMetrics.visualHeight || layoutHeight;
    const travelHeight = viewportMetrics.isKeyboardVisible ? layoutHeight : visualHeight;
    const fadeBuffer = layoutHeight * (animationConfig2.travel.fadeBufferRatio || 0.18);
    const screenHeight = layoutHeight || window.innerHeight || 1080;
    const keyboardMultiplier = viewportMetrics.isKeyboardVisible ? 0.6 : 0.35;
    const minDistanceFromTextBox = Math.max(screenHeight * keyboardMultiplier, 160);
    const registerAnimation = (el, lineNumber = 0, wordIndex = 0) => {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G;
      const registerStartTime = performance.now();
      const durationSeconds = animationConfig2.duration.base + Math.random() * animationConfig2.duration.random;
      const lineDelay = lineNumber * (animationConfig2.delay.lineStep || 0.45);
      const delaySeconds = lineDelay + Math.random() * animationConfig2.delay.max;
      const duration = durationSeconds * 1e3;
      const delay = delaySeconds * 1e3;
      const velocity = animationConfig2.velocity.average || 0.6;
      let baseVerticalTravel = animationConfig2.travel.vertical.base + Math.random() * animationConfig2.travel.vertical.random;
      baseVerticalTravel = Math.max(baseVerticalTravel, minDistanceFromTextBox);
      const totalVerticalTravel = baseVerticalTravel + fadeBuffer;
      const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
      const dy = -totalVerticalTravel * velocity;
      const rotation = (Math.random() - 0.5) * animationConfig2.erratic.rotationMax;
      const scale = 1;
      const blurStart = (_f2 = (_b2 = (_a2 = animationConfig2.filter) == null ? void 0 : _a2.blur) == null ? void 0 : _b2.start) != null ? _f2 : (_e2 = (_d2 = (_c2 = animationConfig2.filter) == null ? void 0 : _c2.blur) == null ? void 0 : _d2.startMin) != null ? _e2 : 0.5;
      const blurEnd = (_l = (_h = (_g = animationConfig2.filter) == null ? void 0 : _g.blur) == null ? void 0 : _h.end) != null ? _l : (_k = (_j = (_i = animationConfig2.filter) == null ? void 0 : _i.blur) == null ? void 0 : _j.endMin) != null ? _k : 2;
      const hueStart = (_r = (_n = (_m = animationConfig2.filter) == null ? void 0 : _m.hue) == null ? void 0 : _n.start) != null ? _r : (_q = (_p = (_o = animationConfig2.filter) == null ? void 0 : _o.hue) == null ? void 0 : _p.startMin) != null ? _q : 0;
      const hueEnd = (_x = (_t = (_s = animationConfig2.filter) == null ? void 0 : _s.hue) == null ? void 0 : _t.end) != null ? _x : (_w = (_v = (_u = animationConfig2.filter) == null ? void 0 : _u.hue) == null ? void 0 : _v.endMin) != null ? _w : 0;
      const opacityStart = (_B = (_y = animationConfig2.opacity) == null ? void 0 : _y.start) != null ? _B : (_A = (_z = animationConfig2.opacity) == null ? void 0 : _z.startMin) != null ? _A : 1;
      const opacityEnd = (_F = (_C = animationConfig2.opacity) == null ? void 0 : _C.end) != null ? _F : (_E = (_D = animationConfig2.opacity) == null ? void 0 : _D.endMin) != null ? _E : 0;
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
        registerTime: registerStartTime
      };
      if (window.__thoughtsDebug) {
        el.dataset.debugWordIndex = wordIndex;
        el.dataset.debugLineNumber = lineNumber;
        el.dataset.debugDuration = duration;
        el.dataset.debugDelay = delay;
      }
      const durationMs = Math.round(duration);
      const delayMs = Math.round(delay);
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
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;
      const lifetime = duration + delay;
      if (lifetime > maxLifetime) {
        maxLifetime = lifetime;
      }
      if (duration <= 0 || delay < 0) {
        console.warn("Animation has invalid timing:", calculatedValues);
      }
      if (((_G = window.__thoughtsDebug) == null ? void 0 : _G.updateSpawnData) && spawnId) {
        const computedAfterSet = window.getComputedStyle(el);
        const verifyProps = {
          duration: computedAfterSet.getPropertyValue("--duration"),
          delay: computedAfterSet.getPropertyValue("--delay"),
          dx: computedAfterSet.getPropertyValue("--dx"),
          dy: computedAfterSet.getPropertyValue("--dy")
        };
        const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
        const existing = getSpawnData(spawnId);
        const registrations = (existing == null ? void 0 : existing.animationRegistrations) || [];
        registrations.push({
          wordIndex,
          lineNumber,
          calculated: calculatedValues,
          cssPropsAfterSet: verifyProps,
          timestamp: performance.now()
        });
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationRegistrations: registrations
        });
      }
    };
    let wordIndexCounter = 0;
    const appendWord = (word, lineNumber) => {
      var _a2, _b2, _c2, _d2;
      if (!word.length) {
        return;
      }
      const wordIndex = wordIndexCounter++;
      const span = document.createElement("span");
      span.className = "thought-word";
      span.textContent = word;
      registerAnimation(span, lineNumber, wordIndex);
      wordsWrapper.appendChild(span);
      if (((_a2 = window.__thoughtsDebug) == null ? void 0 : _a2.updateSpawnData) && spawnId) {
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          wordAdditions: [
            ...((_d2 = (_c2 = (_b2 = window.__thoughtsDebug).getSpawnData) == null ? void 0 : _c2.call(_b2, spawnId)) == null ? void 0 : _d2.wordAdditions) || [],
            {
              wordIndex,
              lineNumber,
              word,
              timestamp: performance.now(),
              inDOM: span.parentNode !== null
            }
          ]
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
        let buffer2 = "";
        for (const char of token) {
          if (char === "\n") {
            if (buffer2) {
              appendSpace(buffer2, currentLineNumber);
              buffer2 = "";
            }
            appendBreak(currentLineNumber);
            currentLineNumber += 1;
          } else {
            buffer2 += char;
          }
        }
        if (buffer2) {
          appendSpace(buffer2, currentLineNumber);
        }
      } else {
        appendWord(token, currentLineNumber);
      }
    });
    if (!wordsWrapper.children.length) {
      appendWord(text, currentLineNumber);
    }
    if (!thoughtLayer2) {
      if ((_b = window.__thoughtsDebug) == null ? void 0 : _b.setSpawnData) {
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
          error: "thoughtLayer is null"
        });
      }
      return;
    }
    if (!thoughtLayer2) {
      console.error("Thought spawner: thoughtLayer is null, cannot append thought");
      if ((_c = window.__thoughtsDebug) == null ? void 0 : _c.setSpawnData) {
        window.__thoughtsDebug.setSpawnData({
          id: spawnId,
          timestamp: Date.now(),
          error: "thoughtLayer is null"
        });
      }
      return;
    }
    thoughtLayer2.appendChild(thought);
    const isInDOM = thought.parentNode === thoughtLayer2;
    if (!isInDOM) {
      console.error("Thought spawner: Thought was not added to DOM after appendChild", {
        spawnId,
        thoughtParent: thought.parentNode,
        thoughtLayer: thoughtLayer2
      });
    }
    const thoughtRect = thought.getBoundingClientRect();
    console.log("=== AFTER APPEND TO DOM ===");
    console.log("thought.style.top:", thought.style.top);
    console.log("thought.style.left:", thought.style.left);
    console.log("thought.getBoundingClientRect():", {
      top: thoughtRect.top,
      left: thoughtRect.left,
      width: thoughtRect.width,
      height: thoughtRect.height,
      bottom: thoughtRect.bottom,
      right: thoughtRect.right
    });
    console.log("Difference from expected:", {
      topDiff: thoughtRect.top - adjustedTop,
      leftDiff: thoughtRect.left - originLeft
    });
    const viewportHeightAfterAppend = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomInViewport = thoughtRect.bottom;
    if (thoughtBottomInViewport > viewportHeightAfterAppend) {
      const overflow = thoughtBottomInViewport - viewportHeightAfterAppend;
      const newTop = Math.max(0, finalOriginTop - overflow - 10);
      thought.style.top = `${newTop}px`;
      if ((_d = window.__thoughtsDebug) == null ? void 0 : _d.updateSpawnData) {
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          adjustedForOverflow: true,
          originalTop: finalOriginTop,
          adjustedTop: newTop,
          overflow
        });
      }
    }
    if ((_e = window.__thoughtsDebug) == null ? void 0 : _e.setSpawnData) {
      const computed2 = window.getComputedStyle(thought);
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
          height: boxRect.height
        },
        viewportRect: {
          width: viewportMetrics.visualWidth || viewportMetrics.width || window.innerWidth || 0,
          height: viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0
        },
        zIndex: computed2.zIndex || "auto",
        wordCount: 0,
        inDOMAfterAppend: isInDOM,
        thoughtRectAfterAppend: {
          top: thoughtRectForDebug.top,
          left: thoughtRectForDebug.left,
          bottom: thoughtRectForDebug.bottom,
          right: thoughtRectForDebug.right,
          width: thoughtRectForDebug.width,
          height: thoughtRectForDebug.height
        }
      });
      window.setTimeout(() => {
        var _a2, _b2;
        if ((_a2 = window.__thoughtsDebug) == null ? void 0 : _a2.refresh) {
          window.__thoughtsDebug.refresh();
        }
        const stillInDOM = thought.parentNode === thoughtLayer2;
        if (!stillInDOM && isInDOM) {
          console.warn("Thought was removed from DOM between append and first check", spawnId);
          if ((_b2 = window.__thoughtsDebug) == null ? void 0 : _b2.updateSpawnData) {
            window.__thoughtsDebug.updateSpawnData(spawnId, {
              removedBeforeFirstCheck: true
            });
          }
        }
      }, 50);
    }
    const wordElements = thought.querySelectorAll(".thought-word, .thought-space");
    let completedAnimations = 0;
    const totalAnimations = wordElements.length;
    if (((_f = window.__thoughtsDebug) == null ? void 0 : _f.updateSpawnData) && spawnId) {
      window.__thoughtsDebug.updateSpawnData(spawnId, {
        wordCount: totalAnimations
      });
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        wordElements.forEach((el) => {
          const expectedDuration = el.dataset.debugDuration;
          const expectedDelay = el.dataset.debugDelay;
          if (expectedDuration && expectedDelay) {
            const durationMs = Math.round(parseFloat(expectedDuration));
            const delayMs = Math.round(parseFloat(expectedDelay));
            void el.offsetHeight;
            el.style.setProperty("animation-duration", `${durationMs}ms`, "important");
            el.style.setProperty("animation-delay", `${delayMs}ms`, "important");
            el.style.setProperty("animation", `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`, "important");
            void el.offsetHeight;
            const computed2 = window.getComputedStyle(el);
            if (computed2.animationDuration === "0.001s" || computed2.animationDuration === "0s") {
              console.warn("Animation duration not applied correctly, retrying...", {
                expected: `${durationMs}ms`,
                got: computed2.animationDuration,
                element: el
              });
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
      var _a2, _b2, _c2, _d2, _e2;
      const endTime = performance.now();
      const target = (event == null ? void 0 : event.target) || (event == null ? void 0 : event.currentTarget);
      const wordIndex = (_a2 = target == null ? void 0 : target.dataset) == null ? void 0 : _a2.debugWordIndex;
      const lineNumber = (_b2 = target == null ? void 0 : target.dataset) == null ? void 0 : _b2.debugLineNumber;
      const expectedDuration = (_c2 = target == null ? void 0 : target.dataset) == null ? void 0 : _c2.debugDuration;
      const expectedDelay = (_d2 = target == null ? void 0 : target.dataset) == null ? void 0 : _d2.debugDelay;
      completedAnimations += 1;
      if (((_e2 = window.__thoughtsDebug) == null ? void 0 : _e2.updateSpawnData) && spawnId) {
        const computedAtEnd = target ? window.getComputedStyle(target) : null;
        const animationsAtEnd = (target == null ? void 0 : target.getAnimations) ? target.getAnimations() : [];
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
            transform: computedAtEnd.transform
          } : null,
          animations: animationsAtEnd.map((a) => {
            var _a3, _b3, _c3, _d3, _e3, _f2;
            return {
              name: a.animationName,
              playState: a.playState,
              currentTime: a.currentTime,
              duration: (_c3 = (_b3 = (_a3 = a.effect) == null ? void 0 : _a3.timing) == null ? void 0 : _b3.duration) != null ? _c3 : null,
              delay: (_f2 = (_e3 = (_d3 = a.effect) == null ? void 0 : _d3.timing) == null ? void 0 : _e3.delay) != null ? _f2 : null
            };
          })
        });
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationEndEvents: [...animationEndEvents]
        });
      }
      if (completedAnimations >= totalAnimations) {
        window.setTimeout(() => {
          var _a3;
          if (thought.parentNode) {
            const spawnId2 = thought.getAttribute("data-spawn-id");
            if (spawnId2 && ((_a3 = window.__thoughtsDebug) == null ? void 0 : _a3.setRemovalReason)) {
              window.__thoughtsDebug.setRemovalReason(spawnId2, {
                reason: "all animations completed",
                completedAnimations,
                totalAnimations,
                timestamp: Date.now(),
                source: "handleAnimationEnd",
                allEndEvents: animationEndEvents
              });
            }
            thought.remove();
          }
        }, 100);
      }
    };
    wordElements.forEach((el, index) => {
      var _a2, _b2;
      const wordIndex = el.dataset.debugWordIndex;
      const lineNumber = el.dataset.debugLineNumber;
      const expectedDuration = el.dataset.debugDuration;
      const expectedDelay = el.dataset.debugDelay;
      const durationMs = expectedDuration ? Math.round(parseFloat(expectedDuration)) : 5400;
      const delayMs = expectedDelay ? Math.round(parseFloat(expectedDelay)) : 0;
      void el.offsetHeight;
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;
      if (((_a2 = window.__thoughtsDebug) == null ? void 0 : _a2.updateSpawnData) && spawnId) {
        const computedBeforeListen = window.getComputedStyle(el);
        const animationsBeforeListen = el.getAnimations ? el.getAnimations() : [];
        const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
        const existing = getSpawnData(spawnId);
        window.__thoughtsDebug.updateSpawnData(spawnId, {
          animationListeners: [
            ...(existing == null ? void 0 : existing.animationListeners) || [],
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
                  dy: computedBeforeListen.getPropertyValue("--dy")
                }
              },
              animationsBeforeListen: animationsBeforeListen.map((a) => ({
                name: a.animationName,
                playState: a.playState,
                currentTime: a.currentTime
              }))
            }
          ]
        });
      }
      el.addEventListener("animationend", handleAnimationEnd, { once: true });
      el.addEventListener("animationstart", (event) => {
        var _a3, _b3;
        if (((_a3 = window.__thoughtsDebug) == null ? void 0 : _a3.updateSpawnData) && spawnId) {
          const getSpawnData = window.__thoughtsDebug.getSpawnData || (() => null);
          const existing = getSpawnData(spawnId);
          window.__thoughtsDebug.updateSpawnData(spawnId, {
            animationStartEvents: [
              ...(existing == null ? void 0 : existing.animationStartEvents) || [],
              {
                wordIndex: wordIndex ? parseInt(wordIndex) : index,
                timestamp: performance.now(),
                target: (_b3 = event.target) == null ? void 0 : _b3.className
              }
            ]
          });
        }
      }, { once: true });
      if (((_b2 = window.__thoughtsDebug) == null ? void 0 : _b2.updateSpawnData) && spawnId) {
        const checkAnimation = () => {
          if (!thought.parentNode) {
            return;
          }
          const animations = el.getAnimations ? el.getAnimations() : [];
          const computedStyle = window.getComputedStyle(el);
          const animationName = computedStyle.animationName;
          const animationPlayState = computedStyle.animationPlayState;
          const animationDuration = computedStyle.animationDuration;
          const animationDelay = computedStyle.animationDelay;
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
            animationRunning: animations.some((a) => a.playState === "running"),
            cssVars: {
              duration,
              delay,
              dx,
              dy
            },
            animationDetails: animations.map((a) => {
              var _a3, _b3, _c2, _d2, _e2, _f2;
              try {
                return {
                  name: a.animationName,
                  duration: (_c2 = (_b3 = (_a3 = a.effect) == null ? void 0 : _a3.timing) == null ? void 0 : _b3.duration) != null ? _c2 : null,
                  delay: (_f2 = (_e2 = (_d2 = a.effect) == null ? void 0 : _d2.timing) == null ? void 0 : _e2.delay) != null ? _f2 : null,
                  playState: a.playState,
                  currentTime: a.currentTime
                };
              } catch (e) {
                return {
                  name: a.animationName || "unknown",
                  error: e.message,
                  playState: a.playState
                };
              }
            })
          };
          window.__thoughtsDebug.updateSpawnData(spawnId, {
            animationCheck: checkData
          });
        };
        checkAnimation();
        window.setTimeout(checkAnimation, 50);
        window.setTimeout(checkAnimation, 200);
      }
    });
    const checkAndRemove = () => {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g;
      if (!thought.parentNode) {
        const spawnId2 = thought.getAttribute("data-spawn-id");
        if (spawnId2 && ((_a2 = window.__thoughtsDebug) == null ? void 0 : _a2.setRemovalReason)) {
          const existingReason = (_c2 = (_b2 = window.__thoughtsDebug).getRemovalReason) == null ? void 0 : _c2.call(_b2, spawnId2);
          if (!existingReason) {
            window.__thoughtsDebug.setRemovalReason(spawnId2, {
              reason: "removed by external code (parentNode is null)",
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      if (typeof window !== "undefined" && window.__thoughtsDebugCleanupDisabled) {
        window.requestAnimationFrame(() => {
          window.setTimeout(checkAndRemove, 200);
        });
        return;
      }
      const thoughtRect2 = thought.getBoundingClientRect();
      const viewportBounds = getViewportMetrics();
      const visualHeight2 = viewportBounds.visualHeight || viewportBounds.height || window.innerHeight || 0;
      const layoutHeight2 = viewportBounds.layoutHeight || viewportBounds.height || window.innerHeight || 0;
      const screenHeight2 = viewportBounds.isKeyboardVisible ? layoutHeight2 : visualHeight2;
      const screenWidth = viewportBounds.layoutWidth || viewportBounds.width || window.innerWidth || 0;
      const spawnTime = Number(thought.dataset.spawnTime) || Date.now();
      const buffer2 = 150;
      const isOffScreenTop = thoughtRect2.bottom < -buffer2;
      const isOffScreenBottom = thoughtRect2.top > screenHeight2 + buffer2;
      const isOffScreenLeft = thoughtRect2.right < -buffer2;
      const isOffScreenRight = thoughtRect2.left > screenWidth + buffer2;
      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;
      const elapsed = Date.now() - spawnTime;
      const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 1e3;
      if (isOffScreen || shouldBeComplete) {
        const spawnId2 = thought.getAttribute("data-spawn-id");
        if (spawnId2 && ((_d2 = window.__thoughtsDebug) == null ? void 0 : _d2.setRemovalReason)) {
          const reason = isOffScreen ? `off-screen: ${isOffScreenTop ? "top" : ""}${isOffScreenBottom ? "bottom" : ""}${isOffScreenLeft ? "left" : ""}${isOffScreenRight ? "right" : ""}` : "lifetime expired";
          window.__thoughtsDebug.setRemovalReason(spawnId2, {
            reason,
            elapsed,
            maxLifetime,
            rect: {
              top: thoughtRect2.top,
              bottom: thoughtRect2.bottom,
              left: thoughtRect2.left,
              right: thoughtRect2.right
            },
            screenHeight: screenHeight2,
            screenWidth,
            viewportBounds: {
              visualHeight: viewportBounds.visualHeight,
              layoutHeight: viewportBounds.layoutHeight,
              isKeyboardVisible: viewportBounds.isKeyboardVisible
            },
            checks: {
              isOffScreenTop,
              isOffScreenBottom,
              isOffScreenLeft,
              isOffScreenRight
            }
          });
        }
        const spawnIdForCleanup = thought.getAttribute("data-spawn-id");
        if (spawnIdForCleanup && ((_e2 = window.__thoughtsDebug) == null ? void 0 : _e2.setRemovalReason)) {
          const existing = (_g = (_f2 = window.__thoughtsDebug).getRemovalReason) == null ? void 0 : _g.call(_f2, spawnIdForCleanup);
          if (!existing) {
            window.__thoughtsDebug.setRemovalReason(spawnIdForCleanup, {
              reason: isOffScreen ? `off-screen: ${isOffScreenTop ? "top" : ""}${isOffScreenBottom ? "bottom" : ""}${isOffScreenLeft ? "left" : ""}${isOffScreenRight ? "right" : ""}` : "lifetime expired",
              elapsed,
              maxLifetime,
              source: "checkAndRemove",
              timestamp: Date.now()
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
    window.setTimeout(checkAndRemove, 1e3);
  };
  const releasePrompt = () => {
    if (!promptActive || !thoughtInput2) {
      return;
    }
    promptActive = false;
    thoughtInput2.classList.remove("prompt-active");
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
    }
    requestAnimationFrame(() => {
      spawnThought(promptText);
      thoughtInput2.value = "";
    });
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
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
    }
  });
  thoughtInput2.addEventListener("blur", () => {
    if (viewport2 && viewport2.refresh) {
      setTimeout(() => {
        if (viewport2 && viewport2.refresh) {
          viewport2.refresh();
        }
      }, 100);
    }
  });
  thoughtInput2.addEventListener("input", () => {
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
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
    var _a, _b;
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
    if (!thoughtInput2 || thoughtInput2.contains(event.target)) {
      return;
    }
    const pointerType = typeof event.pointerType === "string" ? event.pointerType : "";
    if (pointerType && pointerType !== "mouse") {
      thoughtInput2.blur();
      return;
    }
    if (!pointerType) {
      const isCoarsePointer = typeof window !== "undefined" && ((_b = (_a = window.matchMedia) == null ? void 0 : _a.call(window, "(pointer: coarse)")) == null ? void 0 : _b.matches);
      if (isCoarsePointer) {
        thoughtInput2.blur();
        return;
      }
    }
    thoughtInput2.focus();
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

// assets/js/modules/navigation-toggle.js
var BREAKPOINT_QUERY = "(max-width: 35rem)";
var initNavigationToggle = ({
  container = document.querySelector(".nav-buttons"),
  toggle = document.getElementById("nav-toggle"),
  actions = document.getElementById("nav-actions")
} = {}) => {
  var _a;
  if (!container || !toggle || !actions) {
    return null;
  }
  let isOpen = false;
  const mediaQuery = typeof window !== "undefined" ? (_a = window.matchMedia) == null ? void 0 : _a.call(window, BREAKPOINT_QUERY) : null;
  const setOpen = (open) => {
    isOpen = Boolean(open);
    container.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };
  const toggleMenu = () => {
    setOpen(!isOpen);
  };
  const handlePointerDown = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }
    if (!container.contains(target)) {
      setOpen(false);
    }
  };
  const handleKeyDown = (event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setOpen(false);
      toggle.focus();
    }
  };
  const handleBreakpointChange = (event) => {
    if (!event.matches) {
      setOpen(false);
    }
  };
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });
  toggle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);
  const handleActionClick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }
    if (toggle.contains(target)) {
      return;
    }
    if (target.closest(".glass-button")) {
      setOpen(false);
    }
  };
  actions.addEventListener("click", handleActionClick);
  if (mediaQuery == null ? void 0 : mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleBreakpointChange);
  } else if (mediaQuery == null ? void 0 : mediaQuery.addListener) {
    mediaQuery.addListener(handleBreakpointChange);
  }
  const destroy = () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);
    actions.removeEventListener("click", handleActionClick);
    if (mediaQuery == null ? void 0 : mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", handleBreakpointChange);
    } else if (mediaQuery == null ? void 0 : mediaQuery.removeListener) {
      mediaQuery.removeListener(handleBreakpointChange);
    }
  };
  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: toggleMenu,
    destroy,
    isOpen: () => isOpen
  };
};

// assets/js/modules/viewport.js
var DEBUG_ENABLED = (() => {
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
var debugState = {
  metrics: null,
  lastSpawn: null,
  spawnHistory: [],
  thoughtCount: 0,
  overlay: null,
  removalReasons: /* @__PURE__ */ new Map()
};
var ensureDebugOverlay = () => {
  var _a;
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
  (_a = document.body) == null ? void 0 : _a.appendChild(overlay);
  debugState.overlay = overlay;
  return overlay;
};
var renderDebugOverlay = () => {
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
      metrics.visualHeight || metrics.height || 0
    )}`,
    `layout:   ${Math.round(metrics.layoutWidth || 0)} x ${Math.round(metrics.layoutHeight || 0)}`,
    `offsets:  top ${Math.round(metrics.offsetTop || 0)} | bottom ${Math.round(
      metrics.keyboardOffset || metrics.offsetBottom || 0
    )}`,
    `keyboard: ${metrics.isKeyboardVisible ? "visible" : "hidden"}`
  ];
  if (debugState.lastSpawn) {
    const spawn = debugState.lastSpawn;
    const thoughtEl = typeof document !== "undefined" ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawn.id}"]`) : null;
    const thoughtExists = thoughtEl !== null;
    const thoughtVisible = thoughtEl ? thoughtEl.getBoundingClientRect().height > 0 : false;
    const thoughtRect = thoughtEl ? thoughtEl.getBoundingClientRect() : null;
    lines.push(
      "--- last thought ---",
      `created: ${spawn.timestamp ? new Date(spawn.timestamp).toLocaleTimeString() : "unknown"}`,
      `total: ${debugState.thoughtCount}`,
      `words: ${spawn.wordCount || 0}`,
      `origin: (${Math.round(spawn.originLeft || 0)}, ${Math.round(spawn.originTop)})`
    );
    if (spawn.originTopBeforeAdjust !== void 0 && spawn.originTopBeforeAdjust !== spawn.originTop) {
      lines.push(`origin (raw): ${Math.round(spawn.originTopBeforeAdjust)}`);
    }
    lines.push(
      `width: ${Math.round(spawn.width)}`,
      `z-index: ${spawn.zIndex || "auto"}`,
      `in DOM: ${thoughtExists ? "yes" : "no"}`,
      `visible: ${thoughtVisible ? "yes" : "no"}`
    );
    if (spawn.error) {
      lines.push(`ERROR: ${spawn.error}`);
    }
    const removalReason = debugState.removalReasons.get(spawn.id);
    if (removalReason) {
      const lifetime = removalReason.elapsed ? `${(removalReason.elapsed / 1e3).toFixed(2)}s` : "?";
      const maxLifetime = removalReason.maxLifetime ? `${(removalReason.maxLifetime / 1e3).toFixed(2)}s` : "?";
      lines.push(`REMOVED: ${removalReason.reason}`);
      lines.push(`  lifetime: ${lifetime} / ${maxLifetime}`);
      if (removalReason.rect) {
        lines.push(
          `  at: (${Math.round(removalReason.rect.left)}, ${Math.round(removalReason.rect.top)})`,
          `  screen: ${Math.round(removalReason.screenHeight)}h x ${Math.round(removalReason.screenWidth)}w`
        );
      }
    }
    const thoughtLayerExists = typeof document !== "undefined" ? document.getElementById("thought-layer") !== null : false;
    if (!thoughtLayerExists) {
      lines.push("WARNING: #thought-layer missing!");
    }
    if (spawn.textareaRect) {
      lines.push(
        `textarea: (${Math.round(spawn.textareaRect.left)}, ${Math.round(spawn.textareaRect.top)})`
      );
    }
    if (thoughtRect) {
      const computedStyle = thoughtEl ? window.getComputedStyle(thoughtEl) : null;
      const styleTop = thoughtEl ? thoughtEl.style.top : "?";
      const transform = (computedStyle == null ? void 0 : computedStyle.transform) || "none";
      lines.push(
        `DOM pos: (${Math.round(thoughtRect.left)}, ${Math.round(thoughtRect.top)})`,
        `style.top: ${styleTop}`,
        `transform: ${transform !== "none" ? transform.substring(0, 30) + "..." : "none"}`,
        `size: ${Math.round(thoughtRect.width)} x ${Math.round(thoughtRect.height)}`
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
            `anim running: ${animationRunning}`
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
      `text: "${spawn.textPreview || ""}" (${spawn.textLength} chars)`
    );
  } else {
    lines.push("--- no thoughts yet ---");
  }
  const activeThoughts = typeof document !== "undefined" ? document.querySelectorAll("#thought-layer .thought").length : 0;
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
var setViewportProperties = () => {
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
  root.style.setProperty("--layout-min-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-visible-height", `${visualHeight}px`);
  root.style.setProperty("--viewport-visible-unit", `${visualHeight / 100}px`);
  root.style.setProperty("--viewport-visible-width", `${visualWidth}px`);
  root.style.setProperty("--viewport-layout-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-offset-bottom", `${offsetBottom}px`);
  root.style.setProperty("--viewport-offset-top", `${offsetTop}px`);
  const textareaHeightPercent = metrics.isKeyboardVisible ? 0.15 : 0.12;
  const textareaHeight = visualHeight * textareaHeightPercent;
  const textareaMinHeight = 48;
  const textareaMaxHeight = 100;
  const clampedTextareaHeight = Math.max(textareaMinHeight, Math.min(textareaMaxHeight, textareaHeight));
  root.style.setProperty("--textarea-height", `${clampedTextareaHeight}px`);
  debugState.metrics = metrics;
  renderDebugOverlay();
  return metrics;
};
var initViewportUnits = () => {
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
    }
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
      return debugState.spawnHistory.find((s) => s.id === id) || (debugState.lastSpawn && debugState.lastSpawn.id === id ? debugState.lastSpawn : null);
    }
    return debugState.lastSpawn;
  };
  window.__thoughtsDebug.refresh = () => {
    renderDebugOverlay();
  };
  if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
    const thoughtLayer2 = document.getElementById("thought-layer");
    if (thoughtLayer2) {
      const removalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList && node.classList.contains("thought")) {
              const spawnId = node.getAttribute("data-spawn-id");
              if (spawnId) {
                const existingReason = debugState.removalReasons.get(spawnId);
                if (!existingReason) {
                  debugState.removalReasons.set(spawnId, {
                    reason: "removed by MutationObserver (unknown cause)",
                    timestamp: Date.now(),
                    stack: new Error().stack
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
      removalObserver.observe(thoughtLayer2, { childList: true });
      if (DEBUG_ENABLED) {
        console.log("Thought removal observer active");
      }
    }
  }
  try {
    window.__thoughtsDebug.listActiveThoughts = function() {
      const inDOM = typeof document !== "undefined" ? Array.from(document.querySelectorAll("#thought-layer .thought")).map((el) => ({
        id: el.getAttribute("data-spawn-id"),
        inDOM: true,
        rect: el.getBoundingClientRect()
      })) : [];
      const inHistory = debugState.spawnHistory.map((s) => ({
        id: s.id,
        inDOM: false,
        timestamp: s.timestamp
      }));
      return {
        inDOM,
        inHistory,
        lastSpawn: debugState.lastSpawn ? { id: debugState.lastSpawn.id, timestamp: debugState.lastSpawn.timestamp } : null,
        totalInDOM: inDOM.length,
        totalInHistory: inHistory.length
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
          availableThoughts: active
        };
      }
      const thoughtEl = typeof document !== "undefined" ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`) : null;
      if (!thoughtEl) {
        const active = window.__thoughtsDebug.listActiveThoughts();
        return {
          error: `Thought with id ${spawnId} not found in DOM`,
          searchedId: spawnId,
          availableThoughts: active
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
        fullyVisible: thoughtRect.top >= 0 && thoughtRect.bottom <= (metrics.visualHeight || window.innerHeight || 0) && thoughtRect.left >= 0 && thoughtRect.right <= (metrics.visualWidth || window.innerWidth || 0)
      };
      const snapshot = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        spawnId,
        viewport: {
          visual: {
            width: metrics.visualWidth || metrics.width || 0,
            height: metrics.visualHeight || metrics.height || 0
          },
          layout: {
            width: metrics.layoutWidth || 0,
            height: metrics.layoutHeight || 0
          },
          keyboard: {
            visible: metrics.isKeyboardVisible,
            offsetTop: metrics.offsetTop || 0,
            offsetBottom: metrics.keyboardOffset || metrics.offsetBottom || 0
          }
        },
        thought: {
          style: {
            top: thoughtEl.style.top,
            left: thoughtEl.style.left,
            width: thoughtEl.style.width
          },
          computed: {
            top: thoughtStyle.top,
            left: thoughtStyle.left,
            width: thoughtStyle.width,
            height: thoughtStyle.height,
            zIndex: thoughtStyle.zIndex,
            opacity: thoughtStyle.opacity,
            transform: thoughtStyle.transform,
            position: thoughtStyle.position
          },
          rect: {
            top: thoughtRect.top,
            left: thoughtRect.left,
            bottom: thoughtRect.bottom,
            right: thoughtRect.right,
            width: thoughtRect.width,
            height: thoughtRect.height
          },
          onScreen: isOnScreen
        },
        word: wordEl ? {
          rect: {
            top: wordRect.top,
            left: wordRect.left,
            bottom: wordRect.bottom,
            right: wordRect.right,
            width: wordRect.width,
            height: wordRect.height
          },
          style: {
            opacity: wordStyle.opacity,
            color: wordStyle.color,
            transform: wordStyle.transform,
            animationName: wordStyle.animationName,
            animationDuration: wordStyle.animationDuration,
            animationDelay: wordStyle.animationDelay,
            animationPlayState: wordStyle.animationPlayState
          },
          cssVars: {
            duration: wordStyle.getPropertyValue("--duration"),
            delay: wordStyle.getPropertyValue("--delay"),
            dx: wordStyle.getPropertyValue("--dx"),
            dy: wordStyle.getPropertyValue("--dy"),
            rotation: wordStyle.getPropertyValue("--rotation"),
            opacityStart: wordStyle.getPropertyValue("--opacity-start"),
            opacityEnd: wordStyle.getPropertyValue("--opacity-end")
          },
          animations: wordAnimations.map((anim) => ({
            name: anim.animationName,
            duration: anim.effect ? anim.effect.timing.duration : null,
            delay: anim.effect ? anim.effect.timing.delay : null,
            playbackRate: anim.playbackRate,
            playState: anim.playState,
            currentTime: anim.currentTime
          }))
        } : null,
        spawnData: debugState.lastSpawn && debugState.lastSpawn.id === spawnId ? debugState.lastSpawn : null
      };
      return snapshot;
    };
    window.__thoughtsDebug.snapshotAllThoughts = function() {
      const thoughts = typeof document !== "undefined" ? document.querySelectorAll("#thought-layer .thought") : [];
      return Array.from(thoughts).map((el) => {
        const spawnId = el.getAttribute("data-spawn-id");
        return window.__thoughtsDebug.snapshotThought(spawnId);
      });
    };
    window.__thoughtsDebug.spawnTestThought = function(options = {}) {
      const {
        text = "Test Thought",
        left = null,
        // px from left of scene
        top = null,
        // px from top of scene
        width = null
        // px width
      } = options;
      const scene2 = document.getElementById("scene");
      const thoughtLayer2 = document.getElementById("thought-layer");
      const thoughtInput2 = document.getElementById("thoughts");
      if (!scene2 || !thoughtLayer2) {
        return { error: "Scene or thought layer not found" };
      }
      const sceneRect = scene2.getBoundingClientRect();
      const boxRect = thoughtInput2 ? thoughtInput2.getBoundingClientRect() : null;
      const computed = thoughtInput2 ? window.getComputedStyle(thoughtInput2) : null;
      const thought = document.createElement("div");
      thought.className = "thought";
      const spawnId = `debug-thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      thought.setAttribute("data-spawn-id", spawnId);
      thought.setAttribute("data-spawn-time", Date.now());
      const finalLeft = left !== null ? left : boxRect ? boxRect.left - sceneRect.left : 0;
      const finalTop = top !== null ? top : boxRect ? boxRect.top - sceneRect.top : 100;
      const finalWidth = width !== null ? width : boxRect ? boxRect.width : 300;
      thought.style.left = `${finalLeft}px`;
      thought.style.top = `${finalTop}px`;
      thought.style.width = `${finalWidth}px`;
      if (computed) {
        thought.style.padding = computed.padding;
        thought.style.font = computed.font;
        thought.style.lineHeight = computed.lineHeight;
        thought.style.letterSpacing = computed.letterSpacing;
      }
      const wordsWrapper = document.createElement("span");
      wordsWrapper.className = "thought-words";
      const wordSpan = document.createElement("span");
      wordSpan.className = "thought-word";
      wordSpan.textContent = text;
      wordsWrapper.appendChild(wordSpan);
      thought.appendChild(wordsWrapper);
      thoughtLayer2.appendChild(thought);
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
          height: rect.height
        },
        sceneRect: {
          top: sceneRect.top,
          left: sceneRect.left,
          width: sceneRect.width,
          height: sceneRect.height
        }
      };
    };
    window.__thoughtsDebug.spawnTestGrid = function() {
      const scene2 = document.getElementById("scene");
      if (!scene2) {
        return { error: "Scene not found" };
      }
      const sceneRect = scene2.getBoundingClientRect();
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
        { text: "Bottom-Right", left: sceneRect.width - 220, top: sceneRect.height - 60 }
      ];
      const results = positions.map((pos) => {
        return window.__thoughtsDebug.spawnTestThought(pos);
      });
      return {
        success: true,
        count: results.length,
        results
      };
    };
    window.__thoughtsDebug.clearAllThoughts = function() {
      const thoughtLayer2 = document.getElementById("thought-layer");
      if (!thoughtLayer2) {
        return { error: "Thought layer not found" };
      }
      const thoughts = thoughtLayer2.querySelectorAll(".thought");
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
      const thoughtEl = typeof document !== "undefined" ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`) : null;
      const snapshot = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        spawnId,
        inDOM: thoughtEl !== null,
        spawnData: spawnData || null,
        removalReason: removalReason || null
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
              height: thoughtRect.height
            },
            style: {
              top: thoughtEl.style.top,
              left: thoughtEl.style.left,
              width: thoughtEl.style.width
            },
            computed: {
              zIndex: thoughtStyle.zIndex,
              opacity: thoughtStyle.opacity,
              position: thoughtStyle.position
            }
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
                height: rect.height
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
                  dy: style.getPropertyValue("--dy")
                }
              },
              animations: animations.map((a) => {
                var _a, _b, _c, _d, _e, _f;
                try {
                  return {
                    name: a.animationName,
                    playState: a.playState,
                    currentTime: a.currentTime,
                    duration: (_c = (_b = (_a = a.effect) == null ? void 0 : _a.timing) == null ? void 0 : _b.duration) != null ? _c : null,
                    delay: (_f = (_e = (_d = a.effect) == null ? void 0 : _d.timing) == null ? void 0 : _e.delay) != null ? _f : null
                  };
                } catch (e) {
                  return { error: e.message };
                }
              })
            };
          })
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
      const thoughtEl = typeof document !== "undefined" ? document.querySelector(`#thought-layer .thought[data-spawn-id="${spawnId}"]`) : null;
      if (!thoughtEl) {
        const removalReason = debugState.removalReasons.get(spawnId);
        const spawnData = debugState.spawnHistory.find((s) => s.id === spawnId) || debugState.lastSpawn;
        return {
          error: "Thought not found in DOM",
          spawnId,
          removalReason: removalReason || null,
          inHistory: spawnData || null,
          animationCheck: (spawnData == null ? void 0 : spawnData.animationCheck) || null
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
          height: thoughtRect.height
        },
        viewport: {
          screenHeight,
          screenWidth,
          visualHeight: metrics.visualHeight,
          layoutHeight: metrics.layoutHeight,
          keyboardVisible: metrics.isKeyboardVisible
        },
        offScreenChecks: {
          top: isOffScreenTop,
          bottom: isOffScreenBottom,
          left: isOffScreenLeft,
          right: isOffScreenRight,
          any: isOffScreen
        },
        spawnTime,
        elapsed,
        style: {
          top: thoughtEl.style.top,
          left: thoughtEl.style.left,
          width: thoughtEl.style.width
        }
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

// assets/js/main.js
var scene = document.getElementById("scene");
var thoughtInput = document.getElementById("thoughts");
var thoughtLayer = document.getElementById("thought-layer");
var skyElement = document.querySelector(".stars");
initPromptGlow(thoughtInput);
var viewport = initViewportUnits();
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
initNavigationToggle();
var thoughtSpawner = initThoughtSpawner({
  scene,
  thoughtInput,
  thoughtLayer,
  animationConfig,
  viewport
});
thoughtSpawner == null ? void 0 : thoughtSpawner.setActiveModalChecker(modals ? modals.isAnyModalActive : () => false);
if (viewport && typeof window !== "undefined") {
  window.addEventListener("focus", viewport.refresh);
}
//# sourceMappingURL=main.js.map
