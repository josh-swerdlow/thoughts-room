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

