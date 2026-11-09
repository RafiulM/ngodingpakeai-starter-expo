import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ApiError, apiFetch, errorMessage } from "@/lib/api/client";

jest.mock("@/lib/auth-client", () => ({
  authClient: { getCookie: jest.fn(async () => "app.session_token=abc") },
}));
jest.mock("expo-linking", () => ({ createURL: () => "expressexpo://" }));

const fetchMock =
  jest.fn<(url: string, init?: RequestInit) => Promise<Response>>();
global.fetch = fetchMock as unknown as typeof fetch;

// The parts of a Response that apiFetch reads.
function reply(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("apiFetch", () => {
  it("sends the stored session cookie and the app's origin itself", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: [] }));
    await apiFetch("/api/notes", { query: { limit: 20, offset: undefined } });

    const [url, init = {}] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/notes?limit=20");
    // The native cookie jar must not add a second, stale cookie.
    expect(init.credentials).toBe("omit");
    expect(init.headers).toMatchObject({
      cookie: "app.session_token=abc",
      "expo-origin": "expressexpo://",
    });
    expect(init.headers).not.toHaveProperty("content-type");
  });

  it("sends JSON bodies", async () => {
    fetchMock.mockResolvedValue(reply(201, { data: { id: "1" } }));
    await apiFetch("/api/notes", { method: "POST", body: { title: "Hi" } });

    const [, init = {}] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
    });
    expect(init.body).toBe('{"title":"Hi"}');
  });

  it("turns the API's error envelope into an ApiError", async () => {
    fetchMock.mockResolvedValue(
      reply(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the supplied fields.",
          details: [{ field: "title", message: "Too long" }],
        },
      }),
    );
    const error = await apiFetch("/api/notes").catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    expect(errorMessage(error)).toBe("title: Too long");
  });

  it("reports an unreachable server as a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const error = await apiFetch("/api/notes").catch((caught) => caught);

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("resolves 204 responses to undefined", async () => {
    fetchMock.mockResolvedValue(reply(204));
    await expect(
      apiFetch("/api/notes/1", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
});
