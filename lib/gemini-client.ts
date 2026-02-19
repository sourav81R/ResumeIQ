type GeminiGenerateTextInput = {
  apiKey: string;
  configuredModel?: string;
  prompt: string;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeModelCandidates(configuredModel?: string) {
  const rawConfigured = String(configuredModel || "gemini-2.5-flash").trim();
  const withoutPrefix = rawConfigured.replace(/^models\//, "");
  const candidates = [
    withoutPrefix,
    rawConfigured,
    "gemini-2.5-flash",
    "gemini-2.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest"
  ];

  return Array.from(new Set(candidates.map((item) => item.replace(/^models\//, "").trim()).filter(Boolean)));
}

function extractCandidateText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const typed = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      output?: string;
    }>;
  };

  const fromParts = typed.candidates?.[0]?.content?.parts
    ?.map((part) => String(part.text || ""))
    .join("")
    .trim();
  if (fromParts) return fromParts;

  const fromOutput = String(typed.candidates?.[0]?.output || "").trim();
  return fromOutput;
}

async function fetchWithTimeout(url: string, payload: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateGeminiText(input: GeminiGenerateTextInput) {
  const modelCandidates = normalizeModelCandidates(input.configuredModel);
  const apiVersions = ["v1beta", "v1"] as const;
  const timeoutMs = input.timeoutMs || DEFAULT_TIMEOUT_MS;
  const responseMimeType = input.responseMimeType || "application/json";
  const temperature = typeof input.temperature === "number" ? input.temperature : 0.2;

  const attemptsLog: string[] = [];
  let lastError = "";

  for (const apiVersion of apiVersions) {
    for (const modelName of modelCandidates) {
      const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(modelName)}:generateContent?key=${input.apiKey}`;
      attemptsLog.push(`${apiVersion}:${modelName}`);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetchWithTimeout(
            endpoint,
            {
              generationConfig: {
                temperature,
                responseMimeType
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: input.prompt }]
                }
              ]
            },
            timeoutMs
          );

          if (!response.ok) {
            const body = await response.text();
            lastError = `${response.status} ${body}`;

            if (response.status === 404) {
              break;
            }

            if (RETRYABLE_STATUS.has(response.status) && attempt < 2) {
              await delay(900 * (attempt + 1));
              continue;
            }

            throw new Error(`Gemini API error: ${response.status} ${body}`);
          }

          const data = await response.json();
          const text = extractCandidateText(data);

          if (!text) {
            if (attempt < 2) {
              await delay(500 * (attempt + 1));
              continue;
            }
            throw new Error("Gemini returned empty response.");
          }

          return text;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || "Unknown error");
          lastError = message;

          if (attempt < 2) {
            await delay(800 * (attempt + 1));
            continue;
          }
        }
      }
    }
  }

  throw new Error(
    `Gemini request failed. Tried: ${attemptsLog.join(", ")}. Last error: ${lastError || "UNKNOWN"}`
  );
}
