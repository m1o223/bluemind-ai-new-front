import api, { unwrapApiResponse } from "./api";
import { uploadChatImage } from "./imageService";

export async function analyzeSchoolScheduleImage(file, languageHint) {
  const image = await uploadChatImage(file);
  const response = await api.post("/study-plans/timetable/analyze", {
    imageId: image.id,
    languageHint,
  });

  return {
    image,
    ...unwrapApiResponse(response),
  };
}
