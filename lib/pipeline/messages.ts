import { z } from "zod";

export const pipelineMessageSchema = z.object({
  kbId: z.string().min(1),
  videoId: z.string().min(1),
});

export type PipelineMessage = z.infer<typeof pipelineMessageSchema>;

export type PipelineStage = "fetch" | "embed";

export function parsePipelineMessage(body: string): PipelineMessage {
  return pipelineMessageSchema.parse(JSON.parse(body));
}

export function serializePipelineMessage(message: PipelineMessage): string {
  return JSON.stringify({ kbId: message.kbId, videoId: message.videoId });
}
