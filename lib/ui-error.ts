function toMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

type ErrorContext = "analysis" | "optimization" | "job-match" | "generic";

function defaultMessageByContext(context: ErrorContext) {
  if (context === "analysis") {
    return "Unable to analyze the resume right now. Please try again.";
  }

  if (context === "optimization") {
    return "Unable to generate optimized resume content right now. Please try again.";
  }

  if (context === "job-match") {
    return "Unable to run job matching right now. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

function isGeminiRelated(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("gemini") ||
    text.includes("generativelanguage.googleapis.com") ||
    text.includes("gemini_api_key") ||
    text.includes("api key not valid") ||
    text.includes("models/")
  );
}

export function normalizeUiError(error: unknown, context: ErrorContext = "generic") {
  const raw = toMessage(error).trim();
  if (!raw) {
    return defaultMessageByContext(context);
  }

  const normalized = raw.toLowerCase();

  if (!isGeminiRelated(raw)) {
    return raw;
  }

  if (normalized.includes("gemini_api_key is not configured")) {
    return "Gemini is not configured on the server. Add GEMINI_API_KEY in .env and restart the app.";
  }

  if (normalized.includes("api key not valid") || normalized.includes("invalid api key")) {
    return "Gemini API key is invalid. Update GEMINI_API_KEY in .env and restart the app.";
  }

  if (normalized.includes("permission_denied") || normalized.includes("403")) {
    return "Gemini access was denied. Check API key permissions and Gemini API enablement in Google AI Studio.";
  }

  if (normalized.includes("resource_exhausted") || normalized.includes("429")) {
    return "Gemini rate limit reached. Please wait a moment and try again.";
  }

  if (normalized.includes("deadline_exceeded") || normalized.includes("timeout") || normalized.includes("abort")) {
    return "Gemini request timed out. Please retry in a few seconds.";
  }

  if (normalized.includes("404") || normalized.includes("model not found")) {
    return "Configured Gemini model was not found. Check GEMINI_MODEL in .env.";
  }

  if (normalized.includes("500") || normalized.includes("502") || normalized.includes("503") || normalized.includes("504")) {
    return "Gemini service is temporarily unavailable. Please try again shortly.";
  }

  if (context === "analysis") {
    return "Gemini could not analyze this resume right now. Please retry.";
  }

  if (context === "optimization") {
    return "Gemini could not optimize this resume right now. Please retry.";
  }

  if (context === "job-match") {
    return "Gemini could not complete JD matching right now. Please retry.";
  }

  return "Gemini request failed. Please try again.";
}
