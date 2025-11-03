const DEFAULT_BACKGROUNDS = [
  "images/hubble-m44.webp",
  "images/hubble-m48.webp",
  "images/wild-duck-cluster.webp",
];

export const initBackgrounds = ({
  skyElement,
  preloadLink = document.getElementById("background-preload"),
  backgrounds = DEFAULT_BACKGROUNDS,
} = {}) => {
  if (!skyElement || !backgrounds.length) {
    return null;
  }

  const choice = backgrounds[Math.floor(Math.random() * backgrounds.length)];

  if (preloadLink) {
    preloadLink.href = choice;
  }

  const img = new Image();
  img.src = choice;
  img.onload = () => {
    skyElement.style.backgroundImage = `url("${choice}")`;
  };
  img.onerror = () => {
    skyElement.style.backgroundImage = `url("${choice}")`;
  };

  return choice;
};

export { DEFAULT_BACKGROUNDS };

