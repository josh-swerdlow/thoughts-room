export const initModals = ({
  aboutToggle = document.getElementById("about-toggle"),
  musicToggle = document.getElementById("music-toggle"),
  animationsToggle = document.getElementById("animations-toggle"),
  aboutModal = document.getElementById("about-modal"),
  musicModal = document.getElementById("music-modal"),
  animationsModal = document.getElementById("animations-modal"),
  onMusicOpen,
  onAnimationsOpen,
} = {}) => {
  const modalRegistry = {
    about: {
      toggle: aboutToggle,
      modal: aboutModal,
    },
    music: {
      toggle: musicToggle,
      modal: musicModal,
      onOpen: onMusicOpen,
    },
    animations: {
      toggle: animationsToggle,
      modal: animationsModal,
      onOpen: onAnimationsOpen,
    },
  };

  let activeModal = null;

  const setModalState = (name, expanded) => {
    const entry = modalRegistry[name];
    if (!entry) {
      return;
    }

    entry.modal?.classList.toggle("active", expanded);
    entry.modal?.setAttribute("aria-hidden", expanded ? "false" : "true");
    entry.toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  const closeModal = () => {
    if (!activeModal) {
      return;
    }

    const entry = modalRegistry[activeModal];
    setModalState(activeModal, false);
    entry.onClose?.();
    entry.toggle?.focus();
    activeModal = null;
  };

  const openModal = (name) => {
    if (!modalRegistry[name]) {
      return;
    }

    if (activeModal && activeModal !== name) {
      closeModal();
    }

    activeModal = name;
    setModalState(name, true);
    modalRegistry[name].onOpen?.();
  };

  const toggleModal = (name) => {
    if (activeModal === name) {
      closeModal();
    } else {
      openModal(name);
    }
  };

  Object.entries(modalRegistry).forEach(([name, entry]) => {
    entry.toggle?.addEventListener("click", () => toggleModal(name));

    entry.modal?.addEventListener("click", (event) => {
      if (event.target === entry.modal) {
        closeModal();
      }
    });

    entry.modal
      ?.querySelector(".modal-panel")
      ?.addEventListener("click", (event) => event.stopPropagation());
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
    isAnyModalActive: () => Boolean(activeModal),
  };
};

