
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
    type: "track",
  }
];

const SPOTIFY_IFRAME_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const THEME_VALUE = "dark"; // Dark mode
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
      const pathParts = url.pathname.split("/").filter(Boolean);
      // Extract type (playlist, track, album, etc.) and ID
      if (pathParts.length >= 2) {
        const type = pathParts[0]; // 'playlist', 'track', 'album', etc.
        const id = pathParts[1];
        if (id && (type === 'playlist' || type === 'track' || type === 'album' || type === 'artist' || type === 'episode' || type === 'show')) {
          return `spotify:${type}:${id}`;
        }
      }
      // Fallback: try to extract ID from path (old behavior for tracks)
      const id = pathParts[pathParts.length - 1];
      return id ? `spotify:track:${id}` : null;
    } catch {
      return null;
    }
  }
  return `spotify:track:${value}`;
};

const parseSpotifyUrl = (urlString) => {
  if (!urlString) return null;

  const uri = toSpotifyUri(urlString);
  if (!uri) return null;

  // Extract type and ID from URI
  const match = uri.match(/^spotify:(\w+):(.+)$/);
  if (!match) return null;

  const [, type, id] = match;

  return {
    id,
    uri,
    type, // 'playlist', 'track', 'album', etc.
    title: type === 'playlist' ? 'Custom Playlist' : 'Custom Track',
    artist: 'Spotify',
  };
};

const fetchSpotifyOEmbed = async (spotifyUrl) => {
  try {
    const encodedUrl = encodeURIComponent(spotifyUrl);
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodedUrl}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error(`oEmbed API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      type: data.type,
    };
  } catch (error) {
    console.error('Error fetching oEmbed data:', error);
    return null;
  }
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
      type: option.dataset.type || 'track', // Default to 'track' for existing options
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
        height: "100%" // Let CSS control the height
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

    // Prompt user to label a playlist/track
    const promptForLabel = (item, onSave, options = {}) => {
      const { askForArtistOnly = false } = options;
      return new Promise((resolve) => {
        // Create modal elements
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        const panel = document.createElement('div');
        panel.className = 'modal-panel';

        const header = document.createElement('header');
        header.className = 'modal-header';

        const title = document.createElement('h2');
        title.textContent = askForArtistOnly ? 'label artist' : (item.type === 'playlist' ? 'label playlist' : 'label track');

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'close');
        closeBtn.textContent = '×';

        header.appendChild(title);
        header.appendChild(closeBtn);

        const form = document.createElement('form');
        form.className = 'modal-form';

        let input, artistInput;

        if (askForArtistOnly) {
          // Show track name (read-only) and artist input
          const trackLabel = document.createElement('label');
          trackLabel.className = 'music-select';
          trackLabel.style.marginBottom = 'var(--space-md)';

          const trackLabelText = document.createElement('span');
          trackLabelText.textContent = 'track name';
          trackLabelText.style.display = 'block';
          trackLabelText.style.marginBottom = 'var(--space-xs)';

          const trackDisplay = document.createElement('div');
          trackDisplay.textContent = item.title;
          trackDisplay.style.padding = '0.5rem';
          trackDisplay.style.border = '1px solid rgba(255, 255, 255, 0.1)';
          trackDisplay.style.background = 'rgba(0, 0, 0, 0.2)';
          trackDisplay.style.color = 'rgba(255, 255, 255, 0.7)';
          trackDisplay.style.borderRadius = '4px';
          trackDisplay.style.fontSize = 'var(--font-size-interactive-sm)';

          trackLabel.appendChild(trackLabelText);
          trackLabel.appendChild(trackDisplay);
          form.appendChild(trackLabel);

          const artistLabel = document.createElement('label');
          artistLabel.className = 'music-select';
          artistLabel.style.marginBottom = 'var(--space-md)';

          const artistLabelText = document.createElement('span');
          artistLabelText.textContent = 'artist name';
          artistLabelText.style.display = 'block';
          artistLabelText.style.marginBottom = 'var(--space-xs)';

          artistInput = document.createElement('input');
          artistInput.type = 'text';
          artistInput.placeholder = 'Artist Name';
          artistInput.value = item.artist === 'Spotify' ? '' : item.artist;
          artistInput.style.width = '100%';
          artistInput.style.padding = '0.5rem';
          artistInput.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          artistInput.style.background = 'rgba(0, 0, 0, 0.3)';
          artistInput.style.color = 'white';
          artistInput.style.borderRadius = '4px';
          artistInput.style.fontSize = 'var(--font-size-interactive-sm)';

          artistLabel.appendChild(artistLabelText);
          artistLabel.appendChild(artistInput);
          form.appendChild(artistLabel);
        } else {
          // Show title input
          const label = document.createElement('label');
          label.className = 'music-select';
          label.style.marginBottom = 'var(--space-md)';

          const labelText = document.createElement('span');
          labelText.textContent = item.type === 'playlist' ? 'playlist name' : 'track name';
          labelText.style.display = 'block';
          labelText.style.marginBottom = 'var(--space-xs)';

          input = document.createElement('input');
          input.type = 'text';
          input.placeholder = item.type === 'playlist' ? 'My Playlist' : 'Song Name';
          input.value = item.title === 'Custom Playlist' || item.title === 'Custom Track' ? '' : item.title;
          input.style.width = '100%';
          input.style.padding = '0.5rem';
          input.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          input.style.background = 'rgba(0, 0, 0, 0.3)';
          input.style.color = 'white';
          input.style.borderRadius = '4px';
          input.style.fontSize = 'var(--font-size-interactive-sm)';

          label.appendChild(labelText);
          label.appendChild(input);
          form.appendChild(label);
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = 'var(--space-sm)';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = 'var(--space-md)';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'glass-button';
        saveBtn.textContent = 'save';
        saveBtn.style.padding = '0.5rem 1rem';

        const skipBtn = document.createElement('button');
        skipBtn.type = 'button';
        skipBtn.className = 'glass-button';
        skipBtn.textContent = 'skip';
        skipBtn.style.padding = '0.5rem 1rem';

        buttonContainer.appendChild(skipBtn);
        buttonContainer.appendChild(saveBtn);

        form.appendChild(buttonContainer);

        panel.appendChild(header);
        panel.appendChild(form);

        modal.appendChild(backdrop);
        modal.appendChild(panel);

        document.body.appendChild(modal);

        // Focus input
        const focusInput = askForArtistOnly ? artistInput : input;
        setTimeout(() => focusInput.focus(), 100);

        const cleanup = () => {
          document.body.removeChild(modal);
        };

        const handleSave = () => {
          if (askForArtistOnly) {
            const newArtist = artistInput.value.trim();
            if (newArtist) {
              item.artist = newArtist;
              if (onSave) {
                onSave(item);
              }
            }
            cleanup();
            resolve(newArtist || null);
          } else {
            const newTitle = input.value.trim();
            if (newTitle) {
              item.title = newTitle;
              if (onSave) {
                onSave(item);
              }
            }
            cleanup();
            resolve(newTitle || null);
          }
        };

        const handleSkip = () => {
          cleanup();
          resolve(null);
        };

        saveBtn.addEventListener('click', handleSave);
        skipBtn.addEventListener('click', handleSkip);
        closeBtn.addEventListener('click', handleSkip);
        backdrop.addEventListener('click', handleSkip);

        const keyInput = askForArtistOnly ? artistInput : input;
        keyInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleSkip();
          }
        });
      });
    };

    // Add custom playlist/track to dropdown
    const addToDropdown = (item) => {
      if (!trackSelect) return;

      // Check if item already exists
      const existingOption = trackSelect.querySelector(`option[value="${item.id}"]`);
      if (existingOption) {
        // Update existing option
        existingOption.textContent = item.type === 'playlist'
          ? `📁 ${item.title}`
          : `${item.title} by ${item.artist}`;
        existingOption.dataset.title = item.title;
        existingOption.dataset.artist = item.artist;
        existingOption.dataset.uri = item.uri;
        existingOption.dataset.type = item.type;
        return;
      }

      // Create new option
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.type === 'playlist'
        ? `📁 ${item.title}`
        : `${item.title} by ${item.artist}`;
      option.dataset.title = item.title;
      option.dataset.artist = item.artist;
      option.dataset.uri = item.uri;
      option.dataset.type = item.type;

      // Add to dropdown (append to end)
      trackSelect.appendChild(option);

      // Add to tracks array if not already present
      if (!tracks.find(t => t.id === item.id)) {
        tracks.push(item);
      }
    };

    const mountIframe = async (track) => {
      currentTrack = track;
      if (typeof window !== 'undefined' && window.__spotifyController) {
        window.__spotifyCurrentTrack = currentTrack;
      }

      // Update wrapper data attribute based on track type
      if (wrapper) {
        wrapper.setAttribute('data-spotify-type', track.type || 'track');
      }

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

        // Update wrapper data attribute when switching tracks
        if (wrapper) {
          wrapper.setAttribute('data-spotify-type', track.type || 'track');
        }

        // Load the new URI and await if it returns a promise
        const loadResult = controller.loadUri(track.uri, "dark");
        if (loadResult && typeof loadResult.then === 'function') {
          loadResult.then(() => {
            // URI loaded successfully
          }).catch((error) => {
            console.error('❌ Error loading URI:', error);
          });
        }

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
      // Find by ID first, then by URI
      const track =
        tracks.find((candidate) => candidate.id === id) ||
        tracks.find((candidate) => candidate.uri === id) ||
        tracks.find((candidate) => candidate.uri === `spotify:track:${id}`) ||
        tracks.find((candidate) => candidate.uri === `spotify:playlist:${id}`) ||
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

    // Handle custom URL input
    const urlInput = document.getElementById("music-url-input");
    const urlSubmitBtn = document.getElementById("music-url-submit");

    const handleCustomUrl = async (urlString) => {
      const parsed = parseSpotifyUrl(urlString);
      if (!parsed) {
        console.warn("Invalid Spotify URL");
        return;
      }

      // Fetch metadata from oEmbed API
      const oembedData = await fetchSpotifyOEmbed(urlString);

      // Create a track/playlist object
      const customItem = {
        id: parsed.id,
        uri: parsed.uri,
        title: oembedData?.title || parsed.title,
        artist: parsed.artist, // Will be updated if we get it from playback_update
        type: parsed.type,
      };

      // Add to dropdown immediately with oEmbed title (if available)
      addToDropdown(customItem);

      // Load the custom track/playlist
      currentTrack = customItem;

      // Track if we've prompted for artist (for tracks only)
      let hasPromptedForArtist = false;
      let hasGotArtistFromPlayback = false;
      let hasPromptedForFullLabel = false;

      const maybePromptForArtist = () => {
        if (hasPromptedForArtist || hasGotArtistFromPlayback) return;
        if (customItem.type === 'track' && customItem.artist === 'Spotify') {
          hasPromptedForArtist = true;
          promptForLabel(customItem, (updatedItem) => {
            addToDropdown(updatedItem);
          }, { askForArtistOnly: true });
        }
      };

      const maybePromptForFullLabel = () => {
        if (hasPromptedForFullLabel) return;
        const stillHasDefaultName = customItem.title === 'Custom Playlist' || customItem.title === 'Custom Track';
        if (stillHasDefaultName) {
          hasPromptedForFullLabel = true;
          promptForLabel(customItem, (updatedItem) => {
            addToDropdown(updatedItem);
          });
        }
      };

      if (!controller) {
        // Update wrapper data attribute based on track type
        if (wrapper) {
          wrapper.setAttribute('data-spotify-type', customItem.type || 'track');
        }

        wrapper.innerHTML = "";
        const mount = document.createElement("div");
        mount.className = "spotify-iframe";
        wrapper.appendChild(mount);
        controller = await createController(api, mount, customItem);

        const waitForIframe = () => {
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          } else {
            setTimeout(waitForIframe, 50);
          }
        };
        waitForIframe();

        controller.addListener("ready", () => {
          isReady = true;
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          }
          if (onReady) {
            onReady();
          }
        });

        controller.addListener("playback_update", ({ data }) => {
          if (data) {
            isPlaying = !data.isPaused;
            updatePlayPauseButton();

            // For tracks, try to get artist from playback data
            if (data.track && customItem.type === 'track') {
              if (data.track.artist) {
                // Got artist from playback!
                hasGotArtistFromPlayback = true;
                customItem.artist = data.track.artist;
                // Update dropdown option
                const option = trackSelect?.querySelector(`option[value="${customItem.id}"]`);
                if (option) {
                  option.textContent = `${customItem.title} by ${data.track.artist}`;
                  option.dataset.title = customItem.title;
                  option.dataset.artist = data.track.artist;
                }
                addToDropdown(customItem);
              } else {
                // No artist in playback data, prompt for it after short delay
                setTimeout(() => maybePromptForArtist(), 1000);
              }
            }
            // For playlists, we already have title from oEmbed, nothing else needed
          }
        });

        // Fallback: if playback_update doesn't provide artist for tracks, prompt after delay
        if (customItem.type === 'track' && !oembedData?.title) {
          // No oEmbed title, prompt for full label
          setTimeout(() => {
            if (customItem.title === 'Custom Track') {
              maybePromptForFullLabel();
            }
          }, 2000);
        } else if (customItem.type === 'track') {
          // Have title but no artist yet, wait a bit for playback_update
          setTimeout(() => maybePromptForArtist(), 2000);
        }
      } else {
        const wasPlaying = isPlaying;
        let hasResumed = false;

        const resumeListener = ({ data }) => {
          if (data && data.track && data.track.uri === customItem.uri && !hasResumed && wasPlaying) {
            hasResumed = true;
            if (controller?.play) {
              const playResult = controller.play();
              if (playResult && typeof playResult.catch === 'function') {
                playResult.catch(() => {});
              }
            }
          }
        };

        controller.addListener("playback_update", resumeListener);

        // Update wrapper data attribute when loading custom URL with existing controller
        if (wrapper) {
          wrapper.setAttribute('data-spotify-type', customItem.type || 'track');
        }

        // Load the new URI and await if it returns a promise
        const loadResult = controller.loadUri(customItem.uri, "dark");
        if (loadResult && typeof loadResult.then === 'function') {
          loadResult.then(() => {
            // URI loaded successfully
          }).catch((error) => {
            console.error('❌ Error loading custom URI:', error);
          });
        }

        setTimeout(() => {
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            configureIframeAttributes(iframe);
          }
        }, 100);

        setTimeout(() => {
          hasResumed = true;
        }, 2000);

        // For existing controller, check for artist in playback_update
        const labelCheckListener = ({ data }) => {
          if (data && data.track && customItem.type === 'track') {
            if (data.track.artist) {
              hasGotArtistFromPlayback = true;
              customItem.artist = data.track.artist;
              const option = trackSelect?.querySelector(`option[value="${customItem.id}"]`);
              if (option) {
                option.textContent = `${customItem.title} by ${data.track.artist}`;
                option.dataset.title = customItem.title;
                option.dataset.artist = data.track.artist;
              }
              addToDropdown(customItem);
              controller.removeListener("playback_update", labelCheckListener);
            } else {
              setTimeout(() => maybePromptForArtist(), 1000);
            }
          }
        };
        controller.addListener("playback_update", labelCheckListener);

        // Fallback prompt for artist if needed
        if (customItem.type === 'track') {
          setTimeout(() => maybePromptForArtist(), 2000);
        }
      }

      // Select the newly added item in the dropdown
      if (trackSelect) {
        trackSelect.value = customItem.id;
      }

      showTemp();
    };

    if (urlInput && urlSubmitBtn) {
      urlSubmitBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (url) {
          await handleCustomUrl(url);
          urlInput.value = ""; // Clear input after submission
        }
      });

      urlInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const url = urlInput.value.trim();
          if (url) {
            await handleCustomUrl(url);
            urlInput.value = ""; // Clear input after submission
          }
        }
      });
    }

    // Play/pause button handler
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", async () => {
        if (!controller || !isReady) return;
        try {
          // Use togglePlay if available (preferred method - doesn't restart track)
          if (typeof controller.togglePlay === 'function') {
            const toggleResult = controller.togglePlay();
            if (toggleResult && typeof toggleResult.then === 'function') {
              await toggleResult;
            }
            // State will be updated by playback_update event
          } else if (typeof controller.pause === 'function' && typeof controller.resume === 'function') {
            // Use pause/resume methods (resume doesn't restart the track)
            if (isPlaying) {
              const pauseResult = controller.pause();
              if (pauseResult && typeof pauseResult.then === 'function') {
                await pauseResult;
              }
              // State will be updated by playback_update event
            } else {
              // Use resume() to restart if paused (doesn't restart the track)
              const resumeResult = controller.resume();
              if (resumeResult && typeof resumeResult.then === 'function') {
                await resumeResult;
              }
              // State will be updated by playback_update event
            }
          } else if (typeof controller.pause === 'function' && typeof controller.play === 'function') {
            // Fallback to play/pause methods if resume is not available
            if (isPlaying) {
              const pauseResult = controller.pause();
              if (pauseResult && typeof pauseResult.then === 'function') {
                await pauseResult;
              }
              // State will be updated by playback_update event
            } else {
              const playResult = controller.play();
              if (playResult && typeof playResult.then === 'function') {
                await playResult;
              }
              // State will be updated by playback_update event
            }
          }
          // Don't manually update isPlaying - let playback_update event handle it
          // This ensures we're in sync with the actual playback state
        } catch (error) {
          console.error("Error toggling playback:", error);
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
      getController: () => controller,
      startPlayback,
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
