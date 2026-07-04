import api, { getApiErrorMessage, unwrapApiResponse } from "./api";

export async function getWritingProfile() {
  try {
    const response = await api.get("/writing-profile");
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load Writing Profile"));
  }
}

export async function analyzeWritingProfile({ samples, updateReason }) {
  try {
    const response = await api.post("/writing-profile/analyze", {
      samples,
      updateReason
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not analyze Writing Profile"));
  }
}

export async function confirmWritingProfile({ accepted, adjustments }) {
  try {
    const response = await api.post("/writing-profile/confirm", {
      accepted,
      adjustments
    });
    return unwrapApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update Writing Profile"));
  }
}
