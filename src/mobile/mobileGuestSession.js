export const MOBILE_GUEST_SESSION_KEY = "bluemind_mobile_guest";
export const MOBILE_GUEST_MESSAGE_COUNT_KEY = "bluemind_mobile_guest_message_count";
export const MOBILE_GUEST_MESSAGE_LIMIT = 5;

export function startMobileGuestSession() {
  localStorage.setItem(MOBILE_GUEST_SESSION_KEY, "true");
  if (!localStorage.getItem(MOBILE_GUEST_MESSAGE_COUNT_KEY)) {
    localStorage.setItem(MOBILE_GUEST_MESSAGE_COUNT_KEY, "0");
  }
}

export function hasMobileGuestAccess() {
  return localStorage.getItem(MOBILE_GUEST_SESSION_KEY) === "true";
}

export function getMobileGuestMessageCount() {
  return Number(localStorage.getItem(MOBILE_GUEST_MESSAGE_COUNT_KEY) || "0");
}

export function canMobileGuestSendMessage() {
  return getMobileGuestMessageCount() < MOBILE_GUEST_MESSAGE_LIMIT;
}

export function incrementMobileGuestMessageCount() {
  const nextCount = getMobileGuestMessageCount() + 1;
  localStorage.setItem(MOBILE_GUEST_MESSAGE_COUNT_KEY, String(nextCount));
  return nextCount;
}
