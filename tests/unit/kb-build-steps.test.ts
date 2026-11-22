import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeBaseRecord, RankedVideo } from "@/lib/types";

vi.mock("@/lib/services/transcript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/transcript")>();
  return {
    ...actual,
    getTranscript: vi.fn(),
    getTranscriptDurationMinutes: () => 2,
  };
});

vi.mock("@/lib/services/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/llm")>();
  return {
    ...actual,
    generateEmbeddings: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
  };
});

vi.mock("@/lib/services/kb-chat", () => ({
  ensureKbWelcomeMessage: vi.fn(async () => []),
  refreshKbWelcomeMessage: vi.fn(async () => undefined),
}));

import { getTranscript, TranscriptUnavailableError } from "@/lib/services/transcript";
import { generateEmbeddings } from "@/lib/services/llm";
import { chunkTranscript } from "@/lib/services/knowledge-base";
import {
  completeKnowledgeBaseBuild,
  failedVideoBuildResult,
  fetchVideoTranscriptForBuild,
  processKbVideoBuild,
} from "@/lib/services/kb-build-steps";
import {
  cacheTranscript,
  getChunksForVideos,
  getKnowledgeBase,
  saveKnowledgeBase,
} from "@/lib/store";
import { getDevMemoryStore } from "@/lib/store/dev-memory";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";

const videoA: RankedVideo = {
  videoId: "vid-a",
  title: "Talk A",
  channel: "Conf",
  url: "https://youtube.com/watch?v=vid-a",
  thumbnailUrl: "",
  relevanceScore: 90,
  whyRelevant: "relevant",
  discussionLevel: "substantial",
};

const videoB: RankedVideo = {
  videoId: "vid-b",
  title: "Talk B",
  channel: "Conf",
  url: "https://youtube.com/watch?v=vid-b",
  thumbnailUrl: "",
  relevanceScore: 80,
  whyRelevant: "relevant",
  discussionLevel: "brief",
};

function longTranscript(videoId: string, wordCount = 450) {
  const words = Array.from({ length: wordCount }, (_, index) => `word${index + 1}`);
  return {
    videoId,
    language: "en",
    segments: [{ start: 0, duration: 120, text: words.join(" ") }],
  };
}

async function seedKb(overrides: Partial<KnowledgeBaseRecord> = {}): Promise<KnowledgeBaseRecord> {
  const kb: KnowledgeBaseRecord = {
    kbId: "kb-steps",
    topic: "durable builds",
    userId: "user-1",
    videoIds: [videoA.videoId, videoB.videoId],
    chunkIds: [],
    chunksIndexed: 0,
    videosIndexed: 0,
    totalMinutes: 0,
    status: "building",
    createdAt: new Date().toISOString(),
    rankedVideos: [videoA, videoB],
    buildOptions: { transcriptMode: "captions" },
    buildJob: {
      totalVideos: 2,
      processedVideos: 0,
      skippedCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
  await saveKnowledgeBase(kb);
  await getJobStore().insertRun({
    kbId: kb.kbId,
    userId: kb.userId,
    persistent: false,
    transcriptMode: "captions",
    videos: kb.rankedVideos ?? [videoA, videoB],
  });
  return kb;
}

describe("kb-build-steps", () => {
  beforeEach(() => {
    getDevMemoryStore().clear();
    resetMemoryJobStore();
    vi.clearAllMocks();
    vi.mocked(getTranscript).mockImplementation(async (videoId: string) => {
      const transcript = longTranscript(videoId);
      await cacheTranscript(transcript, "captions");
      return transcript;
    });
  });

  it("chunks transcripts with 200 words and 40-word overlap", () => {
    const chunks = chunkTranscript(longTranscript("vid-a").segments, "vid-a", "Talk A", "Conf");
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].text.split(/\s+/)).toHaveLength(200);
    expect(chunks[1].text.split(/\s+/)[0]).toBe("word161");
  });

  it("does not duplicate chunks when the same video is processed twice", async () => {
    await seedKb();
    await processKbVideoBuild("kb-steps", "vid-a", false);
    const first = await getChunksForVideos(["vid-a"]);
    expect(first.length).toBeGreaterThan(0);
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);

    await processKbVideoBuild("kb-steps", "vid-a", false);
    const second = await getChunksForVideos(["vid-a"]);
    expect(second.map((chunk) => chunk.id).sort()).toEqual(first.map((chunk) => chunk.id).sort());
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);

    const job = await getJobStore().getJob("kb-steps", "vid-a");
    const unique = [...new Set(job?.chunkIds ?? [])];
    expect(job?.chunkIds).toEqual(unique);
    expect(job?.status).toBe("indexed");
  });

  it("throws retryable transcript errors so the runner can back off", async () => {
    await seedKb();
    vi.mocked(getTranscript).mockRejectedValueOnce(
      new TranscriptUnavailableError("vid-a", new Error("YouTube is receiving too many requests"))
    );
    await expect(fetchVideoTranscriptForBuild("kb-steps", "vid-a")).rejects.toBeInstanceOf(
      TranscriptUnavailableError
    );
  });

  it("skips permanent caption failures without throwing", async () => {
    await seedKb();
    vi.mocked(getTranscript).mockRejectedValueOnce(
      new TranscriptUnavailableError("vid-a", new Error("transcripts are disabled on this video"))
    );
    const result = await processKbVideoBuild("kb-steps", "vid-a", false);
    expect(result.status).toBe("skipped");
    expect(result.error).toMatch(/Talk A/);
  });

  it("finalizes ready when at least one video indexed and a sibling failed", async () => {
    await seedKb();
    vi.mocked(getTranscript).mockImplementation(async (videoId: string) => {
      if (videoId === "vid-b") {
        throw new Error("OpenRouter 503");
      }
      return longTranscript(videoId);
    });

    const results = [];
    for (const video of [videoA, videoB]) {
      try {
        results.push(await processKbVideoBuild("kb-steps", video.videoId, false));
      } catch (err) {
        results.push(failedVideoBuildResult(video, err));
      }
    }

    const kb = await completeKnowledgeBaseBuild("kb-steps", false, results);
    expect(kb.status).toBe("ready");
    expect(kb.chunkIds.length).toBeGreaterThan(0);
    expect(results.some((result) => result.status === "failed")).toBe(true);
  });

  it("never leaves the KB building and includes a per-video error summary", async () => {
    await seedKb();
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptUnavailableError("vid-a", new Error("No transcripts are available for this video"))
    );

    const results = [
      await processKbVideoBuild("kb-steps", "vid-a", false),
      await processKbVideoBuild("kb-steps", "vid-b", false),
    ];
    const kb = await completeKnowledgeBaseBuild("kb-steps", false, results);
    expect(kb.status).toBe("failed");
    expect(kb.buildJob?.error).toMatch(/Talk A/);
    expect(kb.buildJob?.error).toMatch(/Talk B/);
  });
});
