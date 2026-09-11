const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const retryAfter = getRetryAfter(error);

      const delay =
        retryAfter ??
        BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 250);

      await sleep(delay);
    }
  }

  throw new Error("Retry operation failed");
}

function shouldRetry(error: unknown): boolean {
  if (isTimeoutError(error)) {
    return true;
  }

  if (!isApiError(error)) {
    return false;
  }

  return error.status === 429 || error.status >= 500;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "APIConnectionTimeoutError" ||
    error.name === "TimeoutError" ||
    error.message.toLowerCase().includes("timeout")
  );
}

function isApiError(
  error: unknown,
): error is { status: number; headers?: Headers | Record<string, string> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  );
}

function getRetryAfter(error: unknown): number | null {
  if (!isApiError(error) || !error.headers) {
    return null;
  }

  const value =
    error.headers instanceof Headers
      ? error.headers.get("retry-after")
      : error.headers["retry-after"];

  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
