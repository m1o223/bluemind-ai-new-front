export const motionTokens = {
  hover: { y: -3 },
  tap: { scale: 0.992 },
  subtleTap: { scale: 0.98 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  cardTransition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
};

export const interactionClasses = {
  control: "bm-interactive bm-focus-ring",
  card: "bm-card-interactive bm-focus-ring",
  menuItem: "bm-menu-interactive bm-focus-ring",
  iconButton: "bm-icon-interactive bm-focus-ring",
  input: "bm-input-interactive",
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
