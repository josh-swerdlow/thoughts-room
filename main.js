const scene = document.getElementById("scene");
const thoughtInput = document.getElementById("thoughts");
const thoughtLayer = document.getElementById("thought-layer");
const audioEl = document.getElementById("bg-audio");
const skyEl = document.querySelector(".stars");

const backgrounds = [
  "images/hubble-m44.webp",
  "images/hubble-m48.webp",
  "images/wild-duck-cluster.webp",
];

const PROMPT_TEXT =
  "This is your thoughts room. Type out your thoughts in this box and then watch them float away when you press enter.";

const DEFAULT_ANIMATION = {
  duration: {
    base: 4.2, // minimum fade time in seconds
    random: 2.6, // extra random time tacked onto base
  },
  delay: {
    max: 0.36, // stagger delay window between fragments (seconds)
    lineStep: 0.45, // additional delay between lines (seconds)
  },
  travel: {
    vertical: {
      base: 110, // minimum upward distance in px (will be overridden by schema)
      random: 220, // extra random upward distance
    },
    horizontal: {
      ratio: 0.28, // fraction of input width allowed for horizontal drift
      min: 160, // minimum horizontal drift window in px (will be overridden by schema)
    },
    fadeBufferRatio: 0.18, // fraction of screen height used as fade buffer
  },
  velocity: {
    average: 1.125, // average velocity multiplier applied to travel distances
  },
  erratic: {
    rotationMax: 10, // maximum random rotation in degrees
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
    endMin: 0.05,
    endMax: 0.3,
  },
};

const animationConfig = JSON.parse(JSON.stringify(DEFAULT_ANIMATION));

const settingsInputs = new Map();
const settingsConstraints = new Map();
let settingsSchema = null;

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

    let value;
    switch (bound.key) {
      case "viewportHeight":
        value = Math.max((window.innerHeight || fallback) * scale, 0);
        break;
      case "viewportWidth":
        value = Math.max((window.innerWidth || fallback) * scale, 0);
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
  if (!animationsForm) {
    return;
  }

  const container = animationsForm.querySelector("[data-settings-container]");
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
  populateAnimationsForm();
};

const initializeSettings = async () => {
  if (!animationsForm) {
    return;
  }

  const placeholder = animationsForm.querySelector("[data-settings-placeholder]");
  const inlineSchema = loadInlineSettingsSchema();

  const applySchema = (schema) => {
    settingsSchema = schema;
    registerSchemaDefaults(schema);
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

const randomBetween = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  if (Number.isNaN(low) || Number.isNaN(high)) {
    return 0;
  }
  return low + Math.random() * (high - low);
};

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }
  if (typeof max === "number") {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
};

const ensureOrder = (object, minKey, maxKey) => {
  if (object[minKey] > object[maxKey]) {
    const temp = object[minKey];
    object[minKey] = object[maxKey];
    object[maxKey] = temp;
  }
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "0";
  }
  const decimals = seconds >= 5 ? 1 : 2;
  const trimmed = Number(seconds.toFixed(decimals));
  return trimmed.toString();
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

const applyConfig = (target, source) => {
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

normalizeAnimationConfig(animationConfig);

if (skyEl && backgrounds.length) {
  const choice = backgrounds[Math.floor(Math.random() * backgrounds.length)];

  // Preload the selected background image
  const preloadLink = document.getElementById('background-preload');
  if (preloadLink) {
    preloadLink.href = choice;
  }

  // Create image object to preload
  const img = new Image();
  img.src = choice;
  img.onload = () => {
    skyEl.style.backgroundImage = `url("${choice}")`;
  };
  // Fallback if image fails to load
  img.onerror = () => {
    skyEl.style.backgroundImage = `url("${choice}")`;
  };
}

let audioFadedIn = false;
let promptActive = Boolean(thoughtInput);

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
    animationConfig.travel.horizontal.min
  );
  const fadeBuffer = (window.innerHeight || 0) * (animationConfig.travel.fadeBufferRatio || 0.18);

  const registerAnimation = (el, lineNumber = 0) => {
    const durationSeconds =
      animationConfig.duration.base +
      Math.random() * animationConfig.duration.random;
    const lineDelay = lineNumber * (animationConfig.delay.lineStep || 0.45);
    const delaySeconds = lineDelay + Math.random() * animationConfig.delay.max;
    const duration = durationSeconds * 1000;
    const delay = delaySeconds * 1000;
    const velocity = animationConfig.velocity.average || 1.125;

    const baseVerticalTravel =
      animationConfig.travel.vertical.base +
      Math.random() * animationConfig.travel.vertical.random;
    const totalVerticalTravel = baseVerticalTravel + fadeBuffer;

    const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
    const dy = -totalVerticalTravel * velocity;

    const rotation =
      (Math.random() - 0.5) * animationConfig.erratic.rotationMax;
    const scale = 1;
    const blurStart = randomBetween(
      animationConfig.filter.blur.startMin,
      animationConfig.filter.blur.startMax
    );
    const blurEnd = randomBetween(
      animationConfig.filter.blur.endMin,
      animationConfig.filter.blur.endMax
    );
    const hueStart = randomBetween(
      animationConfig.filter.hue.startMin,
      animationConfig.filter.hue.startMax
    );
    const hueEnd = randomBetween(
      animationConfig.filter.hue.endMin,
      animationConfig.filter.hue.endMax
    );
    const opacityStart = randomBetween(
      animationConfig.opacity.startMin,
      animationConfig.opacity.startMax
    );
    let opacityEnd = randomBetween(
      animationConfig.opacity.endMin,
      animationConfig.opacity.endMax
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

  // Position-based cleanup: check if elements are off-screen or have completed their animation
  const checkAndRemove = () => {
    if (!thought.parentNode) {
      return;
    }

    const thoughtRect = thought.getBoundingClientRect();
    const screenHeight = window.innerHeight || 0;
    const screenWidth = window.innerWidth || 0;
    const spawnTime = Number(thought.dataset.spawnTime) || Date.now();

    // Calculate if thought has moved beyond screen bounds
    const isOffScreenTop = thoughtRect.bottom < 0;
    const isOffScreenBottom = thoughtRect.top > screenHeight;
    const isOffScreenLeft = thoughtRect.right < 0;
    const isOffScreenRight = thoughtRect.left > screenWidth;
    const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;

    // Check if thought is near edge and animation has likely completed
    const marginRatio = 0.05;
    const nearTopEdge = thoughtRect.bottom < screenHeight * marginRatio;
    const nearBottomEdge = thoughtRect.top > screenHeight * (1 - marginRatio);
    const nearLeftEdge = thoughtRect.right < screenWidth * marginRatio;
    const nearRightEdge = thoughtRect.left > screenWidth * (1 - marginRatio);
    const nearEdge = nearTopEdge || nearBottomEdge || nearLeftEdge || nearRightEdge;

    // Calculate expected animation completion time
    const elapsed = Date.now() - spawnTime;
    const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 500;

    if (isOffScreen || (nearEdge && shouldBeComplete)) {
      thought.remove();
      return;
    }

    // Continue checking periodically
    window.requestAnimationFrame(() => {
      window.setTimeout(checkAndRemove, 100);
    });
  };

  thought.dataset.spawnTime = Date.now();
  window.setTimeout(checkAndRemove, 100);
};

const releasePrompt = () => {
  if (!promptActive || !thoughtInput) {
    return;
  }

  promptActive = false;
  thoughtInput.classList.remove("prompt-active");
  spawnThought(PROMPT_TEXT);
  thoughtInput.value = "";
};

const fadeInAudio = () => {
  if (!audioEl) {
    return;
  }

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

if (thoughtInput) {
  if (promptActive) {
    thoughtInput.value = PROMPT_TEXT;
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
}

document.addEventListener("pointerdown", (event) => {
  if (!thoughtInput) {
    return;
  }

  const targetElement = event.target instanceof HTMLElement ? event.target : null;
  if (
    targetElement &&
    (targetElement.closest(".nav-buttons") || targetElement.closest(".modal"))
  ) {
    return;
  }

  if (activeModal) {
    return;
  }

  if (promptActive) {
    return;
  }

  if (!thoughtInput.contains(event.target)) {
    thoughtInput.focus();
  }
});

window.addEventListener("load", () => {
  if (!audioEl) {
    return;
  }

  const startFade = () => {
    fadeInAudio();
    audioEl.removeEventListener("canplay", startFade);
  };

  audioEl.addEventListener("canplay", startFade, { once: true });

  // Some browsers block autoplay until interaction; attempt play and rely on user gesture.
  audioEl
    .play()
    .then(() => {
      fadeInAudio();
    })
    .catch(() => {
      // Swallow autoplay block; audio will start once user interacts.
      document.addEventListener(
        "click",
        () => {
          audioEl.play().then(fadeInAudio).catch(() => {});
        },
        { once: true }
      );
    });
});

const animationsForm = document.getElementById("animations-form");
const animationsReset = document.getElementById("animations-reset");
const animationsToggle = document.getElementById("animations-toggle");
const aboutToggle = document.getElementById("about-toggle");
const musicToggle = document.getElementById("music-toggle");
const musicForm = document.getElementById("music-form");
const musicMuteButton = document.getElementById("music-toggle-mute");
const musicPlayButton = document.getElementById("music-toggle-play");
const musicTrackSelect = document.getElementById("music-track");
const musicVolumeSlider = document.getElementById("music-volume");
const musicVolumeDisplays = document.querySelectorAll("[data-volume-display]");
let storedVolumeBeforeMute = 0.3; // Store volume before muting

if (audioEl && musicVolumeSlider) {
  const initialVolume = parseFloat(musicVolumeSlider.value);
  if (!Number.isNaN(initialVolume)) {
    audioEl.volume = clamp(initialVolume, 0, 1);
  }
}

const musicTrackOptions = musicTrackSelect
  ? Array.from(musicTrackSelect.options).map((option) => ({
      value: option.value,
      absolute: new URL(option.value, window.location.href).href,
    }))
  : [];

if (audioEl && musicTrackOptions.length > 0 && !audioEl.getAttribute("src")) {
  audioEl.src = musicTrackOptions[0].absolute;
}

let currentTrack = audioEl
  ? new URL(
      audioEl.getAttribute("src") || audioEl.src || musicTrackOptions[0]?.absolute || "",
      window.location.href
    ).href
  : musicTrackOptions[0]?.absolute || "";

const updateSliderDisplay = (path, value, unit = "") => {
  if (!animationsForm) {
    return;
  }

  const nodes = animationsForm.querySelectorAll(`[data-value-display="${path}"]`);
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

const updateVolumeDisplay = (value) => {
  if (!musicVolumeDisplays.length) {
    return;
  }

  const safeValue = clamp(Number(value) || 0, 0, 1);
  const formatted = `${Math.round(safeValue * 100)}%`;
  musicVolumeDisplays.forEach((node) => {
    node.textContent = formatted;
  });
};

const syncMusicControls = () => {
  if (!audioEl) {
    return;
  }

  if (musicMuteButton) {
    musicMuteButton.textContent = audioEl.muted ? "unmute" : "mute";
  }

  if (musicPlayButton) {
    musicPlayButton.textContent = audioEl.paused ? "resume" : "pause";
  }

  if (musicTrackSelect) {
    const match = musicTrackOptions.find((option) => option.absolute === currentTrack);
    if (match) {
      musicTrackSelect.value = match.value;
    }
  }

  if (musicVolumeSlider) {
    // When muted, show slider at 0; when unmuted, show actual volume
    musicVolumeSlider.value = audioEl.muted ? 0 : audioEl.volume.toFixed(2);
  }

  updateVolumeDisplay(audioEl.muted ? 0 : audioEl.volume);
};

const setMusicTrackByValue = (value) => {
  if (!audioEl) {
    return;
  }

  const match =
    musicTrackOptions.find((option) => option.value === value) ||
    (value ? { value, absolute: new URL(value, window.location.href).href } : null);

  if (!match) {
    return;
  }

  currentTrack = match.absolute;
  audioEl.src = match.absolute;
  audioEl.load();
  audioEl.play().catch(() => {});
  syncMusicControls();
};

const getConfigValue = (path) => {
  return getNestedValue(animationConfig, path);
};

const setConfigValue = (path, value) => {
  setNestedValue(animationConfig, path, value);
};

const populateAnimationsForm = () => {
  if (!animationsForm || !settingsInputs.size) {
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

const modalRegistry = {
  about: {
    toggle: aboutToggle,
    modal: document.getElementById("about-modal"),
  },
  music: {
    toggle: musicToggle,
    modal: document.getElementById("music-modal"),
    onOpen: () => {
      syncMusicControls();
    },
  },
  animations: {
    toggle: animationsToggle,
    modal: document.getElementById("animations-modal"),
    onOpen: populateAnimationsForm,
  },
};

let activeModal = null;

const setModalState = (name, expanded) => {
  const entry = modalRegistry[name];
  if (!entry) {
    return;
  }

  entry.modal?.classList.toggle("active", expanded);
  entry.modal?.setAttribute("aria-hidden", expanded ? "false" : "true");
  entry.toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
};

const openModal = (name) => {
  if (!modalRegistry[name]) {
    return;
  }

  if (activeModal && activeModal !== name) {
    closeModal();
  }

  activeModal = name;
  setModalState(name, true);
  modalRegistry[name].onOpen?.();
};

const closeModal = () => {
  if (!activeModal) {
    return;
  }

  const entry = modalRegistry[activeModal];
  setModalState(activeModal, false);
  entry.onClose?.();
  entry.toggle?.focus();
  activeModal = null;
};

const toggleModal = (name) => {
  if (activeModal === name) {
    closeModal();
  } else {
    openModal(name);
  }
};

Object.entries(modalRegistry).forEach(([name, entry]) => {
  entry.toggle?.addEventListener("click", () => toggleModal(name));

  entry.modal?.addEventListener("click", (event) => {
    if (event.target === entry.modal) {
      closeModal();
    }
  });

  entry.modal
    ?.querySelector(".modal-panel")
    ?.addEventListener("click", (event) => event.stopPropagation());
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

animationsForm?.addEventListener("input", (event) => {
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
});

animationsReset?.addEventListener("click", () => {
  applyConfig(animationConfig, DEFAULT_ANIMATION);
  normalizeAnimationConfig(animationConfig);
  populateAnimationsForm();
});

initializeSettings();

window.addEventListener("resize", () => {
  if (!settingsSchema) {
    return;
  }
  updateDynamicBounds();
});

populateAnimationsForm();

musicMuteButton?.addEventListener("click", () => {
  if (!audioEl) {
    return;
  }

  if (audioEl.muted) {
    // Unmuting: restore stored volume
    audioEl.muted = false;
    audioEl.volume = storedVolumeBeforeMute > 0 ? storedVolumeBeforeMute : 0.3;
  } else {
    // Muting: store current volume and set volume to 0
    if (audioEl.volume > 0) {
      storedVolumeBeforeMute = audioEl.volume;
    }
    audioEl.volume = 0;
    audioEl.muted = true;
  }
  syncMusicControls();
});

musicPlayButton?.addEventListener("click", () => {
  if (!audioEl) {
    return;
  }

  if (audioEl.paused) {
    audioEl.play().catch(() => {});
  } else {
    audioEl.pause();
  }
  syncMusicControls();
});

musicTrackSelect?.addEventListener("change", (event) => {
  const value = event.target.value;
  setMusicTrackByValue(value);
});

musicVolumeSlider?.addEventListener("input", (event) => {
  if (!audioEl) {
    return;
  }

  const value = parseFloat(event.target.value);
  if (Number.isNaN(value)) {
    return;
  }

  const clampedValue = clamp(value, 0, 1);

  if (clampedValue > 0) {
    // Unmute when volume is set above 0
    if (audioEl.muted) {
      audioEl.muted = false;
    }
    audioEl.volume = clampedValue;
    storedVolumeBeforeMute = clampedValue;
  } else {
    // Volume at 0: mute and keep stored volume
    audioEl.muted = true;
    audioEl.volume = 0;
  }

  syncMusicControls();
});

musicForm?.addEventListener("submit", (event) => event.preventDefault());

syncMusicControls();
