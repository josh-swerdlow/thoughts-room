const setGlowState = (input, isActive) => {
  if (!input) {
    return;
  }
  if (isActive) {
    input.classList.add("prompt-active");
  } else {
    input.classList.remove("prompt-active");
  }
};

export const initPromptGlow = (input) => {
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

