import { clamp } from "./utils.js";

export const initAudioControls = ({
  audioEl = document.getElementById("bg-audio"),
  muteButton = document.getElementById("music-toggle-mute"),
  playButton = document.getElementById("music-toggle-play"),
  trackSelect = document.getElementById("music-track"),
  volumeSlider = document.getElementById("music-volume"),
  musicForm = document.getElementById("music-form"),
  volumeDisplays = document.querySelectorAll("[data-volume-display]") ?? [],
} = {}) => {
  if (!audioEl) {
    return null;
  }

  let storedVolumeBeforeMute = 0.3;
  let audioFadedIn = false;
  let audioLoaded = false;
  let audioPreloaded = false;
  let userHasRequestedPlay = false;

  const musicTrackOptions = trackSelect
    ? Array.from(trackSelect.options).map((option) => ({
        value: option.value,
        absolute: new URL(option.value, window.location.href).href,
      }))
    : [];

  if (volumeSlider) {
    const initialVolume = parseFloat(volumeSlider.value);
    if (!Number.isNaN(initialVolume)) {
      audioEl.volume = clamp(initialVolume, 0, 1);
    }
  }

  // Set source but don't load yet - wait for page to be ready
  if (audioEl && musicTrackOptions.length > 0 && !audioEl.getAttribute("src")) {
    audioEl.src = musicTrackOptions[0].absolute;
  }

  let currentTrack = audioEl
    ? new URL(
        audioEl.getAttribute("src") || audioEl.src || musicTrackOptions[0]?.absolute || "",
        window.location.href,
      ).href
    : musicTrackOptions[0]?.absolute || "";

  const updateVolumeDisplay = (value) => {
    if (!volumeDisplays.length) {
      return;
    }

    const safeValue = clamp(Number(value) || 0, 0, 1);
    const formatted = `${Math.round(safeValue * 100)}%`;
    volumeDisplays.forEach((node) => {
      node.textContent = formatted;
    });
  };

  const syncMusicControls = () => {
    if (muteButton) {
      muteButton.textContent = audioEl.muted ? "unmute" : "mute";
    }

    if (playButton) {
      playButton.textContent = audioEl.paused ? "resume" : "pause";
    }

    if (trackSelect) {
      const match = musicTrackOptions.find((option) => option.absolute === currentTrack);
      if (match) {
        trackSelect.value = match.value;
      }
    }

    if (volumeSlider) {
      volumeSlider.value = audioEl.muted ? 0 : audioEl.volume.toFixed(2);
    }

    updateVolumeDisplay(audioEl.muted ? 0 : audioEl.volume);
  };

  const fadeInAudio = () => {
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

  const setMusicTrackByValue = (value) => {
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

  if (muteButton) {
    muteButton.addEventListener("click", () => {
      if (audioEl.muted) {
        audioEl.muted = false;
        audioEl.volume = storedVolumeBeforeMute > 0 ? storedVolumeBeforeMute : 0.3;
      } else {
        if (audioEl.volume > 0) {
          storedVolumeBeforeMute = audioEl.volume;
        }
        audioEl.volume = 0;
        audioEl.muted = true;
      }
      syncMusicControls();
    });
  }

  if (playButton) {
    playButton.addEventListener("click", () => {
      if (audioEl.paused) {
        userHasRequestedPlay = true;
        audioEl.play().catch(() => {});
        fadeInAudio();
      } else {
        audioEl.pause();
      }
      syncMusicControls();
    });
  }

  if (trackSelect) {
    trackSelect.addEventListener("change", (event) => {
      setMusicTrackByValue(event.target.value);
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      if (Number.isNaN(value)) {
        return;
      }

      const clampedValue = clamp(value, 0, 1);

      if (clampedValue > 0) {
        if (audioEl.muted) {
          audioEl.muted = false;
        }
        audioEl.volume = clampedValue;
        storedVolumeBeforeMute = clampedValue;
        // Only auto-play if user is adjusting volume (explicit interaction)
        if (audioEl.paused && !userHasRequestedPlay) {
          userHasRequestedPlay = true;
          audioEl.play().catch(() => {});
          fadeInAudio();
        }
      } else {
        audioEl.muted = true;
        audioEl.volume = 0;
      }

      syncMusicControls();
    });
  }

  if (volumeDisplays.length) {
    updateVolumeDisplay(audioEl.volume);
  }

  if (musicForm) {
    musicForm.addEventListener("submit", (event) => event.preventDefault());
  }

  // Preload audio after page is ready (in background)
  const preloadAudio = () => {
    if (audioPreloaded || !audioEl) {
      return;
    }

    audioPreloaded = true;

    // Load audio in background so it's ready when user clicks
    if (audioEl.readyState === 0) {
      audioEl.load();
    }

    // Pre-buffer the audio by loading metadata
    audioEl.addEventListener('canplaythrough', () => {
      audioLoaded = true;
    }, { once: true });
  };

  // Preload audio on first user interaction (but don't auto-play)
  const preloadOnInteraction = () => {
    // If not preloaded yet, load now
    if (!audioPreloaded) {
      preloadAudio();
    }
  };

  // Add interaction listeners for preloading (but not auto-playing)
  document.addEventListener('click', preloadOnInteraction, { once: true });
  document.addEventListener('touchstart', preloadOnInteraction, { once: true });

  syncMusicControls();

  // Return preload function so it can be called when page is ready
  return {
    fadeInAudio,
    syncMusicControls,
    setMusicTrackByValue,
    preloadAudio, // Export this so main.js can call it
  };
};

