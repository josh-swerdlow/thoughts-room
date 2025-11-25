const DEFAULT_BACKGROUNDS = [
  {
    desktop: "/images/desktop/hubble-m44-optimized.webp",
    mobile: "/images/mobile/hubble-m44-mobile.webp",
  },
  {
    desktop: "/images/desktop/hubble-m48-optimized.webp",
    mobile: "/images/mobile/hubble-m48-mobile.webp",
  },
  {
    desktop: "/images/desktop/wild-duck-cluster-optimized.webp",
    mobile: "/images/mobile/wild-duck-cluster-mobile.webp",
  },
];

export const initBackgrounds = ({
  skyElement,
  preloadLink = document.getElementById("background-preload"),
  backgrounds = DEFAULT_BACKGROUNDS,
} = {}) => {
  if (!skyElement || !backgrounds.length) {
    return null;
  }

  // Check if background was pre-placed via CSS variable
  const initialBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--initial-bg-url')
    .trim();

  if (initialBg && initialBg !== 'none') {
    // Background already set via CSS variable, ensure image loads
    const bgUrl = initialBg.replace(/url\(|\)|"/g, '');

    // Preload the image to ensure it's in cache
    const img = new Image();
    img.src = bgUrl;

    // Ensure the background is actually applied (CSS variable should handle this, but verify)
    const checkAndApply = () => {
      const computedBg = getComputedStyle(skyElement).backgroundImage;
      if (!computedBg.includes(bgUrl) && !computedBg.includes('none')) {
        // Fallback: explicitly set if CSS variable didn't work
        skyElement.style.backgroundImage = `url("${bgUrl}")`;
      }
      skyElement.classList.add('loaded');
    };

    if (img.complete && img.naturalWidth > 0) {
      // Image already loaded
      checkAndApply();
    } else {
      // Wait for image to load
      img.onload = checkAndApply;
      img.onerror = () => {
        skyElement.classList.add('loaded');
      };
    }

    return bgUrl;
  }

  // Fallback: original logic for non-JS scenarios or if pre-placement failed
  const urlParams = new URLSearchParams(window.location.search);
  const bgParam = urlParams.get('bg');
  let selectedBg;

  if (bgParam !== null) {
    const index = parseInt(bgParam, 10);
    if (!isNaN(index) && index >= 0 && index < backgrounds.length) {
      selectedBg = backgrounds[index];
    }
  }

  if (!selectedBg) {
    selectedBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  }

  const isMobile = window.innerWidth <= 768;
  const choice = isMobile ? selectedBg.mobile : selectedBg.desktop;

  if (preloadLink) {
    preloadLink.href = choice;
  }

  const img = new Image();
  img.src = choice;
  img.onload = () => {
    skyElement.style.backgroundImage = `url("${choice}")`;
    skyElement.classList.add('loaded');
  };
  img.onerror = () => {
    const fallback = isMobile ? selectedBg.desktop : choice;
    skyElement.style.backgroundImage = `url("${fallback}")`;
    skyElement.classList.add('loaded');
  };

  return choice;
};

export { DEFAULT_BACKGROUNDS };

