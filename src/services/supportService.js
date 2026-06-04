import api, { unwrapApiResponse } from "./api";

export async function reportIssue(data) {
  const response = await api.post("/support/issues", data);
  return unwrapApiResponse(response);
}
