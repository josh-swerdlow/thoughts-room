import { initPromptGlow } from "./modules/prompt-glow.js";
import { initBackgrounds } from "./modules/backgrounds.js";
import {
  initAnimationControls,
  animationConfig,
  ensureAnimationConfigDefaults,
} from "./modules/animation-config.js";
import { initThoughtSpawner } from "./modules/thought-spawner.js";
import { initAudioControls } from "./modules/audio.js";
import { initModals } from "./modules/modals.js";
import { initNavigationToggle } from "./modules/navigation-toggle.js";
import { initViewportUnits } from "./modules/viewport.js";

const scene = document.getElementById("scene");
const thoughtInput = document.getElementById("thoughts");
const thoughtLayer = document.getElementById("thought-layer");
const skyElement = document.querySelector(".stars");

initPromptGlow(thoughtInput);

const viewport = initViewportUnits();

initBackgrounds({ skyElement });

ensureAnimationConfigDefaults();

const audioControls = initAudioControls();

let animationControls = null;

const ensureAnimationControls = () => {
  if (!animationControls) {
    animationControls = initAnimationControls();
  }
  return animationControls;
};

const modals = initModals({
  onMusicOpen: audioControls?.syncMusicControls,
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

thoughtSpawner?.setActiveModalChecker(modals ? modals.isAnyModalActive : () => false);

if (viewport && typeof window !== "undefined") {
  window.addEventListener("focus", viewport.refresh);
}

