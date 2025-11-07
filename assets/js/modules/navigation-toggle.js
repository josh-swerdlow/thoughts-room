const BREAKPOINT_QUERY = "(max-width: 35rem)";

export const initNavigationToggle = ({
  container = document.querySelector(".nav-buttons"),
  toggle = document.getElementById("nav-toggle"),
  actions = document.getElementById("nav-actions"),
} = {}) => {
  if (!container || !toggle || !actions) {
    return null;
  }

  let isOpen = false;
  const mediaQuery = typeof window !== "undefined" ? window.matchMedia?.(BREAKPOINT_QUERY) : null;

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

  if (mediaQuery?.addEventListener) {
    mediaQuery.addEventListener("change", handleBreakpointChange);
  } else if (mediaQuery?.addListener) {
    mediaQuery.addListener(handleBreakpointChange);
  }

  const destroy = () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);
    actions.removeEventListener("click", handleActionClick);
    if (mediaQuery?.removeEventListener) {
      mediaQuery.removeEventListener("change", handleBreakpointChange);
    } else if (mediaQuery?.removeListener) {
      mediaQuery.removeListener(handleBreakpointChange);
    }
  };

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: toggleMenu,
    destroy,
    isOpen: () => isOpen,
  };
};


