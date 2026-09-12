#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchYouTube } from "../lib/services/youtube-search.js";
import { getTranscript } from "../lib/services/transcript.js";
import { analyzeVideo } from "../lib/services/relevance.js";
import { runResearchPipeline } from "../lib/services/research-pipeline.js";
import {
  createKnowledgeBase,
  indexVideoInKnowledgeBase,
  finalizeKnowledgeBase,
} from "../lib/services/knowledge-base.js";
import { chatWithKnowledgeBase } from "../lib/services/chat.js";
import { isLicenseValid } from "../lib/config.js";

const server = new McpServer({
  name: "youtube-research-agent",
  version: "0.2.0",
});

server.tool(
  "search_youtube",
  "Search YouTube for candidate videos on a topic",
  {
    query: z.string(),
    maxResults: z.number().optional(),
    publishedAfter: z.string().optional(),
    publishedBefore: z.string().optional(),
  },
  async ({ query, maxResults, publishedAfter, publishedBefore }) => {
    const videos = await searchYouTube(query, { maxResults, publishedAfter, publishedBefore });
    return { content: [{ type: "text", text: JSON.stringify({ videos }, null, 2) }] };
  }
);

server.tool(
  "get_transcript",
  "Get the transcript/captions for a YouTube video",
  { videoId: z.string() },
  async ({ videoId }) => {
    const transcript = await getTranscript(videoId);
    return { content: [{ type: "text", text: JSON.stringify(transcript, null, 2) }] };
  }
);

server.tool(
  "analyze_video",
  "Determine whether a video meaningfully discusses a topic",
  { videoId: z.string(), topic: z.string() },
  async ({ videoId, topic }) => {
    const video = {
      videoId,
      title: videoId,
      channel: "Unknown",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: "",
    };
    const analysis = await analyzeVideo(video, topic);
    return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
  }
);

server.tool(
  "research_youtube",
  "Search, analyze, and rank the top 10-20 YouTube videos for a research topic",
  {
    topic: z.string(),
    maxVideos: z.number().optional(),
  },
  async ({ topic, maxVideos }) => {
    const result = await runResearchPipeline(topic, {
      planId: "pro",
      maxVideos,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "build_knowledge_base",
  "Transcribe ranked videos, chunk, embed, and build a queryable knowledge base",
  {
    topic: z.string(),
    rankedVideos: z.array(
      z.object({
        videoId: z.string(),
        title: z.string(),
        channel: z.string(),
        url: z.string(),
        relevanceScore: z.number(),
        whyRelevant: z.string(),
        discussionLevel: z.enum(["brief", "substantial"]),
      })
    ),
    licenseKey: z.string().optional(),
  },
  async ({ topic, rankedVideos, licenseKey }) => {
    if (!isLicenseValid(licenseKey)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Invalid license key" }) }],
        isError: true,
      };
    }
    const kb = await createKnowledgeBase(topic, rankedVideos, "mcp-user", true);
    for (const video of rankedVideos) {
      await indexVideoInKnowledgeBase(kb.kbId, video);
    }
    const ready = await finalizeKnowledgeBase(kb.kbId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              kbId: ready.kbId,
              videosIndexed: ready.videosIndexed,
              chunksIndexed: ready.chunksIndexed,
              status: ready.status,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "chat_with_knowledge_base",
  "Ask a question against a built knowledge base with cited sources",
  {
    kbId: z.string(),
    message: z.string(),
    licenseKey: z.string().optional(),
  },
  async ({ kbId, message, licenseKey }) => {
    if (!isLicenseValid(licenseKey)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Invalid license key" }) }],
        isError: true,
      };
    }
    const response = await chatWithKnowledgeBase(kbId, message);
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("YouTube Research MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
