export const ACTION_SUCCESS_HOLD_MS = 250;
export const ACTION_ERROR_HOLD_MS = 220;

export function waitForActionFeedback(duration = ACTION_SUCCESS_HOLD_MS) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}
