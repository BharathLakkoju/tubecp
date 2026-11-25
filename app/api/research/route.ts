import { NextRequest } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { isE2eStubMode, stubResearchResult } from "@/lib/e2e-stub";
import { rateLimitApi } from "@/lib/ratelimit";
import { createResearchSession, saveResearchCheckpoint } from "@/lib/research-session";
import { persistUserResearch } from "@/lib/services/saved-research";
import { runResearchPipeline, type ResearchProgress } from "@/lib/services/research-pipeline";
import {
  getCachedResearchResult,
  researchResultCacheKey,
  cacheResearchResult,
} from "@/lib/store";

/** Compact path for MCP, eval, and E2E stubs. The product UI uses expand/search/analyze. */
export const maxDuration = 60;

function researchStage(stage: string): "expanding" | "searching" | "analyzing" | "ranking" {
  if (stage === "expanding") return "expanding";
  if (stage === "analyzing") return "analyzing";
  if (stage === "ranking" || stage === "complete") return "ranking";
  return "searching";
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research", 10);
    const { topic } = (await req.json()) as { topic?: string };
    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };
        try {
          if (isE2eStubMode()) {
            const researchSessionId = await createResearchSession(userId);
            const research = stubResearchResult(topic.trim());
            await persistUserResearch(userId, researchSessionId, research);
            send({
              type: "progress",
              stage: "ranking",
              message: `found ${research.rankedVideos.length} relevant videos`,
              progress: 100,
            });
            send({ type: "done", research, researchSessionId });
            return;
          }

          const sub = await getUserSubscription(userId);
          const cacheKey = researchResultCacheKey(sub.plan, topic);
          const cachedResearch = await getCachedResearchResult(cacheKey);
          const researchSessionId = await createResearchSession(userId);

          if (cachedResearch) {
            await persistUserResearch(userId, researchSessionId, cachedResearch);
            send({
              type: "progress",
              stage: "ranking",
              message: `found ${cachedResearch.rankedVideos.length} relevant videos (cached)`,
              progress: 100,
              queries: cachedResearch.queriesUsed,
              allVideos: cachedResearch.allVideos,
            });
            send({ type: "done", research: cachedResearch, researchSessionId });
            return;
          }

          await checkAndIncrementUsage(userId, "research");

          const research = await runResearchPipeline(topic.trim(), {
            planId: sub.plan,
            onProgress: (progress: ResearchProgress) => {
              send({
                type: "progress",
                stage: researchStage(progress.stage),
                message: progress.message,
                progress: progress.progress,
                queries: progress.queries,
                allVideos: progress.allVideos,
                analyzedVideos: progress.analyzedVideos,
                analyzedScores: progress.analyzedScores,
              });
            },
          });

          await cacheResearchResult(cacheKey, research);
          await persistUserResearch(userId, researchSessionId, research);
          await saveResearchCheckpoint(researchSessionId, {
            topic: topic.trim(),
            stage: "ranked",
            result: research,
            updatedAt: new Date().toISOString(),
          });
          send({ type: "done", research, researchSessionId });
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Research failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
