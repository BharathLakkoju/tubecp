import { describe, expect, it, vi } from "vitest";
import type { SQSEvent } from "aws-lambda";

vi.mock("@/lib/pipeline/runtime", () => ({
  dispatchPipelineMessage: vi.fn(),
}));

import { dispatchPipelineMessage } from "@/lib/pipeline/runtime";
import { createSqsHandler } from "@/lib/pipeline/sqs-handler";
import { DeadLetteredError, RetryLaterError } from "@/lib/pipeline/retry";

function event(messageId: string): SQSEvent {
  return {
    Records: [
      {
        messageId,
        receiptHandle: "rh",
        body: JSON.stringify({ kbId: "kb", videoId: "v" }),
        attributes: {
          ApproximateReceiveCount: "5",
          SentTimestamp: "0",
          SenderId: "s",
          ApproximateFirstReceiveTimestamp: "0",
        },
        messageAttributes: {},
        md5OfBody: "",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:us-east-2:1:q",
        awsRegion: "us-east-2",
      },
    ],
  };
}

describe("SQS handler", () => {
  it("acks dead-lettered jobs so SQS does not retry a terminal row", async () => {
    vi.mocked(dispatchPipelineMessage).mockRejectedValueOnce(new DeadLetteredError("done"));
    const result = await createSqsHandler("fetch")(event("m-dlq"));
    expect(result.batchItemFailures).toEqual([]);
  });

  it("reports retryable jobs as batch failures", async () => {
    vi.mocked(dispatchPipelineMessage).mockRejectedValueOnce(new RetryLaterError(5, "later"));
    const result = await createSqsHandler("fetch")(event("m-retry"));
    expect(result.batchItemFailures).toEqual([{ itemIdentifier: "m-retry" }]);
  });
});
