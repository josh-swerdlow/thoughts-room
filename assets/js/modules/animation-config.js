import {
  applyConfig,
  clamp,
  ensureOrder,
  formatSeconds,
  getViewportMetrics,
} from "./utils.js";

const DEFAULT_ANIMATION = {
  duration: {
    base: 4.2,
    random: 2.6,
  },
  delay: {
    max: 0.36,
    lineStep: 0.45,
  },
  travel: {
    vertical: {
      base: 110,
      random: 220,
    },
    horizontal: {
      ratio: 0.28,
      min: 160,
    },
    fadeBufferRatio: 0.18,
  },
  velocity: {
    average: 0.6,
  },
  erratic: {
    rotationMax: 10,
  },
  filter: {
    blur: {
      startMin: 0.2,
      startMax: 0.8,
      endMin: 1.2,
      endMax: 2.6,
    },
    hue: {
      startMin: -6,
      startMax: 6,
      endMin: -18,
      endMax: 18,
    },
  },
  opacity: {
    startMin: 0.75,
    startMax: 1,
    endMin: 0,
    endMax: 0,
  },
};

const animationConfig = JSON.parse(JSON.stringify(DEFAULT_ANIMATION));
const settingsInputs = new Map();
const settingsConstraints = new Map();

let settingsSchema = null;
let animationsFormEl = null;
let animationsResetEl = null;
let defaultsInitialized = false;

const getNestedValue = (target, path) => {
  return path.split(".").reduce((cursor, segment) => {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return cursor[segment];
    }
    return undefined;
  }, target);
};

const setNestedValue = (target, path, value) => {
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

const resolveDynamicBound = (bound) => {
  if (bound == null) {
    return undefined;
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
        return undefined;
    }

    return round ? Math.round(value) : value;
  }

  return undefined;
};

const clampBySchema = (path, value, fallbackMin, fallbackMax) => {
  const field = settingsConstraints.get(path);
  let minBound = typeof fallbackMin === "number" ? fallbackMin : undefined;
  let maxBound = typeof fallbackMax === "number" ? fallbackMax : undefined;

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

const clampProperty = (target, path, fallbackMin, fallbackMax) => {
  const current = getNestedValue(target, path);
  if (typeof current !== "number" || Number.isNaN(current)) {
    return;
  }
  const clamped = clampBySchema(path, current, fallbackMin, fallbackMax);
  setNestedValue(target, path, clamped);
};

const registerSchemaDefaults = (schema) => {
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

const loadInlineSettingsSchema = () => {
  const script = document.getElementById("animation-settings-data");
  if (!script || !script.textContent) {
    return null;
  }

  try {
    return JSON.parse(script.textContent);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to parse inline animation settings", error);
  }

  return null;
};

export const ensureAnimationConfigDefaults = () => {
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

const createFieldControl = (field) => {
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

const buildAnimationsForm = (schema) => {
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

const populateAnimationsForm = () => {
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

const normalizeAnimationConfig = (config) => {
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
    "opacity.endMax",
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

const getConfigValue = (path) => {
  return getNestedValue(animationConfig, path);
};

const setConfigValue = (path, value) => {
  setNestedValue(animationConfig, path, value);
};

const updateSliderDisplay = (path, value, unit = "") => {
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

const updateDynamicBounds = () => {
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

const initializeSettings = async () => {
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
      cache: "no-store",
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
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const handleFormInput = (event) => {
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

const resetToDefaults = () => {
  applyConfig(animationConfig, DEFAULT_ANIMATION);
  normalizeAnimationConfig(animationConfig);
  populateAnimationsForm();
};

normalizeAnimationConfig(animationConfig);

export const initAnimationControls = ({
  form = document.getElementById("animations-form"),
  resetButton = document.getElementById("animations-reset"),
} = {}) => {
  animationsFormEl = form;
  animationsResetEl = resetButton;

  if (animationsFormEl) {
    animationsFormEl.addEventListener("input", handleFormInput);
  }

  animationsResetEl?.addEventListener("click", resetToDefaults);

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
    resetToDefaults,
  };
};

export {
  animationConfig,
  DEFAULT_ANIMATION,
  populateAnimationsForm,
  normalizeAnimationConfig,
  getConfigValue,
  setConfigValue,
  updateSliderDisplay,
  updateDynamicBounds,
  resetToDefaults,
  settingsInputs,
  settingsConstraints,
};

