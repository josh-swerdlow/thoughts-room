
import { clamp } from "./utils.js";

// Container visibility states
const ContainerState = {
  HIDDEN: 'hidden',
  SHOWN: 'shown',
  TEMP_SHOW: 'tempShow',
};

const PREAPPROVED_TRACKS = [
  {
    id: "4qHBvrzFbpUWeFxhdbpar8",
    uri: "spotify:track:4qHBvrzFbpUWeFxhdbpar8",
    title: "One day in August",
    artist: "Marc Teichert",
  },
  {
    id: "6kRO6dFs2oQPhB7uMxx42B",
    uri: "spotify:track:6kRO6dFs2oQPhB7uMxx42B",
    title: "Daydream",
    artist: "Marc Teichert",
  },
  {
    id: "7yYezAet9r4sUCjVQUaGMZ",
    uri: "spotify:track:7yYezAet9r4sUCjVQUaGMZ",
    title: "Chickentown",
    artist: "Marc Teichert",
  },
];

const SPOTIFY_IFRAME_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const THEME_VALUE = "dark"; // Dark mode
const EMBED_HEIGHT = 80; // Smallest iframe height
let spotifyApiPromise = null;

const ensureSpotifyScript = () => {
  if (document.querySelector(`script[src="${SPOTIFY_IFRAME_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = SPOTIFY_IFRAME_SRC;
  script.async = true;
  document.body?.appendChild(script);
};

const waitForSpotifyApi = () => {
  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }
  if (!spotifyApiPromise) {
    spotifyApiPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Spotify IFrame API never became ready")),
        15000,
      );
      const prevReady = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => {
        prevReady?.(api);
        window.clearTimeout(timeout);
        resolve(api);
      };
      ensureSpotifyScript();
    });
  }
  return spotifyApiPromise;
};

const toSpotifyUri = (value) => {
  if (!value) return null;
  if (value.startsWith("spotify:")) return value;
  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `spotify:track:${id}` : null;
    } catch {
      return null;
    }
  }
  return `spotify:track:${value}`;
};

const mergeTrackSources = (trackSelect) => {
  const merged = [...PREAPPROVED_TRACKS];
  if (!trackSelect) return merged;

  Array.from(trackSelect.options).forEach((option) => {
    const id = option.value;
    const uri = toSpotifyUri(option.dataset.uri || id);
    if (!uri) return;

    const incoming = {
      id,
      uri,
      title: option.dataset.title || option.textContent?.trim() || id,
      artist: option.dataset.artist || "Unknown artist",
    };

    const existingIdx = merged.findIndex((track) => track.id === id);
    if (existingIdx >= 0) {
      merged[existingIdx] = { ...merged[existingIdx], ...incoming };
    } else {
      merged.push(incoming);
    }
  });

  return merged;
};

const createController = (api, mount, track) =>
  new Promise((resolve, reject) => {
    api.createController(
      mount,
      {
        uri: track.uri,
        theme: THEME_VALUE,
        width: "100%",
        height: EMBED_HEIGHT
      },
      (controller) => {
        if (!controller) {
          reject(new Error("Spotify controller unavailable"));
        } else {
          resolve(controller);
        }
      },
    );
  });

// Set all iframe attributes to match the example
const configureIframeAttributes = (iframe) => {
  if (!iframe) return;
  iframe.style.borderRadius = "13px";

};

const STORAGE_KEY_DISPLAY = "spotify-display";
const AUTO_HIDE_DELAY_MS = 10000;

export const initSpotifyControls = async ({
  wrapper = document.getElementById("spotify-iframe-wrapper") ||
    document.getElementById("spotify-embed-container"),
  container = document.getElementById("spotify-embed-container"),
  trackSelect = document.getElementById("music-track"),
  displaySelect = document.getElementById("music-display"),
  volumeSlider = document.getElementById("music-volume"),
  volumeDisplay = document.querySelector("[data-volume-display]"),
  playPauseBtn = document.getElementById("music-play-pause"),
  defaultTrackId,
  onReady,
} = {}) => {
  if (!wrapper) {
    console.warn("Spotify embed wrapper not found");
    return null;
  }

  const tracks = mergeTrackSources(trackSelect).filter((track) => Boolean(track.uri));
  if (!tracks.length) {
    console.warn("No pre-approved Spotify tracks available");
    return null;
  }

  // Container visibility state
  let containerState = ContainerState.SHOWN; // Default to shown on page load
  let displayMode = 'shown'; // 'shown' or 'hidden' - always starts as 'shown' on any page load
  let autoHideTimeout = null;
  let tempShowTimeout = null;

  // Initialize display preference - always force 'shown' on any page load
  const loadDisplayPreference = () => {
    // Always force 'shown' on any page load (ignore localStorage)
    displayMode = 'shown';
    if (displaySelect) {
      displaySelect.value = displayMode;
    }
    // Apply the display mode
    applyDisplayMode();
  };

  // Save display preference to localStorage
  const saveDisplayPreference = (value) => {
    displayMode = value;
    localStorage.setItem(STORAGE_KEY_DISPLAY, value);
    applyDisplayMode();
  };

  // Apply the display mode setting
  const applyDisplayMode = () => {
    cancelAutoHide();
    if (displayMode === 'hidden') {
      setContainerState(ContainerState.HIDDEN);
    } else {
      // 'shown'
      setContainerState(ContainerState.SHOWN);
    }
  };

  // Set container state
  const setContainerState = (newState) => {
    // Cancel any existing tempShow timeout
    if (tempShowTimeout) {
      clearTimeout(tempShowTimeout);
      tempShowTimeout = null;
    }

    containerState = newState;
    const isHidden = newState === ContainerState.HIDDEN;
    const isTempShow = newState === ContainerState.TEMP_SHOW;

    if (container) {
      container.classList.toggle("is-hidden", isHidden);
      container.classList.toggle("is-temp-show", isTempShow);
    }

    // Update display dropdown to reflect current state (if not tempShow)
    if (displaySelect && !isTempShow) {
      if (isHidden) {
        displaySelect.value = 'hidden';
      } else {
        displaySelect.value = 'shown';
      }
    }

    // Set iframe width to 0% when hidden, 100% when shown or tempShow
    const iframe = wrapper.querySelector("iframe");
    if (iframe) {
      iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
      // Force reflow to ensure transition is triggered when toggling
      // eslint-disable-next-line no-unused-expressions
      iframe.offsetWidth;
      iframe.style.width = isHidden ? "0%" : "100%";
    }

    // If tempShow, schedule transition to hidden after 10 seconds
    if (isTempShow) {
      const TEMP_SHOW_DURATION_MS = 10000;
      tempShowTimeout = setTimeout(() => {
        setContainerState(ContainerState.HIDDEN);
      }, TEMP_SHOW_DURATION_MS);
    }
  };

  // Schedule auto-hide (only for SHOWN state, not TEMP_SHOW)
  // Note: This is only used for tempShow functionality, not display mode
  const scheduleAutoHide = () => {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
    }
    if (containerState === ContainerState.SHOWN) {
      autoHideTimeout = setTimeout(() => {
        setContainerState(ContainerState.HIDDEN);
      }, AUTO_HIDE_DELAY_MS);
    }
  };

  // Cancel auto-hide
  const cancelAutoHide = () => {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
      autoHideTimeout = null;
    }
  };

  // Show container temporarily (for first interaction and track changes)
  // Only affects hidden states - if already shown, does nothing
  const showTemp = () => {
    if (containerState === ContainerState.HIDDEN) {
      cancelAutoHide();
      setContainerState(ContainerState.TEMP_SHOW);
    }
  };

  // Don't load display preference here - it will be loaded after track initialization
  // to ensure we force 'shown' on initial load

  // Display dropdown handler
  if (displaySelect) {
    displaySelect.addEventListener("change", (event) => {
      const value = event.target.value;
      saveDisplayPreference(value);
    });
  }

  // Track previous state for hover behavior
  let previousStateBeforeHover = null;

  // Temporarily show container on hover without changing state
  const showOnInteraction = () => {
    if (containerState === ContainerState.HIDDEN) {
      previousStateBeforeHover = ContainerState.HIDDEN;
      // Temporarily show visually without changing state
      const iframe = wrapper.querySelector("iframe");
      if (iframe) {
        iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
        // Force reflow to ensure transition is triggered
        // eslint-disable-next-line no-unused-expressions
        iframe.offsetWidth;
        iframe.style.width = "100%";
      }
      if (container) {
        container.classList.remove("is-hidden");
      }
    }
  };

  // Hide container on mouse exit if it was temporarily shown
  const hideOnInteraction = () => {
    if (previousStateBeforeHover === ContainerState.HIDDEN && containerState === ContainerState.HIDDEN) {
      // Hide visually without changing state
      const iframe = wrapper.querySelector("iframe");
      if (iframe) {
        iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
        // Force reflow to ensure transition is triggered
        // eslint-disable-next-line no-unused-expressions
        iframe.offsetWidth;
        iframe.style.width = "0%";
      }
      if (container) {
        container.classList.add("is-hidden");
      }
      previousStateBeforeHover = null;
    }
  };

  if (container) {
    container.addEventListener("mouseenter", () => {
      showOnInteraction();
    });
    container.addEventListener("mouseleave", () => {
      hideOnInteraction();
    });
    container.addEventListener("click", () => {
      showOnInteraction();
    });
    container.addEventListener("touchstart", () => {
      showOnInteraction();
    });
  }

  // Track if this is the first interaction with thoughts area
  let isFirstThoughtsInteraction = true;

  // Add listener for thoughts textarea click/focus (first interaction)
  const thoughtInput = document.getElementById("thoughts");
  if (thoughtInput) {
    const handleFirstThoughtsInteraction = () => {
      if (isFirstThoughtsInteraction) {
        isFirstThoughtsInteraction = false;
        showTemp();
      }
    };

    thoughtInput.addEventListener("click", handleFirstThoughtsInteraction, { once: true });
    thoughtInput.addEventListener("focus", handleFirstThoughtsInteraction, { once: true });
    thoughtInput.addEventListener("pointerdown", handleFirstThoughtsInteraction, { once: true });
  }

  try {
    const api = await waitForSpotifyApi();
    let controller = null;
    let currentTrack = null;
    let isPlaying = false;
    let isReady = false;

    // Update play/pause button state
    const updatePlayPauseButton = () => {
      if (!playPauseBtn) return;
      const playIcon = playPauseBtn.querySelector(".music-play-icon");
      const pauseIcon = playPauseBtn.querySelector(".music-pause-icon");
      if (playIcon && pauseIcon) {
        if (isPlaying) {
          playIcon.style.display = "none";
          pauseIcon.style.display = "inline";
          playPauseBtn.setAttribute("aria-label", "Pause music");
        } else {
          playIcon.style.display = "inline";
          pauseIcon.style.display = "none";
          playPauseBtn.setAttribute("aria-label", "Play music");
        }
      }
    };

    const mountIframe = async (track) => {
      currentTrack = track;
      if (!controller) {
        wrapper.innerHTML = "";
        const mount = document.createElement("div");
        mount.className = "spotify-iframe";
        wrapper.appendChild(mount);
        controller = await createController(api, mount, track);

        // Wait for iframe to be created and configure all attributes
        const waitForIframe = () => {
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          } else {
            setTimeout(waitForIframe, 50);
          }
        };
        waitForIframe();

        // Listen for ready event
        controller.addListener("ready", () => {
          isReady = true;
          // Ensure all attributes are set after ready
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          }
          if (onReady) {
            onReady();
          }
        });

        // Listen for playback updates to track play state
        controller.addListener("playback_update", ({ data }) => {
          if (data) {
            isPlaying = !data.isPaused;
            updatePlayPauseButton();
          }
        });
      } else {
        // Preserve play state when switching tracks
        const wasPlaying = isPlaying;
        let hasResumed = false;

        // Set up a listener to resume playback when new track loads
        const resumeListener = ({ data }) => {
          if (data && data.track && data.track.uri === track.uri && !hasResumed && wasPlaying) {
            // New track has loaded, resume playback
            hasResumed = true;
            if (controller?.play) {
              const playResult = controller.play();
              if (playResult && typeof playResult.catch === 'function') {
                playResult.catch(() => {
                  // Ignore autoplay errors
                });
              }
            }
          }
        };

        controller.addListener("playback_update", resumeListener);
        controller.loadUri(track.uri, "dark" );

        // Ensure attributes are set when loading new track
        setTimeout(() => {
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          }
        }, 100);

        // Clean up listener after track loads (with timeout fallback)
        setTimeout(() => {
          hasResumed = true;
        }, 2000);
      }
    };

    const setTrackById = async (id, { autoplay } = {}) => {
      const track =
        tracks.find((candidate) => candidate.id === id) ||
        tracks.find((candidate) => candidate.uri === id) ||
        tracks[0];
      if (!track) return;

      // Preserve current play state if autoplay not explicitly set
      const shouldAutoplay = autoplay !== undefined ? autoplay : isPlaying;

      await mountIframe(track);

      if (shouldAutoplay && controller?.play) {
        const playResult = controller.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {
            // Ignore autoplay errors
          });
        }
      }

      if (trackSelect && trackSelect.value !== track.id) {
        trackSelect.value = track.id;
      }

      // Show container when track changes, then hide after delay
      showTemp();
    };

    trackSelect?.addEventListener("change", (event) => {
      setTrackById(event.target.value);
    });

    // Play/pause button handler
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", async () => {
        if (!controller) return;
        try {
          if (isPlaying) {
            if (controller.pause) {
              const pauseResult = controller.pause();
              if (pauseResult && typeof pauseResult.then === 'function') {
                await pauseResult;
              }
              isPlaying = false;
            }
          } else {
            if (controller.play) {
              const playResult = controller.play();
              if (playResult && typeof playResult.then === 'function') {
                await playResult;
              }
              isPlaying = true;
            }
          }
          updatePlayPauseButton();
        } catch (error) {
          console.error("Error toggling playback:", error);
        }
      });
    }

    // Volume slider handler
    const updateVolumeDisplay = (value) => {
      if (volumeDisplay) {
        const safeValue = clamp(Number(value) || 0, 0, 100);
        volumeDisplay.textContent = `${Math.round(safeValue)}%`;
      }
    };

    if (volumeSlider) {
      // Set initial volume display
      updateVolumeDisplay(volumeSlider.value);

      volumeSlider.addEventListener("input", (event) => {
        const value = parseFloat(event.target.value) / 100; // Convert 0-100 to 0-1
        updateVolumeDisplay(event.target.value);
        // Set volume if controller is available
        if (controller?.setVolume) {
          controller.setVolume(clamp(value, 0, 1));
        }
      });
    }

    await setTrackById(defaultTrackId ?? tracks[0].id);

    // Initialize container state to SHOWN on page load
    setContainerState(ContainerState.SHOWN);

    // Initialize play/pause button state
    updatePlayPauseButton();

    const startPlayback = async () => {
      if (controller?.play) {
        try {
          const playResult = controller.play();
          if (playResult && typeof playResult.then === 'function') {
            await playResult;
          }
          isPlaying = true;
          updatePlayPauseButton();
        } catch (error) {
          // Ignore autoplay errors
        }
      }
    };

    // Force 'shown' on page load, then apply display mode
    loadDisplayPreference();

    return {
      syncMusicControls: () => {},
      setTrackById,
      getCurrentTrack: () => currentTrack,
      startPlayback,
      setVolume: (value) => {
        if (controller?.setVolume) {
          controller.setVolume(clamp(value, 0, 1));
        }
      },
      showContainer: () => {
        setContainerState(ContainerState.SHOWN);
        cancelAutoHide();
      },
      showTemp,
      hideContainer: () => {
        setContainerState(ContainerState.HIDDEN);
        cancelAutoHide();
      },
      toggleContainer: () => {
        if (containerState === ContainerState.HIDDEN) {
          setContainerState(ContainerState.SHOWN);
          cancelAutoHide();
        } else {
          setContainerState(ContainerState.HIDDEN);
          cancelAutoHide();
        }
      },
    };
  } catch (error) {
    console.error("Failed to initialize Spotify embed", error);
    return null;
  }
};
