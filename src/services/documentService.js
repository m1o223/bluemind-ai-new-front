import api, { unwrapApiResponse } from "./api";

export const analyzeScheduleDocument = async (file) => {
  const response = await api.post("/documents/analyze-schedule", file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name || "schedule-document"),
    },
  });

  return unwrapApiResponse(response);
};
