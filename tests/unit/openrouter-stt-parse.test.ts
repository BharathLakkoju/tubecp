import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  config: {
    openrouterBaseUrl: "https://openrouter.ai/api/v1",
    sttModel: "openai/whisper-large-v3-turbo",
  },
  assertOpenRouterKey: () => "test-key",
}));

vi.mock("@/lib/usage/api-cost", () => ({
  recordOpenRouterSttUsage: vi.fn(),
}));

import { transcribeAudioBuffer } from "@/lib/services/openrouter-stt";

describe("transcribeAudioBuffer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          text: "Hello world",
          segments: [{ start: 0, end: 2.5, text: "Hello world" }],
          usage: { seconds: 2.5 },
        }),
      }))
    );
  });

  it("maps verbose_json segments to transcript segments", async () => {
    const { segments } = await transcribeAudioBuffer(Buffer.from("fake"), "mp3");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Hello world");
    expect(segments[0].start).toBe(0);
  });
});
