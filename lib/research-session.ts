import { v4 as uuidv4 } from "uuid";
import { getRedis } from "@/lib/store/redis";
import type { ResearchResult, VideoAnalysis, VideoCandidate } from "@/lib/types";

const SESSION_TTL_SECONDS = 2 * 60 * 60;

type ResearchSession = {
  userId: string;
  createdAt: string;
};

export type ResearchCheckpointStage = "expanded" | "searched" | "analyzed" | "ranked";

export type ResearchCheckpoint = {
  topic: string;
  stage: ResearchCheckpointStage;
  queries?: string[];
  candidates?: VideoCandidate[];
  allCandidates?: VideoCandidate[];
  videosSearched?: number;
  analyses?: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>;
  result?: ResearchResult;
  updatedAt: string;
};

const memorySessions = new Map<string, { session: ResearchSession; expires: number }>();
const memoryCheckpoints = new Map<string, { checkpoint: ResearchCheckpoint; expires: number }>();

export class ResearchSessionError extends Error {
  code = "RESEARCH_SESSION_REQUIRED";

  constructor(message: string) {
    super(message);
    this.name = "ResearchSessionError";
  }
}

function sessionKey(sessionId: string): string {
  return `research-session:${sessionId}`;
}

function checkpointKey(sessionId: string): string {
  return `research-checkpoint:${sessionId}`;
}

export async function createResearchSession(userId: string): Promise<string> {
  const sessionId = uuidv4();
  const session: ResearchSession = { userId, createdAt: new Date().toISOString() };
  const redis = getRedis();

  if (redis) {
    await redis.set(sessionKey(sessionId), session, { ex: SESSION_TTL_SECONDS });
  } else {
    memorySessions.set(sessionId, {
      session,
      expires: Date.now() + SESSION_TTL_SECONDS * 1000,
    });
  }

  return sessionId;
}

async function readSession(sessionId: string): Promise<ResearchSession | null> {
  const redis = getRedis();

  if (redis) {
    return (await redis.get<ResearchSession>(sessionKey(sessionId))) ?? null;
  }

  const entry = memorySessions.get(sessionId);
  if (entry && entry.expires > Date.now()) {
    return entry.session;
  }
  if (entry) {
    memorySessions.delete(sessionId);
  }
  return null;
}

export async function assertResearchSession(
  userId: string,
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId?.trim()) {
    throw new ResearchSessionError(
      "researchSessionId is required. Start research with POST /api/research/expand."
    );
  }

  const session = await readSession(sessionId);
  if (!session || session.userId !== userId) {
    throw new ResearchSessionError(
      "Invalid or expired research session. Start a new research with POST /api/research/expand."
    );
  }
}

export async function saveResearchCheckpoint(
  sessionId: string,
  checkpoint: ResearchCheckpoint
): Promise<void> {
  const payload = { ...checkpoint, updatedAt: new Date().toISOString() };
  const redis = getRedis();

  if (redis) {
    await redis.set(checkpointKey(sessionId), payload, { ex: SESSION_TTL_SECONDS });
    return;
  }

  memoryCheckpoints.set(sessionId, {
    checkpoint: payload,
    expires: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

export async function getResearchCheckpoint(
  userId: string,
  sessionId: string
): Promise<ResearchCheckpoint | null> {
  await assertResearchSession(userId, sessionId);

  const redis = getRedis();
  if (redis) {
    return (await redis.get<ResearchCheckpoint>(checkpointKey(sessionId))) ?? null;
  }

  const entry = memoryCheckpoints.get(sessionId);
  if (entry && entry.expires > Date.now()) {
    return entry.checkpoint;
  }
  if (entry) {
    memoryCheckpoints.delete(sessionId);
  }
  return null;
}
