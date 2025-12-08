var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// assets/js/modules/utils.js
var clamp, ensureOrder, formatSeconds, applyConfig, getViewportMetrics;
var init_utils = __esm({
  "assets/js/modules/utils.js"() {
    clamp = (value, min, max) => {
      if (Number.isNaN(value)) {
        return min;
      }
      if (typeof max === "number") {
        return Math.min(Math.max(value, min), max);
      }
      return Math.max(value, min);
    };
    ensureOrder = (object, minKey, maxKey) => {
      if (object[minKey] > object[maxKey]) {
        const temp = object[minKey];
        object[minKey] = object[maxKey];
        object[maxKey] = temp;
      }
    };
    formatSeconds = (seconds) => {
      if (!Number.isFinite(seconds)) {
        return "0";
      }
      const decimals = seconds >= 5 ? 1 : 2;
      const trimmed = Number(seconds.toFixed(decimals));
      return trimmed.toString();
    };
    applyConfig = (target, source) => {
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
    getViewportMetrics = () => {
      if (typeof window === "undefined") {
        return {
          width: 0,
          height: 0,
          layoutWidth: 0,
          layoutHeight: 0,
          visualWidth: 0,
          visualHeight: 0,
          keyboardOffset: 0,
          scale: 1,
          offsetTop: 0,
          offsetBottom: 0,
          isKeyboardVisible: false
        };
      }
      const innerWidth = window.innerWidth || 0;
      const innerHeight = window.innerHeight || 0;
      const visual = window.visualViewport;
      if (!visual) {
        return {
          width: innerWidth,
          height: innerHeight,
          layoutWidth: innerWidth,
          layoutHeight: innerHeight,
          visualWidth: innerWidth,
          visualHeight: innerHeight,
          keyboardOffset: 0,
          scale: 1,
          offsetTop: 0,
          offsetBottom: 0,
          isKeyboardVisible: false
        };
      }
      const offsetTop = typeof visual.offsetTop === "number" ? visual.offsetTop : 0;
      const offsetBottom = Math.max(innerHeight - (visual.height + offsetTop), 0);
      const isKeyboardVisible = offsetBottom > 0 || offsetTop > 0 || visual.height < innerHeight * 0.85;
      const layoutWidth = innerWidth;
      const layoutHeight = innerHeight || visual.height || 0;
      const visualWidth = visual.width || layoutWidth;
      const visualHeight = visual.height || layoutHeight;
      const effectiveHeight = isKeyboardVisible ? Math.max(layoutHeight, visualHeight) : visualHeight;
      const keyboardOffset = isKeyboardVisible ? offsetBottom : 0;
      return {
        width: visualWidth,
        height: effectiveHeight,
        layoutWidth,
        layoutHeight,
        visualWidth,
        visualHeight,
        keyboardOffset,
        scale: typeof visual.scale === "number" ? visual.scale : 1,
        offsetTop,
        offsetBottom,
        isKeyboardVisible
      };
    };
  }
});

// assets/js/modules/spotify-embed.js
var spotify_embed_exports = {};
__export(spotify_embed_exports, {
  initSpotifyControls: () => initSpotifyControls
});
var ContainerState, PREAPPROVED_TRACKS, SPOTIFY_IFRAME_SRC, THEME_VALUE, spotifyApiPromise, ensureSpotifyScript, waitForSpotifyApi, toSpotifyUri, parseSpotifyUrl, fetchSpotifyOEmbed, mergeTrackSources, createController, configureIframeAttributes, STORAGE_KEY_DISPLAY, AUTO_HIDE_DELAY_MS, initSpotifyControls;
var init_spotify_embed = __esm({
  "assets/js/modules/spotify-embed.js"() {
    init_utils();
    ContainerState = {
      HIDDEN: "hidden",
      SHOWN: "shown",
      TEMP_SHOW: "tempShow"
    };
    PREAPPROVED_TRACKS = [
      {
        id: "4qHBvrzFbpUWeFxhdbpar8",
        uri: "spotify:track:4qHBvrzFbpUWeFxhdbpar8",
        title: "One day in August",
        artist: "Marc Teichert",
        type: "track"
      }
    ];
    SPOTIFY_IFRAME_SRC = "https://open.spotify.com/embed/iframe-api/v1";
    THEME_VALUE = "dark";
    spotifyApiPromise = null;
    ensureSpotifyScript = () => {
      var _a;
      if (document.querySelector(`script[src="${SPOTIFY_IFRAME_SRC}"]`)) return;
      const script = document.createElement("script");
      script.src = SPOTIFY_IFRAME_SRC;
      script.async = true;
      (_a = document.body) == null ? void 0 : _a.appendChild(script);
    };
    waitForSpotifyApi = () => {
      if (window.SpotifyIframeApi) {
        return Promise.resolve(window.SpotifyIframeApi);
      }
      if (!spotifyApiPromise) {
        spotifyApiPromise = new Promise((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error("Spotify IFrame API never became ready")),
            15e3
          );
          const prevReady = window.onSpotifyIframeApiReady;
          window.onSpotifyIframeApiReady = (api) => {
            prevReady == null ? void 0 : prevReady(api);
            window.clearTimeout(timeout);
            resolve(api);
          };
          ensureSpotifyScript();
        });
      }
      return spotifyApiPromise;
    };
    toSpotifyUri = (value) => {
      if (!value) return null;
      if (value.startsWith("spotify:")) return value;
      if (value.startsWith("http")) {
        try {
          const url = new URL(value);
          const pathParts = url.pathname.split("/").filter(Boolean);
          if (pathParts.length >= 2) {
            const type = pathParts[0];
            const id2 = pathParts[1];
            if (id2 && (type === "playlist" || type === "track" || type === "album" || type === "artist" || type === "episode" || type === "show")) {
              return `spotify:${type}:${id2}`;
            }
          }
          const id = pathParts[pathParts.length - 1];
          return id ? `spotify:track:${id}` : null;
        } catch {
          return null;
        }
      }
      return `spotify:track:${value}`;
    };
    parseSpotifyUrl = (urlString) => {
      if (!urlString) return null;
      const uri = toSpotifyUri(urlString);
      if (!uri) return null;
      const match = uri.match(/^spotify:(\w+):(.+)$/);
      if (!match) return null;
      const [, type, id] = match;
      return {
        id,
        uri,
        type,
        // 'playlist', 'track', 'album', etc.
        title: type === "playlist" ? "Custom Playlist" : "Custom Track",
        artist: "Spotify"
      };
    };
    fetchSpotifyOEmbed = async (spotifyUrl) => {
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
          type: data.type
        };
      } catch (error) {
        console.error("Error fetching oEmbed data:", error);
        return null;
      }
    };
    mergeTrackSources = (trackSelect) => {
      const merged = [...PREAPPROVED_TRACKS];
      if (!trackSelect) return merged;
      Array.from(trackSelect.options).forEach((option) => {
        var _a;
        const id = option.value;
        const uri = toSpotifyUri(option.dataset.uri || id);
        if (!uri) return;
        const incoming = {
          id,
          uri,
          title: option.dataset.title || ((_a = option.textContent) == null ? void 0 : _a.trim()) || id,
          artist: option.dataset.artist || "Unknown artist",
          type: option.dataset.type || "track"
          // Default to 'track' for existing options
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
    createController = (api, mount, track) => new Promise((resolve, reject) => {
      api.createController(
        mount,
        {
          uri: track.uri,
          theme: THEME_VALUE,
          width: "100%",
          height: "100%"
          // Let CSS control the height
        },
        (controller) => {
          if (!controller) {
            reject(new Error("Spotify controller unavailable"));
          } else {
            resolve(controller);
          }
        }
      );
    });
    configureIframeAttributes = (iframe) => {
      if (!iframe) return;
      iframe.style.borderRadius = "13px";
    };
    STORAGE_KEY_DISPLAY = "spotify-display";
    AUTO_HIDE_DELAY_MS = 1e4;
    initSpotifyControls = async ({
      wrapper = document.getElementById("spotify-iframe-wrapper") || document.getElementById("spotify-embed-container"),
      container = document.getElementById("spotify-embed-container"),
      trackSelect = document.getElementById("music-track"),
      displaySelect = document.getElementById("music-display"),
      playPauseBtn = document.getElementById("music-play-pause"),
      defaultTrackId,
      onReady
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
      let containerState = ContainerState.SHOWN;
      let displayMode = "shown";
      let autoHideTimeout = null;
      let tempShowTimeout = null;
      const loadDisplayPreference = () => {
        displayMode = "shown";
        if (displaySelect) {
          displaySelect.value = displayMode;
        }
        applyDisplayMode();
      };
      const saveDisplayPreference = (value) => {
        displayMode = value;
        localStorage.setItem(STORAGE_KEY_DISPLAY, value);
        applyDisplayMode();
      };
      const applyDisplayMode = () => {
        cancelAutoHide();
        if (displayMode === "hidden") {
          setContainerState(ContainerState.HIDDEN);
        } else {
          setContainerState(ContainerState.SHOWN);
        }
      };
      const setContainerState = (newState) => {
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
        if (displaySelect && !isTempShow) {
          if (isHidden) {
            displaySelect.value = "hidden";
          } else {
            displaySelect.value = "shown";
          }
        }
        const iframe = wrapper.querySelector("iframe");
        if (iframe) {
          iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
          iframe.offsetWidth;
          iframe.style.width = isHidden ? "0%" : "100%";
        }
        if (isTempShow) {
          const TEMP_SHOW_DURATION_MS = 1e4;
          tempShowTimeout = setTimeout(() => {
            setContainerState(ContainerState.HIDDEN);
          }, TEMP_SHOW_DURATION_MS);
        }
      };
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
      const cancelAutoHide = () => {
        if (autoHideTimeout) {
          clearTimeout(autoHideTimeout);
          autoHideTimeout = null;
        }
      };
      const showTemp = () => {
        if (containerState === ContainerState.HIDDEN) {
          cancelAutoHide();
          setContainerState(ContainerState.TEMP_SHOW);
        }
      };
      if (displaySelect) {
        displaySelect.addEventListener("change", (event) => {
          const value = event.target.value;
          saveDisplayPreference(value);
        });
      }
      let previousStateBeforeHover = null;
      const showOnInteraction = () => {
        if (containerState === ContainerState.HIDDEN) {
          previousStateBeforeHover = ContainerState.HIDDEN;
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
            iframe.offsetWidth;
            iframe.style.width = "100%";
          }
          if (container) {
            container.classList.remove("is-hidden");
          }
        }
      };
      const hideOnInteraction = () => {
        if (previousStateBeforeHover === ContainerState.HIDDEN && containerState === ContainerState.HIDDEN) {
          const iframe = wrapper.querySelector("iframe");
          if (iframe) {
            iframe.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
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
      let isFirstThoughtsInteraction = true;
      const thoughtInput2 = document.getElementById("thoughts");
      if (thoughtInput2) {
        const handleFirstThoughtsInteraction = () => {
          if (isFirstThoughtsInteraction) {
            isFirstThoughtsInteraction = false;
            showTemp();
          }
        };
        thoughtInput2.addEventListener("click", handleFirstThoughtsInteraction, { once: true });
        thoughtInput2.addEventListener("focus", handleFirstThoughtsInteraction, { once: true });
        thoughtInput2.addEventListener("pointerdown", handleFirstThoughtsInteraction, { once: true });
      }
      try {
        const api = await waitForSpotifyApi();
        let controller = null;
        let currentTrack = null;
        let isPlaying = false;
        let isReady = false;
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
        const promptForLabel = (item, onSave, options = {}) => {
          const { askForArtistOnly = false } = options;
          return new Promise((resolve) => {
            const modal = document.createElement("div");
            modal.className = "modal active";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            modal.setAttribute("aria-hidden", "false");
            const backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop";
            const panel = document.createElement("div");
            panel.className = "modal-panel";
            const header = document.createElement("header");
            header.className = "modal-header";
            const title = document.createElement("h2");
            title.textContent = askForArtistOnly ? "label artist" : item.type === "playlist" ? "label playlist" : "label track";
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "modal-close";
            closeBtn.setAttribute("aria-label", "close");
            closeBtn.textContent = "\xD7";
            header.appendChild(title);
            header.appendChild(closeBtn);
            const form = document.createElement("form");
            form.className = "modal-form";
            let input, artistInput;
            if (askForArtistOnly) {
              const trackLabel = document.createElement("label");
              trackLabel.className = "music-select";
              trackLabel.style.marginBottom = "var(--space-md)";
              const trackLabelText = document.createElement("span");
              trackLabelText.textContent = "track name";
              trackLabelText.style.display = "block";
              trackLabelText.style.marginBottom = "var(--space-xs)";
              const trackDisplay = document.createElement("div");
              trackDisplay.textContent = item.title;
              trackDisplay.style.padding = "0.5rem";
              trackDisplay.style.border = "1px solid rgba(255, 255, 255, 0.1)";
              trackDisplay.style.background = "rgba(0, 0, 0, 0.2)";
              trackDisplay.style.color = "rgba(255, 255, 255, 0.7)";
              trackDisplay.style.borderRadius = "4px";
              trackDisplay.style.fontSize = "var(--font-size-interactive-sm)";
              trackLabel.appendChild(trackLabelText);
              trackLabel.appendChild(trackDisplay);
              form.appendChild(trackLabel);
              const artistLabel = document.createElement("label");
              artistLabel.className = "music-select";
              artistLabel.style.marginBottom = "var(--space-md)";
              const artistLabelText = document.createElement("span");
              artistLabelText.textContent = "artist name";
              artistLabelText.style.display = "block";
              artistLabelText.style.marginBottom = "var(--space-xs)";
              artistInput = document.createElement("input");
              artistInput.type = "text";
              artistInput.placeholder = "Artist Name";
              artistInput.value = item.artist === "Spotify" ? "" : item.artist;
              artistInput.style.width = "100%";
              artistInput.style.padding = "0.5rem";
              artistInput.style.border = "1px solid rgba(255, 255, 255, 0.2)";
              artistInput.style.background = "rgba(0, 0, 0, 0.3)";
              artistInput.style.color = "white";
              artistInput.style.borderRadius = "4px";
              artistInput.style.fontSize = "var(--font-size-interactive-sm)";
              artistLabel.appendChild(artistLabelText);
              artistLabel.appendChild(artistInput);
              form.appendChild(artistLabel);
            } else {
              const label = document.createElement("label");
              label.className = "music-select";
              label.style.marginBottom = "var(--space-md)";
              const labelText = document.createElement("span");
              labelText.textContent = item.type === "playlist" ? "playlist name" : "track name";
              labelText.style.display = "block";
              labelText.style.marginBottom = "var(--space-xs)";
              input = document.createElement("input");
              input.type = "text";
              input.placeholder = item.type === "playlist" ? "My Playlist" : "Song Name";
              input.value = item.title === "Custom Playlist" || item.title === "Custom Track" ? "" : item.title;
              input.style.width = "100%";
              input.style.padding = "0.5rem";
              input.style.border = "1px solid rgba(255, 255, 255, 0.2)";
              input.style.background = "rgba(0, 0, 0, 0.3)";
              input.style.color = "white";
              input.style.borderRadius = "4px";
              input.style.fontSize = "var(--font-size-interactive-sm)";
              label.appendChild(labelText);
              label.appendChild(input);
              form.appendChild(label);
            }
            const buttonContainer = document.createElement("div");
            buttonContainer.style.display = "flex";
            buttonContainer.style.gap = "var(--space-sm)";
            buttonContainer.style.justifyContent = "flex-end";
            buttonContainer.style.marginTop = "var(--space-md)";
            const saveBtn = document.createElement("button");
            saveBtn.type = "button";
            saveBtn.className = "glass-button";
            saveBtn.textContent = "save";
            saveBtn.style.padding = "0.5rem 1rem";
            const skipBtn = document.createElement("button");
            skipBtn.type = "button";
            skipBtn.className = "glass-button";
            skipBtn.textContent = "skip";
            skipBtn.style.padding = "0.5rem 1rem";
            buttonContainer.appendChild(skipBtn);
            buttonContainer.appendChild(saveBtn);
            form.appendChild(buttonContainer);
            panel.appendChild(header);
            panel.appendChild(form);
            modal.appendChild(backdrop);
            modal.appendChild(panel);
            document.body.appendChild(modal);
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
            saveBtn.addEventListener("click", handleSave);
            skipBtn.addEventListener("click", handleSkip);
            closeBtn.addEventListener("click", handleSkip);
            backdrop.addEventListener("click", handleSkip);
            const keyInput = askForArtistOnly ? artistInput : input;
            keyInput.addEventListener("keypress", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleSkip();
              }
            });
          });
        };
        const addToDropdown = (item) => {
          if (!trackSelect) return;
          const existingOption = trackSelect.querySelector(`option[value="${item.id}"]`);
          if (existingOption) {
            existingOption.textContent = item.type === "playlist" ? `\u{1F4C1} ${item.title}` : `${item.title} by ${item.artist}`;
            existingOption.dataset.title = item.title;
            existingOption.dataset.artist = item.artist;
            existingOption.dataset.uri = item.uri;
            existingOption.dataset.type = item.type;
            return;
          }
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.type === "playlist" ? `\u{1F4C1} ${item.title}` : `${item.title} by ${item.artist}`;
          option.dataset.title = item.title;
          option.dataset.artist = item.artist;
          option.dataset.uri = item.uri;
          option.dataset.type = item.type;
          trackSelect.appendChild(option);
          if (!tracks.find((t) => t.id === item.id)) {
            tracks.push(item);
          }
        };
        const mountIframe = async (track) => {
          currentTrack = track;
          if (typeof window !== "undefined" && window.__spotifyController) {
            window.__spotifyCurrentTrack = currentTrack;
          }
          if (wrapper) {
            wrapper.setAttribute("data-spotify-type", track.type || "track");
          }
          if (!controller) {
            wrapper.innerHTML = "";
            const mount = document.createElement("div");
            mount.className = "spotify-iframe";
            wrapper.appendChild(mount);
            controller = await createController(api, mount, track);
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
              }
            });
          } else {
            const wasPlaying = isPlaying;
            let hasResumed = false;
            const resumeListener = ({ data }) => {
              if (data && data.track && data.track.uri === track.uri && !hasResumed && wasPlaying) {
                hasResumed = true;
                if (controller == null ? void 0 : controller.play) {
                  const playResult = controller.play();
                  if (playResult && typeof playResult.catch === "function") {
                    playResult.catch(() => {
                    });
                  }
                }
              }
            };
            controller.addListener("playback_update", resumeListener);
            if (wrapper) {
              wrapper.setAttribute("data-spotify-type", track.type || "track");
            }
            const loadResult = controller.loadUri(track.uri, "dark");
            if (loadResult && typeof loadResult.then === "function") {
              loadResult.then(() => {
              }).catch((error) => {
                console.error("\u274C Error loading URI:", error);
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
            }, 2e3);
          }
        };
        const setTrackById = async (id, { autoplay } = {}) => {
          const track = tracks.find((candidate) => candidate.id === id) || tracks.find((candidate) => candidate.uri === id) || tracks.find((candidate) => candidate.uri === `spotify:track:${id}`) || tracks.find((candidate) => candidate.uri === `spotify:playlist:${id}`) || tracks[0];
          if (!track) return;
          const shouldAutoplay = autoplay !== void 0 ? autoplay : isPlaying;
          await mountIframe(track);
          if (shouldAutoplay && (controller == null ? void 0 : controller.play)) {
            const playResult = controller.play();
            if (playResult && typeof playResult.catch === "function") {
              playResult.catch(() => {
              });
            }
          }
          if (trackSelect && trackSelect.value !== track.id) {
            trackSelect.value = track.id;
          }
          showTemp();
        };
        trackSelect == null ? void 0 : trackSelect.addEventListener("change", (event) => {
          setTrackById(event.target.value);
        });
        const urlInput = document.getElementById("music-url-input");
        const urlSubmitBtn = document.getElementById("music-url-submit");
        const handleCustomUrl = async (urlString) => {
          const parsed = parseSpotifyUrl(urlString);
          if (!parsed) {
            console.warn("Invalid Spotify URL");
            return;
          }
          const oembedData = await fetchSpotifyOEmbed(urlString);
          const customItem = {
            id: parsed.id,
            uri: parsed.uri,
            title: (oembedData == null ? void 0 : oembedData.title) || parsed.title,
            artist: parsed.artist,
            // Will be updated if we get it from playback_update
            type: parsed.type
          };
          addToDropdown(customItem);
          currentTrack = customItem;
          let hasPromptedForArtist = false;
          let hasGotArtistFromPlayback = false;
          let hasPromptedForFullLabel = false;
          const maybePromptForArtist = () => {
            if (hasPromptedForArtist || hasGotArtistFromPlayback) return;
            if (customItem.type === "track" && customItem.artist === "Spotify") {
              hasPromptedForArtist = true;
              promptForLabel(customItem, (updatedItem) => {
                addToDropdown(updatedItem);
              }, { askForArtistOnly: true });
            }
          };
          const maybePromptForFullLabel = () => {
            if (hasPromptedForFullLabel) return;
            const stillHasDefaultName = customItem.title === "Custom Playlist" || customItem.title === "Custom Track";
            if (stillHasDefaultName) {
              hasPromptedForFullLabel = true;
              promptForLabel(customItem, (updatedItem) => {
                addToDropdown(updatedItem);
              });
            }
          };
          if (!controller) {
            if (wrapper) {
              wrapper.setAttribute("data-spotify-type", customItem.type || "track");
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
                if (data.track && customItem.type === "track") {
                  if (data.track.artist) {
                    hasGotArtistFromPlayback = true;
                    customItem.artist = data.track.artist;
                    const option = trackSelect == null ? void 0 : trackSelect.querySelector(`option[value="${customItem.id}"]`);
                    if (option) {
                      option.textContent = `${customItem.title} by ${data.track.artist}`;
                      option.dataset.title = customItem.title;
                      option.dataset.artist = data.track.artist;
                    }
                    addToDropdown(customItem);
                  } else {
                    setTimeout(() => maybePromptForArtist(), 1e3);
                  }
                }
              }
            });
            if (customItem.type === "track" && !(oembedData == null ? void 0 : oembedData.title)) {
              setTimeout(() => {
                if (customItem.title === "Custom Track") {
                  maybePromptForFullLabel();
                }
              }, 2e3);
            } else if (customItem.type === "track") {
              setTimeout(() => maybePromptForArtist(), 2e3);
            }
          } else {
            const wasPlaying = isPlaying;
            let hasResumed = false;
            const resumeListener = ({ data }) => {
              if (data && data.track && data.track.uri === customItem.uri && !hasResumed && wasPlaying) {
                hasResumed = true;
                if (controller == null ? void 0 : controller.play) {
                  const playResult = controller.play();
                  if (playResult && typeof playResult.catch === "function") {
                    playResult.catch(() => {
                    });
                  }
                }
              }
            };
            controller.addListener("playback_update", resumeListener);
            if (wrapper) {
              wrapper.setAttribute("data-spotify-type", customItem.type || "track");
            }
            const loadResult = controller.loadUri(customItem.uri, "dark");
            if (loadResult && typeof loadResult.then === "function") {
              loadResult.then(() => {
              }).catch((error) => {
                console.error("\u274C Error loading custom URI:", error);
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
            }, 2e3);
            const labelCheckListener = ({ data }) => {
              if (data && data.track && customItem.type === "track") {
                if (data.track.artist) {
                  hasGotArtistFromPlayback = true;
                  customItem.artist = data.track.artist;
                  const option = trackSelect == null ? void 0 : trackSelect.querySelector(`option[value="${customItem.id}"]`);
                  if (option) {
                    option.textContent = `${customItem.title} by ${data.track.artist}`;
                    option.dataset.title = customItem.title;
                    option.dataset.artist = data.track.artist;
                  }
                  addToDropdown(customItem);
                  controller.removeListener("playback_update", labelCheckListener);
                } else {
                  setTimeout(() => maybePromptForArtist(), 1e3);
                }
              }
            };
            controller.addListener("playback_update", labelCheckListener);
            if (customItem.type === "track") {
              setTimeout(() => maybePromptForArtist(), 2e3);
            }
          }
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
              urlInput.value = "";
            }
          });
          urlInput.addEventListener("keypress", async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const url = urlInput.value.trim();
              if (url) {
                await handleCustomUrl(url);
                urlInput.value = "";
              }
            }
          });
        }
        if (playPauseBtn) {
          playPauseBtn.addEventListener("click", async () => {
            if (!controller || !isReady) return;
            try {
              if (typeof controller.togglePlay === "function") {
                const toggleResult = controller.togglePlay();
                if (toggleResult && typeof toggleResult.then === "function") {
                  await toggleResult;
                }
              } else if (typeof controller.pause === "function" && typeof controller.resume === "function") {
                if (isPlaying) {
                  const pauseResult = controller.pause();
                  if (pauseResult && typeof pauseResult.then === "function") {
                    await pauseResult;
                  }
                } else {
                  const resumeResult = controller.resume();
                  if (resumeResult && typeof resumeResult.then === "function") {
                    await resumeResult;
                  }
                }
              } else if (typeof controller.pause === "function" && typeof controller.play === "function") {
                if (isPlaying) {
                  const pauseResult = controller.pause();
                  if (pauseResult && typeof pauseResult.then === "function") {
                    await pauseResult;
                  }
                } else {
                  const playResult = controller.play();
                  if (playResult && typeof playResult.then === "function") {
                    await playResult;
                  }
                }
              }
            } catch (error) {
              console.error("Error toggling playback:", error);
            }
          });
        }
        await setTrackById(defaultTrackId != null ? defaultTrackId : tracks[0].id);
        setContainerState(ContainerState.SHOWN);
        updatePlayPauseButton();
        const startPlayback = async () => {
          if (controller == null ? void 0 : controller.play) {
            try {
              const playResult = controller.play();
              if (playResult && typeof playResult.then === "function") {
                await playResult;
              }
              isPlaying = true;
              updatePlayPauseButton();
            } catch (error) {
            }
          }
        };
        loadDisplayPreference();
        return {
          syncMusicControls: () => {
          },
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
          }
        };
      } catch (error) {
        console.error("Failed to initialize Spotify embed", error);
        return null;
      }
    };
  }
});

// assets/js/modules/prompt-glow.js
var setGlowState = (input, isActive) => {
  if (!input) {
    return;
  }
  if (isActive) {
    input.classList.add("prompt-active");
  } else {
    input.classList.remove("prompt-active");
  }
};
var initPromptGlow = (input) => {
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

// assets/js/modules/backgrounds.js
var DEFAULT_BACKGROUNDS = [
  {
    desktop: "/images/desktop/hubble-m44-optimized.webp",
    mobile: "/images/mobile/hubble-m44-mobile.webp"
  },
  {
    desktop: "/images/desktop/hubble-m48-optimized.webp",
    mobile: "/images/mobile/hubble-m48-mobile.webp"
  },
  {
    desktop: "/images/desktop/wild-duck-cluster-optimized.webp",
    mobile: "/images/mobile/wild-duck-cluster-mobile.webp"
  }
];
var initBackgrounds = ({
  skyElement: skyElement2,
  preloadLink = document.getElementById("background-preload"),
  backgrounds = DEFAULT_BACKGROUNDS
} = {}) => {
  if (!skyElement2 || !backgrounds.length) {
    return null;
  }
  const initialBg = getComputedStyle(document.documentElement).getPropertyValue("--initial-bg-url").trim();
  if (initialBg && initialBg !== "none") {
    const bgUrl = initialBg.replace(/url\(|\)|"/g, "");
    const img2 = new Image();
    img2.src = bgUrl;
    const checkAndApply = () => {
      const computedBg = getComputedStyle(skyElement2).backgroundImage;
      if (!computedBg.includes(bgUrl) && !computedBg.includes("none")) {
        skyElement2.style.backgroundImage = `url("${bgUrl}")`;
      }
      skyElement2.classList.add("loaded");
    };
    if (img2.complete && img2.naturalWidth > 0) {
      checkAndApply();
    } else {
      img2.onload = checkAndApply;
      img2.onerror = () => {
        skyElement2.classList.add("loaded");
      };
    }
    return bgUrl;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const bgParam = urlParams.get("bg");
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
    skyElement2.style.backgroundImage = `url("${choice}")`;
    skyElement2.classList.add("loaded");
  };
  img.onerror = () => {
    const fallback = isMobile ? selectedBg.desktop : choice;
    skyElement2.style.backgroundImage = `url("${fallback}")`;
    skyElement2.classList.add("loaded");
  };
  return choice;
};

// assets/js/modules/animation-config.js
init_utils();
var DEFAULT_ANIMATION = {
  duration: {
    base: 4.2,
    random: 2.6
  },
  delay: {
    max: 0,
    lineStep: 0
  },
  travel: {
    vertical: {
      base: 110,
      random: 220
    },
    horizontal: {
      ratio: 0.28,
      min: 160
    },
    fadeBufferRatio: 0.18,
    spawnOffset: 0
  },
  velocity: {
    average: 0.6
  },
  erratic: {
    rotationMax: 10
  },
  filter: {
    blur: {
      start: 0.5,
      end: 2
    },
    hue: {
      start: 0,
      end: 0
    }
  },
  opacity: {
    start: 1,
    end: 0
  }
};
var animationConfig = JSON.parse(JSON.stringify(DEFAULT_ANIMATION));
var settingsInputs = /* @__PURE__ */ new Map();
var settingsConstraints = /* @__PURE__ */ new Map();
var settingsSchema = null;
var animationsFormEl = null;
var animationsResetEl = null;
var defaultsInitialized = false;
var getNestedValue = (target, path) => {
  return path.split(".").reduce((cursor, segment) => {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return cursor[segment];
    }
    return void 0;
  }, target);
};
var setNestedValue = (target, path, value) => {
  const segments = path.split(".");
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments.at(-1)] = value;
};
var resolveDynamicBound = (bound) => {
  if (bound == null) {
    return void 0;
  }
  if (typeof bound === "number") {
    return bound;
  }
  if (typeof bound === "object" && bound.type === "dynamic") {
    const scale = typeof bound.scale === "number" ? bound.scale : 1;
    const fallback = typeof bound.fallback === "number" ? bound.fallback : 0;
    const round = bound.round === true;
    const metrics = getViewportMetrics();
    const innerWidth = typeof window !== "undefined" ? window.innerWidth || 0 : 0;
    const innerHeight = typeof window !== "undefined" ? window.innerHeight || 0 : 0;
    const layoutWidth = metrics.layoutWidth || innerWidth;
    const layoutHeight = metrics.layoutHeight || innerHeight;
    let value;
    switch (bound.key) {
      case "viewportHeight":
        value = Math.max((metrics.height || layoutHeight || fallback) * scale, 0);
        break;
      case "viewportWidth":
        value = Math.max((metrics.width || layoutWidth || fallback) * scale, 0);
        break;
      default:
        return void 0;
    }
    return round ? Math.round(value) : value;
  }
  return void 0;
};
var clampBySchema = (path, value, fallbackMin, fallbackMax) => {
  const field = settingsConstraints.get(path);
  let minBound = typeof fallbackMin === "number" ? fallbackMin : void 0;
  let maxBound = typeof fallbackMax === "number" ? fallbackMax : void 0;
  if (field) {
    const absoluteMin = resolveDynamicBound(field.absoluteMin);
    const absoluteMax = resolveDynamicBound(field.absoluteMax);
    const fieldMin = resolveDynamicBound(field.min);
    const fieldMax = resolveDynamicBound(field.max);
    if (typeof absoluteMin === "number") {
      minBound = typeof minBound === "number" ? Math.max(minBound, absoluteMin) : absoluteMin;
    } else if (typeof fieldMin === "number") {
      minBound = typeof minBound === "number" ? Math.max(minBound, fieldMin) : fieldMin;
    }
    if (typeof absoluteMax === "number") {
      maxBound = typeof maxBound === "number" ? Math.min(maxBound, absoluteMax) : absoluteMax;
    } else if (typeof fieldMax === "number") {
      maxBound = typeof maxBound === "number" ? Math.min(maxBound, fieldMax) : fieldMax;
    }
  }
  if (typeof maxBound === "number") {
    let minValue = typeof minBound === "number" ? minBound : -Infinity;
    if (minValue > maxBound) {
      minValue = maxBound;
    }
    return clamp(value, minValue, maxBound);
  }
  if (typeof minBound === "number") {
    return clamp(value, minBound);
  }
  return value;
};
var clampProperty = (target, path, fallbackMin, fallbackMax) => {
  const current = getNestedValue(target, path);
  if (typeof current !== "number" || Number.isNaN(current)) {
    return;
  }
  const clamped = clampBySchema(path, current, fallbackMin, fallbackMax);
  setNestedValue(target, path, clamped);
};
var registerSchemaDefaults = (schema) => {
  settingsConstraints.clear();
  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      settingsConstraints.set(field.path, field);
      const resolvedDefault = resolveDynamicBound(field.default);
      if (typeof resolvedDefault === "number") {
        setNestedValue(DEFAULT_ANIMATION, field.path, resolvedDefault);
        setNestedValue(animationConfig, field.path, resolvedDefault);
      }
    });
  });
  normalizeAnimationConfig(DEFAULT_ANIMATION);
  applyConfig(animationConfig, DEFAULT_ANIMATION);
};
var loadInlineSettingsSchema = () => {
  const script = document.getElementById("animation-settings-data");
  if (!script || !script.textContent) {
    return null;
  }
  try {
    return JSON.parse(script.textContent);
  } catch (error) {
    console.error("Failed to parse inline animation settings", error);
  }
  return null;
};
var ensureAnimationConfigDefaults = () => {
  if (defaultsInitialized) {
    return;
  }
  const inlineSchema = loadInlineSettingsSchema();
  if (inlineSchema) {
    settingsSchema = inlineSchema;
    registerSchemaDefaults(inlineSchema);
    defaultsInitialized = true;
    return;
  }
  normalizeAnimationConfig(animationConfig);
  defaultsInitialized = true;
};
var createFieldControl = (field) => {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-field";
  const head = document.createElement("div");
  head.className = "slider-head";
  const fieldId = `field-${field.path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const titleLabel = document.createElement("label");
  titleLabel.setAttribute("for", fieldId);
  titleLabel.textContent = field.label;
  head.appendChild(titleLabel);
  if (field.type === "range") {
    const valueEl = document.createElement("span");
    valueEl.className = "slider-value";
    valueEl.dataset.valueDisplay = field.path;
    head.appendChild(valueEl);
  }
  wrapper.appendChild(head);
  if (field.prompt) {
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = field.prompt;
    wrapper.appendChild(hint);
  }
  const input = document.createElement("input");
  input.id = fieldId;
  input.type = field.type === "range" ? "range" : field.type || "number";
  input.dataset.configPath = field.path;
  if (field.unit) {
    input.dataset.unit = field.unit;
  }
  if (typeof field.step === "number") {
    input.step = field.step;
  }
  const minBound = resolveDynamicBound(field.min);
  if (typeof minBound === "number") {
    input.min = minBound;
  }
  const maxBound = resolveDynamicBound(field.max);
  if (typeof maxBound === "number") {
    input.max = maxBound;
  }
  settingsInputs.set(field.path, input);
  wrapper.appendChild(input);
  return wrapper;
};
var buildAnimationsForm = (schema) => {
  if (!animationsFormEl) {
    return;
  }
  const container = animationsFormEl.querySelector("[data-settings-container]");
  if (!container) {
    return;
  }
  settingsInputs.clear();
  container.innerHTML = "";
  schema.sections.forEach((section) => {
    const visibleFields = section.fields.filter((field) => field.public);
    if (!visibleFields.length) {
      return;
    }
    const sectionEl = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = section.title;
    sectionEl.appendChild(heading);
    if (section.prompt) {
      const sectionPrompt = document.createElement("p");
      sectionPrompt.className = "section-prompt";
      sectionPrompt.textContent = section.prompt;
      sectionEl.appendChild(sectionPrompt);
    }
    visibleFields.forEach((field) => {
      const control = createFieldControl(field);
      sectionEl.appendChild(control);
    });
    container.appendChild(sectionEl);
  });
  if (!container.children.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "modal-hint";
    emptyMessage.textContent = "No adjustable settings available.";
    container.appendChild(emptyMessage);
  }
};
var populateAnimationsForm = () => {
  if (!animationsFormEl || !settingsInputs.size) {
    return;
  }
  settingsInputs.forEach((input, path) => {
    const value = getConfigValue(path);
    if (typeof value === "number" && !Number.isNaN(value)) {
      input.value = value;
      if (input.type === "range") {
        updateSliderDisplay(path, value, input.dataset.unit || "");
      }
    }
  });
};
var normalizeAnimationConfig = (config) => {
  const pathsToClamp = [
    "duration.base",
    "duration.random",
    "delay.max",
    "delay.lineStep",
    "travel.vertical.base",
    "travel.vertical.random",
    "travel.horizontal.ratio",
    "travel.horizontal.min",
    "travel.fadeBufferRatio",
    "velocity.average",
    "erratic.rotationMax",
    "filter.blur.startMin",
    "filter.blur.startMax",
    "filter.blur.endMin",
    "filter.blur.endMax",
    "filter.hue.startMin",
    "filter.hue.startMax",
    "filter.hue.endMin",
    "filter.hue.endMax",
    "opacity.startMin",
    "opacity.startMax",
    "opacity.endMin",
    "opacity.endMax"
  ];
  pathsToClamp.forEach((path) => {
    clampProperty(config, path);
  });
  const blur = config.filter.blur;
  ensureOrder(blur, "startMin", "startMax");
  ensureOrder(blur, "endMin", "endMax");
  const hue = config.filter.hue;
  ensureOrder(hue, "startMin", "startMax");
  ensureOrder(hue, "endMin", "endMax");
  const opacity = config.opacity;
  ensureOrder(opacity, "startMin", "startMax");
  ensureOrder(opacity, "endMin", "endMax");
  clampProperty(config, "filter.blur.startMin");
  clampProperty(config, "filter.blur.startMax");
  clampProperty(config, "filter.blur.endMin");
  clampProperty(config, "filter.blur.endMax");
  clampProperty(config, "filter.hue.startMin");
  clampProperty(config, "filter.hue.startMax");
  clampProperty(config, "filter.hue.endMin");
  clampProperty(config, "filter.hue.endMax");
  clampProperty(config, "opacity.startMin");
  clampProperty(config, "opacity.startMax");
  clampProperty(config, "opacity.endMin");
  clampProperty(config, "opacity.endMax");
};
var getConfigValue = (path) => {
  return getNestedValue(animationConfig, path);
};
var setConfigValue = (path, value) => {
  setNestedValue(animationConfig, path, value);
};
var updateSliderDisplay = (path, value, unit = "") => {
  if (!animationsFormEl) {
    return;
  }
  const nodes = animationsFormEl.querySelectorAll(`[data-value-display="${path}"]`);
  if (!nodes.length) {
    return;
  }
  let formatted = "";
  if (unit === "seconds") {
    formatted = `${formatSeconds(value)}s`;
  } else if (Number.isFinite(value)) {
    formatted = value.toString();
  }
  nodes.forEach((node) => {
    node.textContent = formatted;
  });
};
var updateDynamicBounds = () => {
  if (!settingsSchema) {
    return;
  }
  settingsInputs.forEach((input, path) => {
    const field = settingsConstraints.get(path);
    if (!field) {
      return;
    }
    const resolvedMin = resolveDynamicBound(field.min);
    if (typeof resolvedMin === "number") {
      input.min = resolvedMin;
    }
    const resolvedMax = resolveDynamicBound(field.max);
    if (typeof resolvedMax === "number") {
      input.max = resolvedMax;
    }
  });
  normalizeAnimationConfig(animationConfig);
  if (animationsFormEl) {
    populateAnimationsForm();
  }
};
var initializeSettings = async () => {
  if (!animationsFormEl) {
    return;
  }
  const placeholder = animationsFormEl.querySelector("[data-settings-placeholder]");
  const inlineSchema = loadInlineSettingsSchema();
  const applySchema = (schema) => {
    settingsSchema = schema;
    registerSchemaDefaults(schema);
    defaultsInitialized = true;
    buildAnimationsForm(schema);
    updateDynamicBounds();
  };
  if (window.location.protocol === "file:") {
    if (inlineSchema) {
      applySchema(inlineSchema);
      return;
    }
  }
  try {
    const response = await fetch(new URL("animation-settings.json", window.location.href).href, {
      cache: "default"
    });
    if (!response.ok) {
      throw new Error(`Failed to load settings: ${response.status}`);
    }
    const schema = await response.json();
    applySchema(schema);
  } catch (error) {
    if (inlineSchema) {
      applySchema(inlineSchema);
      return;
    }
    if (placeholder) {
      placeholder.textContent = "Unable to load settings.";
      placeholder.classList.add("error");
    }
    console.error(error);
  }
};
var handleFormInput = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const { configPath } = target.dataset;
  if (!configPath) {
    return;
  }
  const value = parseFloat(target.value);
  if (Number.isNaN(value)) {
    return;
  }
  setConfigValue(configPath, value);
  normalizeAnimationConfig(animationConfig);
  const updatedValue = getConfigValue(configPath);
  if (typeof updatedValue === "number" && !Number.isNaN(updatedValue)) {
    target.value = updatedValue;
    if (target.type === "range") {
      updateSliderDisplay(configPath, updatedValue, target.dataset.unit || "");
    }
  }
};
var resetToDefaults = () => {
  applyConfig(animationConfig, DEFAULT_ANIMATION);
  normalizeAnimationConfig(animationConfig);
  populateAnimationsForm();
};
normalizeAnimationConfig(animationConfig);
var initAnimationControls = ({
  form = document.getElementById("animations-form"),
  resetButton = document.getElementById("animations-reset")
} = {}) => {
  animationsFormEl = form;
  animationsResetEl = resetButton;
  if (animationsFormEl) {
    animationsFormEl.addEventListener("input", handleFormInput);
  }
  animationsResetEl == null ? void 0 : animationsResetEl.addEventListener("click", resetToDefaults);
  initializeSettings();
  const handleViewportChange = () => {
    if (!settingsSchema) {
      return;
    }
    updateDynamicBounds();
  };
  window.addEventListener("resize", handleViewportChange);
  if (typeof window !== "undefined" && window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
  }
  populateAnimationsForm();
  return {
    animationConfig,
    DEFAULT_ANIMATION,
    populateAnimationsForm,
    normalizeAnimationConfig,
    getConfigValue,
    setConfigValue,
    updateSliderDisplay,
    updateDynamicBounds,
    resetToDefaults
  };
};

// assets/js/modules/thought-spawner.js
init_utils();
var DEFAULT_PROMPT_TEXT = "Type out your thoughts in this box and then watch them float away when you press enter.";
var initThoughtSpawner = ({
  scene: scene2,
  thoughtInput: thoughtInput2,
  thoughtLayer: thoughtLayer2,
  animationConfig: animationConfig2,
  promptText = DEFAULT_PROMPT_TEXT,
  viewport: viewport2
} = {}) => {
  if (!scene2 || !thoughtInput2 || !thoughtLayer2 || !animationConfig2) {
    return null;
  }
  let promptActive = Boolean(thoughtInput2);
  let activeModalChecker = () => false;
  const spawnThought = (text) => {
    var _a;
    if (document.body.classList.contains("loading")) {
      return;
    }
    if (!scene2 || !thoughtInput2 || !thoughtLayer2) {
      return;
    }
    const boxRect = thoughtInput2.getBoundingClientRect();
    const computed = window.getComputedStyle(thoughtInput2);
    const thought = document.createElement("div");
    thought.className = "thought";
    const viewportMetrics = getViewportMetrics();
    const spawnId = `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    thought.setAttribute("data-spawn-id", spawnId);
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const originLeft = boxRect.left + borderLeft;
    thought.style.left = `${originLeft}px`;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    let originTop = boxRect.top + borderTop + paddingTop;
    const originTopBeforeAdjust = originTop;
    const spawnOffset = ((_a = animationConfig2.travel) == null ? void 0 : _a.spawnOffset) || 0;
    originTop = originTop + spawnOffset;
    const estimatedMaxThoughtHeight = Math.max(boxRect.height * 2, 200);
    const viewportHeight = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomEstimate = originTop + estimatedMaxThoughtHeight;
    const buffer = 300;
    if (thoughtBottomEstimate > viewportHeight + buffer) {
      const maxAllowedTop = viewportHeight - estimatedMaxThoughtHeight - buffer;
      if (maxAllowedTop > 0 && originTop > maxAllowedTop) {
        originTop = Math.min(maxAllowedTop, originTop);
      }
    }
    const finalOriginTop = originTop;
    const layerComputed = window.getComputedStyle(thoughtLayer2);
    const cssOffset = layerComputed.getPropertyValue("--spawn-offset") || window.getComputedStyle(document.documentElement).getPropertyValue("--spawn-offset") || "0px";
    const cssOffsetValue = parseFloat(cssOffset) || 0;
    const thoughtLayerRect = thoughtLayer2.getBoundingClientRect();
    const thoughtLayerTop = thoughtLayerRect.top;
    const relativeTop = finalOriginTop - thoughtLayerTop;
    const adjustedTop = relativeTop + cssOffsetValue;
    thought.style.top = `${adjustedTop}px`;
    thought.style.width = `${boxRect.width}px`;
    thought.style.padding = `0 ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    thought.style.font = computed.font;
    thought.style.lineHeight = computed.lineHeight;
    thought.style.letterSpacing = computed.letterSpacing;
    const wordsWrapper = document.createElement("span");
    wordsWrapper.className = "thought-words";
    thought.appendChild(wordsWrapper);
    const tokens = text.split(/(\s+)/);
    let maxLifetime = 0;
    let currentLineNumber = 0;
    const horizontalSpread = Math.max(
      boxRect.width * animationConfig2.travel.horizontal.ratio,
      animationConfig2.travel.horizontal.min
    );
    const layoutHeight = viewportMetrics.layoutHeight || viewportMetrics.height || window.innerHeight || 0;
    const visualHeight = viewportMetrics.visualHeight || layoutHeight;
    const travelHeight = viewportMetrics.isKeyboardVisible ? layoutHeight : visualHeight;
    const fadeBuffer = layoutHeight * (animationConfig2.travel.fadeBufferRatio || 0.18);
    const screenHeight = layoutHeight || window.innerHeight || 1080;
    const keyboardMultiplier = viewportMetrics.isKeyboardVisible ? 0.6 : 0.35;
    const minDistanceFromTextBox = Math.max(screenHeight * keyboardMultiplier, 160);
    const registerAnimation = (el, lineNumber = 0, wordIndex = 0) => {
      var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F;
      const registerStartTime = performance.now();
      const durationSeconds = animationConfig2.duration.base + Math.random() * animationConfig2.duration.random;
      const lineDelay = lineNumber * (animationConfig2.delay.lineStep || 0.45);
      const delaySeconds = lineDelay + Math.random() * animationConfig2.delay.max;
      const duration = durationSeconds * 1e3;
      const delay = delaySeconds * 1e3;
      const velocity = animationConfig2.velocity.average || 0.6;
      let baseVerticalTravel = animationConfig2.travel.vertical.base + Math.random() * animationConfig2.travel.vertical.random;
      baseVerticalTravel = Math.max(baseVerticalTravel, minDistanceFromTextBox);
      const totalVerticalTravel = baseVerticalTravel + fadeBuffer;
      const dx = (Math.random() - 0.5) * horizontalSpread * velocity;
      const dy = -totalVerticalTravel * velocity;
      const rotation = (Math.random() - 0.5) * animationConfig2.erratic.rotationMax;
      const scale = 1;
      const blurStart = (_f = (_b = (_a2 = animationConfig2.filter) == null ? void 0 : _a2.blur) == null ? void 0 : _b.start) != null ? _f : (_e = (_d = (_c = animationConfig2.filter) == null ? void 0 : _c.blur) == null ? void 0 : _d.startMin) != null ? _e : 0.5;
      const blurEnd = (_l = (_h = (_g = animationConfig2.filter) == null ? void 0 : _g.blur) == null ? void 0 : _h.end) != null ? _l : (_k = (_j = (_i = animationConfig2.filter) == null ? void 0 : _i.blur) == null ? void 0 : _j.endMin) != null ? _k : 2;
      const hueStart = (_r = (_n = (_m = animationConfig2.filter) == null ? void 0 : _m.hue) == null ? void 0 : _n.start) != null ? _r : (_q = (_p = (_o = animationConfig2.filter) == null ? void 0 : _o.hue) == null ? void 0 : _p.startMin) != null ? _q : 0;
      const hueEnd = (_x = (_t = (_s = animationConfig2.filter) == null ? void 0 : _s.hue) == null ? void 0 : _t.end) != null ? _x : (_w = (_v = (_u = animationConfig2.filter) == null ? void 0 : _u.hue) == null ? void 0 : _v.endMin) != null ? _w : 0;
      const opacityStart = (_B = (_y = animationConfig2.opacity) == null ? void 0 : _y.start) != null ? _B : (_A = (_z = animationConfig2.opacity) == null ? void 0 : _z.startMin) != null ? _A : 1;
      const opacityEnd = (_F = (_C = animationConfig2.opacity) == null ? void 0 : _C.end) != null ? _F : (_E = (_D = animationConfig2.opacity) == null ? void 0 : _D.endMin) != null ? _E : 0;
      const calculatedValues = {
        durationSeconds,
        duration,
        delaySeconds,
        delay,
        lineNumber,
        wordIndex,
        dx,
        dy,
        rotation,
        opacityStart,
        opacityEnd,
        blurStart,
        blurEnd,
        hueStart,
        hueEnd,
        registerTime: registerStartTime
      };
      const durationMs = Math.round(duration);
      const delayMs = Math.round(delay);
      el.style.setProperty("--duration", `${durationMs}ms`);
      el.style.setProperty("--delay", `${delayMs}ms`);
      el.style.setProperty("--dx", `${Math.round(dx * 100) / 100}px`);
      el.style.setProperty("--dy", `${Math.round(dy * 100) / 100}px`);
      el.style.setProperty("--rotation", `${rotation}deg`);
      el.style.setProperty("--scale", scale.toString());
      el.style.setProperty("--blur-start", `${blurStart}px`);
      el.style.setProperty("--blur-end", `${blurEnd}px`);
      el.style.setProperty("--hue-start", `${hueStart}deg`);
      el.style.setProperty("--hue-end", `${hueEnd}deg`);
      el.style.setProperty("--opacity-start", opacityStart.toFixed(3));
      el.style.setProperty("--opacity-end", opacityEnd.toFixed(3));
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;
      const lifetime = duration + delay;
      if (lifetime > maxLifetime) {
        maxLifetime = lifetime;
      }
      if (duration <= 0 || delay < 0) {
        console.warn("Animation has invalid timing:", calculatedValues);
      }
    };
    let wordIndexCounter = 0;
    const appendWord = (word, lineNumber) => {
      if (!word.length) {
        return;
      }
      const wordIndex = wordIndexCounter++;
      const span = document.createElement("span");
      span.className = "thought-word";
      span.textContent = word;
      registerAnimation(span, lineNumber, wordIndex);
      wordsWrapper.appendChild(span);
    };
    const appendSpace = (spaceStr, lineNumber) => {
      if (!spaceStr.length) {
        return;
      }
      const span = document.createElement("span");
      span.className = "thought-space";
      span.textContent = spaceStr;
      registerAnimation(span, lineNumber);
      wordsWrapper.appendChild(span);
    };
    const appendBreak = (lineNumber) => {
      const span = document.createElement("span");
      span.className = "thought-break";
      registerAnimation(span, lineNumber);
      wordsWrapper.appendChild(span);
    };
    tokens.forEach((token) => {
      if (!token) {
        return;
      }
      if (/^\s+$/.test(token)) {
        let buffer2 = "";
        for (const char of token) {
          if (char === "\n") {
            if (buffer2) {
              appendSpace(buffer2, currentLineNumber);
              buffer2 = "";
            }
            appendBreak(currentLineNumber);
            currentLineNumber += 1;
          } else {
            buffer2 += char;
          }
        }
        if (buffer2) {
          appendSpace(buffer2, currentLineNumber);
        }
      } else {
        appendWord(token, currentLineNumber);
      }
    });
    if (!wordsWrapper.children.length) {
      appendWord(text, currentLineNumber);
    }
    if (!thoughtLayer2) {
      console.error("Thought spawner: thoughtLayer is null, cannot append thought");
      return;
    }
    thoughtLayer2.appendChild(thought);
    const isInDOM = thought.parentNode === thoughtLayer2;
    if (!isInDOM) {
      console.error("Thought spawner: Thought was not added to DOM after appendChild", {
        spawnId,
        thoughtParent: thought.parentNode,
        thoughtLayer: thoughtLayer2
      });
    }
    const thoughtRect = thought.getBoundingClientRect();
    const viewportHeightAfterAppend = viewportMetrics.visualHeight || viewportMetrics.height || window.innerHeight || 0;
    const thoughtBottomInViewport = thoughtRect.bottom;
    if (thoughtBottomInViewport > viewportHeightAfterAppend) {
      const overflow = thoughtBottomInViewport - viewportHeightAfterAppend;
      const newTop = Math.max(0, finalOriginTop - overflow - 10);
      thought.style.top = `${newTop}px`;
    }
    const wordElements = thought.querySelectorAll(".thought-word, .thought-space");
    let completedAnimations = 0;
    const totalAnimations = wordElements.length;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        wordElements.forEach((el) => {
          const computed2 = window.getComputedStyle(el);
          const durationValue = computed2.getPropertyValue("--duration");
          const delayValue = computed2.getPropertyValue("--delay");
          if (durationValue && delayValue) {
            const durationMs = Math.round(parseFloat(durationValue));
            const delayMs = Math.round(parseFloat(delayValue));
            void el.offsetHeight;
            el.style.setProperty("animation-duration", `${durationMs}ms`, "important");
            el.style.setProperty("animation-delay", `${delayMs}ms`, "important");
            el.style.setProperty("animation", `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`, "important");
            void el.offsetHeight;
            const computed3 = window.getComputedStyle(el);
            if (computed3.animationDuration === "0.001s" || computed3.animationDuration === "0s") {
              console.warn("Animation duration not applied correctly, retrying...", {
                expected: `${durationMs}ms`,
                got: computed3.animationDuration,
                element: el
              });
              el.style.animationDuration = `${durationMs}ms`;
              el.style.animationDelay = `${delayMs}ms`;
              el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
            }
          }
        });
      });
    });
    const animationEndEvents = [];
    const handleAnimationEnd = (event) => {
      const endTime = performance.now();
      const target = (event == null ? void 0 : event.target) || (event == null ? void 0 : event.currentTarget);
      completedAnimations += 1;
      if (completedAnimations >= totalAnimations) {
        window.setTimeout(() => {
          if (thought.parentNode) {
            thought.remove();
          }
        }, 100);
      }
    };
    wordElements.forEach((el) => {
      const computed2 = window.getComputedStyle(el);
      const durationValue = computed2.getPropertyValue("--duration");
      const delayValue = computed2.getPropertyValue("--delay");
      const durationMs = durationValue ? Math.round(parseFloat(durationValue)) : 5400;
      const delayMs = delayValue ? Math.round(parseFloat(delayValue)) : 0;
      void el.offsetHeight;
      el.style.animation = `wordLift ${durationMs}ms ease-out ${delayMs}ms forwards`;
      el.style.animationDuration = `${durationMs}ms`;
      el.style.animationDelay = `${delayMs}ms`;
      el.addEventListener("animationend", handleAnimationEnd, { once: true });
    });
    const checkAndRemove = () => {
      if (!thought.parentNode) {
        return;
      }
      const thoughtRect2 = thought.getBoundingClientRect();
      const viewportBounds = getViewportMetrics();
      const visualHeight2 = viewportBounds.visualHeight || viewportBounds.height || window.innerHeight || 0;
      const layoutHeight2 = viewportBounds.layoutHeight || viewportBounds.height || window.innerHeight || 0;
      const screenHeight2 = viewportBounds.isKeyboardVisible ? layoutHeight2 : visualHeight2;
      const screenWidth = viewportBounds.layoutWidth || viewportBounds.width || window.innerWidth || 0;
      const spawnTime = Number(thought.dataset.spawnTime) || Date.now();
      const buffer2 = 150;
      const isOffScreenTop = thoughtRect2.bottom < -buffer2;
      const isOffScreenBottom = thoughtRect2.top > screenHeight2 + buffer2;
      const isOffScreenLeft = thoughtRect2.right < -buffer2;
      const isOffScreenRight = thoughtRect2.left > screenWidth + buffer2;
      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight;
      const elapsed = Date.now() - spawnTime;
      const shouldBeComplete = maxLifetime > 0 && elapsed > maxLifetime + 1e3;
      if (isOffScreen || shouldBeComplete) {
        thought.remove();
        return;
      }
      window.requestAnimationFrame(() => {
        window.setTimeout(checkAndRemove, 200);
      });
    };
    thought.dataset.spawnTime = Date.now();
    window.setTimeout(checkAndRemove, 1e3);
  };
  const releasePrompt = () => {
    if (!promptActive || !thoughtInput2) {
      return;
    }
    promptActive = false;
    thoughtInput2.classList.remove("prompt-active");
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
    }
    requestAnimationFrame(() => {
      spawnThought(promptText);
      thoughtInput2.value = "";
    });
  };
  if (promptActive) {
    thoughtInput2.value = promptText;
    thoughtInput2.classList.add("prompt-active");
  }
  thoughtInput2.addEventListener("pointerdown", () => {
    if (promptActive) {
      releasePrompt();
    }
  });
  thoughtInput2.addEventListener("focus", () => {
    if (promptActive) {
      releasePrompt();
    }
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
    }
  });
  thoughtInput2.addEventListener("blur", () => {
    if (viewport2 && viewport2.refresh) {
      setTimeout(() => {
        if (viewport2 && viewport2.refresh) {
          viewport2.refresh();
        }
      }, 100);
    }
  });
  thoughtInput2.addEventListener("input", () => {
    if (viewport2 && viewport2.refresh) {
      viewport2.refresh();
    }
  });
  thoughtInput2.addEventListener("keydown", (event) => {
    if (document.body.classList.contains("loading")) {
      event.preventDefault();
      return;
    }
    if (promptActive) {
      releasePrompt();
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const trimmed = thoughtInput2.value.trim();
      if (!trimmed) {
        event.preventDefault();
        thoughtInput2.value = "";
        return;
      }
      event.preventDefault();
      spawnThought(trimmed);
      thoughtInput2.value = "";
    }
  });
  document.addEventListener("pointerdown", (event) => {
    var _a, _b;
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    if (targetElement && (targetElement.closest(".nav-buttons") || targetElement.closest(".modal"))) {
      return;
    }
    if (activeModalChecker()) {
      return;
    }
    if (promptActive) {
      return;
    }
    if (!thoughtInput2 || thoughtInput2.contains(event.target)) {
      return;
    }
    const pointerType = typeof event.pointerType === "string" ? event.pointerType : "";
    if (pointerType && pointerType !== "mouse") {
      thoughtInput2.blur();
      return;
    }
    if (!pointerType) {
      const isCoarsePointer = typeof window !== "undefined" && ((_b = (_a = window.matchMedia) == null ? void 0 : _a.call(window, "(pointer: coarse)")) == null ? void 0 : _b.matches);
      if (isCoarsePointer) {
        thoughtInput2.blur();
        return;
      }
    }
    thoughtInput2.focus();
  });
  const setActiveModalChecker = (fn) => {
    if (typeof fn === "function") {
      activeModalChecker = fn;
    }
  };
  return {
    spawnThought,
    releasePrompt,
    setActiveModalChecker,
    isPromptActive: () => promptActive
  };
};

// assets/js/modules/modals.js
var initModals = ({
  aboutToggle = document.getElementById("about-toggle"),
  musicToggle = document.getElementById("music-toggle"),
  animationsToggle = document.getElementById("animations-toggle"),
  aboutModal = document.getElementById("about-modal"),
  musicModal = document.getElementById("music-modal"),
  animationsModal = document.getElementById("animations-modal"),
  onMusicOpen,
  onAnimationsOpen
} = {}) => {
  const modalRegistry = {
    about: {
      toggle: aboutToggle,
      modal: aboutModal
    },
    music: {
      toggle: musicToggle,
      modal: musicModal,
      onOpen: onMusicOpen
    },
    animations: {
      toggle: animationsToggle,
      modal: animationsModal,
      onOpen: onAnimationsOpen
    }
  };
  let activeModal = null;
  const setModalState = (name, expanded) => {
    var _a, _b, _c;
    const entry = modalRegistry[name];
    if (!entry) {
      return;
    }
    (_a = entry.modal) == null ? void 0 : _a.classList.toggle("active", expanded);
    (_b = entry.modal) == null ? void 0 : _b.setAttribute("aria-hidden", expanded ? "false" : "true");
    (_c = entry.toggle) == null ? void 0 : _c.setAttribute("aria-expanded", expanded ? "true" : "false");
  };
  const closeModal = () => {
    var _a, _b;
    if (!activeModal) {
      return;
    }
    const entry = modalRegistry[activeModal];
    setModalState(activeModal, false);
    (_a = entry.onClose) == null ? void 0 : _a.call(entry);
    (_b = entry.toggle) == null ? void 0 : _b.focus();
    activeModal = null;
  };
  const openModal = (name) => {
    var _a, _b;
    if (!modalRegistry[name]) {
      return;
    }
    if (activeModal && activeModal !== name) {
      closeModal();
    }
    activeModal = name;
    setModalState(name, true);
    (_b = (_a = modalRegistry[name]).onOpen) == null ? void 0 : _b.call(_a);
  };
  const toggleModal = (name) => {
    if (activeModal === name) {
      closeModal();
    } else {
      openModal(name);
    }
  };
  Object.entries(modalRegistry).forEach(([name, entry]) => {
    var _a, _b, _c, _d;
    (_a = entry.toggle) == null ? void 0 : _a.addEventListener("click", () => toggleModal(name));
    (_b = entry.modal) == null ? void 0 : _b.addEventListener("click", (event) => {
      if (event.target === entry.modal) {
        closeModal();
      }
    });
    (_d = (_c = entry.modal) == null ? void 0 : _c.querySelector(".modal-panel")) == null ? void 0 : _d.addEventListener("click", (event) => event.stopPropagation());
  });
  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal());
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal) {
      event.preventDefault();
      closeModal();
    }
  });
  return {
    openModal,
    closeModal,
    toggleModal,
    isAnyModalActive: () => Boolean(activeModal)
  };
};

// assets/js/modules/navigation-toggle.js
var BREAKPOINT_QUERY = "(max-width: 35rem)";
var initNavigationToggle = ({
  container = document.querySelector(".nav-buttons"),
  toggle = document.getElementById("nav-toggle"),
  actions = document.getElementById("nav-actions")
} = {}) => {
  var _a;
  if (!container || !toggle || !actions) {
    return null;
  }
  let isOpen = false;
  const mediaQuery = typeof window !== "undefined" ? (_a = window.matchMedia) == null ? void 0 : _a.call(window, BREAKPOINT_QUERY) : null;
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
  if (mediaQuery == null ? void 0 : mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleBreakpointChange);
  } else if (mediaQuery == null ? void 0 : mediaQuery.addListener) {
    mediaQuery.addListener(handleBreakpointChange);
  }
  const destroy = () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);
    actions.removeEventListener("click", handleActionClick);
    if (mediaQuery == null ? void 0 : mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", handleBreakpointChange);
    } else if (mediaQuery == null ? void 0 : mediaQuery.removeListener) {
      mediaQuery.removeListener(handleBreakpointChange);
    }
  };
  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: toggleMenu,
    destroy,
    isOpen: () => isOpen
  };
};

// assets/js/modules/viewport.js
init_utils();
var setViewportProperties = () => {
  const metrics = getViewportMetrics();
  const root = document.documentElement;
  if (!root || !root.style) {
    return metrics;
  }
  const visualHeight = metrics.visualHeight || metrics.height || window.innerHeight || 0;
  const layoutHeight = metrics.layoutHeight || visualHeight;
  const visualWidth = metrics.visualWidth || metrics.width || window.innerWidth || 0;
  const offsetBottom = metrics.keyboardOffset || metrics.offsetBottom || 0;
  const offsetTop = metrics.offsetTop || 0;
  root.style.setProperty("--layout-min-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-visible-height", `${visualHeight}px`);
  root.style.setProperty("--viewport-visible-unit", `${visualHeight / 100}px`);
  root.style.setProperty("--viewport-visible-width", `${visualWidth}px`);
  root.style.setProperty("--viewport-layout-height", `${layoutHeight}px`);
  root.style.setProperty("--viewport-offset-bottom", `${offsetBottom}px`);
  root.style.setProperty("--viewport-offset-top", `${offsetTop}px`);
  const textareaHeightPercent = metrics.isKeyboardVisible ? 0.15 : 0.12;
  const textareaHeight = visualHeight * textareaHeightPercent;
  const textareaMinHeight = 48;
  const textareaMaxHeight = 100;
  const clampedTextareaHeight = Math.max(textareaMinHeight, Math.min(textareaMaxHeight, textareaHeight));
  root.style.setProperty("--textarea-height", `${clampedTextareaHeight}px`);
  return metrics;
};
var initViewportUnits = () => {
  if (typeof window === "undefined") {
    return null;
  }
  let rafId = 0;
  const requestUpdate = () => {
    if (rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      setViewportProperties();
    });
  };
  const visual = window.visualViewport;
  setViewportProperties();
  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("orientationchange", requestUpdate, { passive: true });
  if (visual) {
    visual.addEventListener("resize", requestUpdate, { passive: true });
    visual.addEventListener("scroll", requestUpdate, { passive: true });
  }
  return {
    refresh: () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      setViewportProperties();
    },
    destroy: () => {
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("orientationchange", requestUpdate);
      if (visual) {
        visual.removeEventListener("resize", requestUpdate);
        visual.removeEventListener("scroll", requestUpdate);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
  };
};

// assets/js/main.js
var scene = document.getElementById("scene");
var thoughtInput = document.getElementById("thoughts");
var thoughtLayer = document.getElementById("thought-layer");
var skyElement = document.querySelector(".stars");
var body = document.body;
var loadingState = {
  background: false,
  animationConfig: false,
  thoughtSpawner: false,
  spotify: false,
  isReady: function() {
    return this.background && this.animationConfig && this.thoughtSpawner && this.spotify;
  },
  checkReady: function() {
    if (this.isReady() && body.classList.contains("loading")) {
      body.classList.remove("loading");
      if (thoughtInput) {
        thoughtInput.disabled = false;
        thoughtInput.setAttribute("placeholder", "");
      }
    }
  }
};
if (thoughtInput) {
  thoughtInput.disabled = true;
  thoughtInput.setAttribute("placeholder", "Loading...");
}
var viewport = initViewportUnits();
var backgroundInit = initBackgrounds({ skyElement });
if (backgroundInit) {
  const checkBackgroundLoaded = () => {
    if (skyElement && skyElement.classList.contains("loaded")) {
      loadingState.background = true;
      loadingState.checkReady();
    } else {
      setTimeout(checkBackgroundLoaded, 50);
    }
  };
  checkBackgroundLoaded();
} else {
  loadingState.background = true;
  loadingState.checkReady();
}
var defer = (fn, delay = 0) => {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(fn, { timeout: delay });
  } else {
    setTimeout(fn, delay);
  }
};
defer(() => {
  initPromptGlow(thoughtInput);
  if (scene) {
    scene.classList.add("loaded");
  }
}, 0);
defer(() => {
  ensureAnimationConfigDefaults();
  loadingState.animationConfig = true;
  loadingState.checkReady();
}, 50);
defer(async () => {
  let spotifyControls = null;
  try {
    const { initSpotifyControls: initSpotifyControls2 } = await Promise.resolve().then(() => (init_spotify_embed(), spotify_embed_exports));
    spotifyControls = await initSpotifyControls2({
      thoughtInput,
      onReady: () => {
        loadingState.spotify = true;
        loadingState.checkReady();
      }
    });
    if (!spotifyControls) {
      console.warn("Spotify controls initialization returned null");
      loadingState.spotify = true;
      loadingState.checkReady();
    }
  } catch (error) {
    console.error("Failed to initialize Spotify embed:", error);
    loadingState.spotify = true;
    loadingState.checkReady();
  }
  if (spotifyControls && thoughtInput) {
    const startMusicOnFirstInteraction = () => {
      if (spotifyControls && spotifyControls.startPlayback) {
        spotifyControls.startPlayback().catch(() => {
        });
      }
    };
    const handleFirstInteraction = () => {
      startMusicOnFirstInteraction();
      thoughtInput.removeEventListener("focus", handleFirstInteraction);
      thoughtInput.removeEventListener("click", handleFirstInteraction);
      thoughtInput.removeEventListener("pointerdown", handleFirstInteraction);
    };
    thoughtInput.addEventListener("focus", handleFirstInteraction, { once: true });
    thoughtInput.addEventListener("click", handleFirstInteraction, { once: true });
    thoughtInput.addEventListener("pointerdown", handleFirstInteraction, { once: true });
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
      if (spotifyControls && spotifyControls.syncMusicControls) {
        spotifyControls.syncMusicControls();
      }
    },
    onAnimationsOpen: () => {
      var _a;
      const controls = ensureAnimationControls();
      (_a = controls == null ? void 0 : controls.populateAnimationsForm) == null ? void 0 : _a.call(controls);
    }
  });
  initNavigationToggle();
  const thoughtSpawner = initThoughtSpawner({
    scene,
    thoughtInput,
    thoughtLayer,
    animationConfig,
    viewport
  });
  if (thoughtSpawner) {
    loadingState.thoughtSpawner = true;
    loadingState.checkReady();
  }
  thoughtSpawner == null ? void 0 : thoughtSpawner.setActiveModalChecker(modals ? modals.isAnyModalActive : () => false);
  if (viewport && typeof window !== "undefined") {
    window.addEventListener("focus", viewport.refresh);
  }
}, 100);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then(() => {
    }).catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}
//# sourceMappingURL=main.js.map
