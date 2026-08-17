export const motionEase = [0.22, 1, 0.36, 1];

export const motionDurations = {
  fast: 0.13,
  popup: 0.18,
  modal: 0.2,
  sheet: 0.24,
  page: 0.24,
  message: 0.2,
};

export const overlayMotion = {
  transition: {
    popup: { duration: motionDurations.popup, ease: motionEase },
    modal: { duration: motionDurations.modal, ease: motionEase },
    sheet: { duration: motionDurations.sheet, ease: motionEase },
    page: { duration: motionDurations.page, ease: motionEase },
  },
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  popup: {
    initial: { opacity: 0, y: 7, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 7, scale: 0.97 },
  },
  popupUp: {
    initial: { opacity: 0, y: -7, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -7, scale: 0.97 },
  },
  modal: {
    initial: { opacity: 0, y: 12, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.96 },
  },
  sheet: {
    initial: { opacity: 0.98, y: "100%" },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0.98, y: "100%" },
  },
  sideDrawer: {
    initial: { opacity: 0.98 },
    animate: { opacity: 1 },
    exit: { opacity: 0.98 },
  },
  page: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
};

export const motionTokens = {
  hover: { y: -3 },
  tap: { scale: 0.992 },
  subtleTap: { scale: 0.98 },
  transition: { duration: motionDurations.page, ease: motionEase },
  quickTransition: { duration: 0.12, ease: motionEase },
  cardTransition: { duration: 0.26, ease: motionEase },
  panelTransition: { duration: motionDurations.modal, ease: motionEase },
  sheetTransition: { duration: motionDurations.sheet, ease: motionEase },
  dropdownTransition: { duration: motionDurations.popup, ease: motionEase },
  messageTransition: { duration: motionDurations.message, ease: motionEase },
};

export const interactionClasses = {
  control: "bm-interactive bm-focus-ring",
  card: "bm-card-interactive bm-focus-ring",
  menuItem: "bm-menu-interactive bm-focus-ring",
  iconButton: "bm-icon-interactive bm-focus-ring",
  input: "bm-input-interactive",
  overlayMotion: "bm-motion-overlay",
  panelMotion: "bm-motion-panel",
  dropdownMotion: "bm-motion-dropdown",
  sheetMotion: "bm-motion-sheet",
  layoutMotion: "bm-motion-layout",
  messageMotion: "bm-message-enter",
};

export const inputClasses = {
  field: "bm-field bm-input-interactive",
  compact: "bm-field bm-field-compact bm-input-interactive",
  search: "bm-field bm-field-search bm-input-interactive",
  textarea: "bm-field bm-textarea bm-input-interactive",
  composer: "bm-composer-input",
};

export const typeClasses = {
  pageTitle: "bm-page-title",
  sectionTitle: "bm-section-title",
  cardTitle: "bm-card-title",
  body: "bm-body-text",
  small: "bm-small-text",
};

export const iconClasses = {
  sidebar: "bm-icon-sidebar",
  button: "bm-icon-button",
  card: "bm-icon-card",
  sidebarLogo: "bm-logo-sidebar",
  iconText: "bm-icon-text",
};

export const spacingClasses = {
  card: "bm-card-spacing",
  cardGap: "bm-card-gap",
};
