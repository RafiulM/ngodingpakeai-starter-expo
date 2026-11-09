import * as Linking from "expo-linking";
import type { ApiErrorBody } from "@starter/shared/types";
import { siteConfig } from "@starter/shared/site";
import { API_URL } from "@/lib/api-url";
import { authClient } from "@/lib/auth-client";

// A failed API call, carrying the API's error envelope.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ApiErrorBody["error"]["details"],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type ApiRequest = {
  method?: Method;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
};

// The origin the API's requireTrustedOrigin checks: the same value the Better
// Auth Expo client sends (`<scheme>://`, or exp://… inside Expo Go).
function appOrigin() {
  return Linking.createURL("", { scheme: siteConfig.scheme });
}

// Calls the Express API as the signed-in user. The session cookie lives in
// SecureStore, so it is sent explicitly; credentials: "omit" keeps the native
// cookie jar from adding a second, stale copy.
export async function apiFetch<T>(
  path: string,
  { method = "GET", query, body, signal }: ApiRequest = {},
): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(query ?? {}))
    if (value !== undefined) url.searchParams.set(key, String(value));

  const cookie = await authClient.getCookie();
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      signal,
      credentials: "omit",
      headers: {
        accept: "application/json",
        "expo-origin": appOrigin(),
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "We couldn't reach the server. Check your connection and try again.",
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    (T & Partial<ApiErrorBody>) | null;
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `Request failed with status ${response.status}.`,
      error?.details,
    );
  }
  return payload as T;
}

// Readable text for an error, including the first field-level detail.
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const field = error.details?.[0];
    return field?.field ? `${field.field}: ${field.message}` : error.message;
  }
  return "Something went wrong. Try again.";
}
