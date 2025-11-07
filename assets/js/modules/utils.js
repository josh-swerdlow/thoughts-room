export const randomBetween = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  if (Number.isNaN(low) || Number.isNaN(high)) {
    return 0;
  }
  return low + Math.random() * (high - low);
};

export const clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }
  if (typeof max === "number") {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
};

export const ensureOrder = (object, minKey, maxKey) => {
  if (object[minKey] > object[maxKey]) {
    const temp = object[minKey];
    object[minKey] = object[maxKey];
    object[maxKey] = temp;
  }
};

export const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "0";
  }
  const decimals = seconds >= 5 ? 1 : 2;
  const trimmed = Number(seconds.toFixed(decimals));
  return trimmed.toString();
};

export const applyConfig = (target, source) => {
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

export const getViewportMetrics = () => {
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
      isKeyboardVisible: false,
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
      isKeyboardVisible: false,
    };
  }

  const offsetTop = typeof visual.offsetTop === "number" ? visual.offsetTop : 0;
  const offsetBottom = Math.max(innerHeight - (visual.height + offsetTop), 0);
  const isKeyboardVisible =
    offsetBottom > 0 || offsetTop > 0 || visual.height < innerHeight * 0.85;

  const layoutWidth = innerWidth;
  const layoutHeight = innerHeight || visual.height || 0;
  const visualWidth = visual.width || layoutWidth;
  const visualHeight = visual.height || layoutHeight;

  const effectiveHeight = isKeyboardVisible
    ? Math.max(layoutHeight, visualHeight)
    : visualHeight;

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
    isKeyboardVisible,
  };
};

