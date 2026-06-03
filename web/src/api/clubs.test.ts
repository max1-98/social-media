import { afterEach, describe, expect, it, vi } from "vitest";

import { clubSocials } from "./clubs";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("clubSocials", () => {
  it("unwraps the backend's { socials: [...] } envelope into a bare array", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ socials: [{ platform: "facebook", url: "https://fb.com/x" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await clubSocials("1");

    expect(result).toEqual([{ platform: "facebook", url: "https://fb.com/x" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/clubs/1/socials",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns an empty array when the club has no socials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ socials: [] })));

    await expect(clubSocials("2")).resolves.toEqual([]);
  });
});
