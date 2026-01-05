import { initPromptGlow } from "./modules/prompt-glow.js";
import { initBackgrounds } from "./modules/backgrounds.js";
import {
  initAnimationControls,
  animationConfig,
  ensureAnimationConfigDefaults,
} from "./modules/animation-config.js";
import { initThoughtSpawner } from "./modules/thought-spawner.js";
import { initModals } from "./modules/modals.js";
import { initNavigationToggle } from "./modules/navigation-toggle.js";
import { initViewportUnits } from "./modules/viewport.js";

const scene = document.getElementById("scene");
const thoughtInput = document.getElementById("thoughts");
const thoughtLayer = document.getElementById("thought-layer");
const skyElement = document.querySelector(".stars");
const body = document.body;

const CTA_DISMISS_KEY = "thoughts-room.spotify-login-cta-dismissed";
const CTA_HEIGHT_VAR = "--cta-banner-height";

const initSpotifyLoginCta = () => {
  const cta = document.getElementById("spotify-login-cta");
  const dismissBtn = document.getElementById("spotify-login-cta-dismiss");
  if (!cta || !dismissBtn) {
    return null;
  }

  const setBannerHeight = () => {
    const height = cta?.offsetHeight || 0;
    document.documentElement.style.setProperty(CTA_HEIGHT_VAR, `${height}px`);
  };

  const hide = () => {
    cta.classList.add("is-hidden");
    document.documentElement.style.setProperty(CTA_HEIGHT_VAR, "0px");
    setTimeout(() => {
      cta.setAttribute("hidden", "");
    }, 220);
  };

  const show = () => {
    cta.removeAttribute("hidden");
    requestAnimationFrame(() => {
      cta.classList.remove("is-hidden");
      setBannerHeight();
    });
  };

  let dismissed = false;
  try {
    dismissed = localStorage.getItem(CTA_DISMISS_KEY) === "true";
  } catch {
    dismissed = false;
  }

  if (dismissed) {
    cta.setAttribute("hidden", "");
    return { show, hide };
  }

  show();

  const handleResize = () => {
    setBannerHeight();
  };

  dismissBtn.addEventListener("click", () => {
    try {
      localStorage.setItem(CTA_DISMISS_KEY, "true");
    } catch {
      // ignore write failures (e.g., private mode)
    }
    window.removeEventListener("resize", handleResize);
    hide();
  });

  window.addEventListener("resize", handleResize);
  setBannerHeight();

  return { show, hide };
};

// Loading state tracker
const loadingState = {
  background: false,
  animationConfig: false,
  thoughtSpawner: false,
  spotify: false,
  isReady: function() {
    return this.background && this.animationConfig && this.thoughtSpawner && this.spotify;
  },
  checkReady: function() {
    if (this.isReady() && body.classList.contains('loading')) {
      body.classList.remove('loading');
      if (thoughtInput) {
        thoughtInput.disabled = false;
        thoughtInput.setAttribute('placeholder', '');
        // Don't auto-focus - let user click when ready
      }
    }
  }
};

// Disable textarea initially
if (thoughtInput) {
  thoughtInput.disabled = true;
  thoughtInput.setAttribute('placeholder', 'Loading...');
}

// Critical: Initialize viewport units IMMEDIATELY to prevent CLS
// This sets CSS variables that affect layout - must run before first paint
const viewport = initViewportUnits();

// Critical: Initialize backgrounds immediately (uses pre-placed image if available)
const backgroundInit = initBackgrounds({ skyElement });
if (backgroundInit) {
  // Wait for background to actually load
  const checkBackgroundLoaded = () => {
    if (skyElement && skyElement.classList.contains('loaded')) {
      loadingState.background = true;
      loadingState.checkReady();
    } else {
      setTimeout(checkBackgroundLoaded, 50);
    }
  };
  checkBackgroundLoaded();
} else {
  // If background init failed, mark as ready anyway
  loadingState.background = true;
  loadingState.checkReady();
}

// Defer ALL non-critical initialization to reduce main thread blocking
const defer = (fn, delay = 0) => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(fn, { timeout: delay });
  } else {
    setTimeout(fn, delay);
  }
};

// Phase 1: Critical UI elements (defer slightly)
defer(() => {
  initPromptGlow(thoughtInput);

  // Mark scene as loaded after critical initialization
  if (scene) {
    scene.classList.add('loaded');
  }
}, 0);

// Phase 2: Animation config (defer more)
defer(() => {
  ensureAnimationConfigDefaults();
  loadingState.animationConfig = true;
  loadingState.checkReady();
}, 50);

// Phase 3: Spotify embed and remaining initialization (defer)
defer(async () => {
  initSpotifyLoginCta();

  // Initialize Spotify embed instead of audio
  let spotifyControls = null;
  try {
    const { initSpotifyControls } = await import('./modules/spotify-embed.js');
    spotifyControls = await initSpotifyControls({
      thoughtInput,
      onReady: () => {
        loadingState.spotify = true;
        loadingState.checkReady();
      },
    });

    if (!spotifyControls) {
      console.warn('Spotify controls initialization returned null');
      loadingState.spotify = true;
      loadingState.checkReady();
    }
  } catch (error) {
    console.error('Failed to initialize Spotify embed:', error);
    loadingState.spotify = true;
    loadingState.checkReady();
  }

  // First click on thoughts-area starts music
  if (spotifyControls && thoughtInput) {
    const startMusicOnFirstInteraction = () => {
      if (spotifyControls && spotifyControls.startPlayback) {
        spotifyControls.startPlayback().catch(() => {
          // Ignore autoplay errors
        });
        // Show container then hide after delay (handled by spotify-embed.js)
        // The showThenHide is already set up in the spotify-embed module
      }
    };

    // Listen for first focus or click
    const handleFirstInteraction = () => {
      startMusicOnFirstInteraction();
      thoughtInput.removeEventListener('focus', handleFirstInteraction);
      thoughtInput.removeEventListener('click', handleFirstInteraction);
      thoughtInput.removeEventListener('pointerdown', handleFirstInteraction);
    };

    thoughtInput.addEventListener('focus', handleFirstInteraction, { once: true });
    thoughtInput.addEventListener('click', handleFirstInteraction, { once: true });
    thoughtInput.addEventListener('pointerdown', handleFirstInteraction, { once: true });
  }

  let animationControls = null;
  const ensureAnimationControls = () => {
    if (!animationControls) {
      animationControls = initAnimationControls();
    }
    return animationControls;
  };

  const modals = initModals({
    onMusicOpen: () => {
      // Music modal opened - sync music controls
      if (spotifyControls && spotifyControls.syncMusicControls) {
        spotifyControls.syncMusicControls();
      }
    },
    onAnimationsOpen: () => {
      const controls = ensureAnimationControls();
      controls?.populateAnimationsForm?.();
    },
  });

  initNavigationToggle();

  const thoughtSpawner = initThoughtSpawner({
    scene,
    thoughtInput,
    thoughtLayer,
    animationConfig,
    viewport,
  });

  // Mark thought spawner as ready
  if (thoughtSpawner) {
    loadingState.thoughtSpawner = true;
    loadingState.checkReady();
  }

  thoughtSpawner?.setActiveModalChecker(modals ? modals.isAnyModalActive : () => false);

  if (viewport && typeof window !== "undefined") {
    window.addEventListener("focus", viewport.refresh);
  }
}, 100);

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => {
        // Service Worker registered successfully
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

