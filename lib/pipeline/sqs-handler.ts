import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { ChangeMessageVisibilityCommand, SQSClient } from "@aws-sdk/client-sqs";
import { pipelineConfig } from "@/lib/pipeline/config";
import { parsePipelineMessage, type PipelineStage } from "@/lib/pipeline/messages";
import { dispatchPipelineMessage } from "@/lib/pipeline/runtime";
import { DeadLetteredError, RetryLaterError } from "@/lib/pipeline/retry";

function receiveCount(record: SQSRecord): number {
  const raw = record.attributes?.ApproximateReceiveCount;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function delayRetry(queueUrl: string, receiptHandle: string, seconds: number): Promise<void> {
  const client = new SQSClient({ region: pipelineConfig().region });
  await client.send(
    new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: seconds,
    })
  );
}

export function createSqsHandler(stage: PipelineStage) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const failures: SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        const message = parsePipelineMessage(record.body);
        await dispatchPipelineMessage(stage, message, receiveCount(record));
      } catch (err) {
        if (err instanceof DeadLetteredError) {
          continue;
        } else if (err instanceof RetryLaterError) {
          const url =
            stage === "fetch" ? pipelineConfig().fetchQueueUrl : pipelineConfig().embedQueueUrl;
          if (url && record.receiptHandle) {
            await delayRetry(url, record.receiptHandle, err.delaySeconds);
          }
          failures.push({ itemIdentifier: record.messageId });
        } else {
          console.error(`${stage} worker failed:`, err);
          failures.push({ itemIdentifier: record.messageId });
        }
      }
    }

    return { batchItemFailures: failures };
  };
}

export const handleFetchQueue = createSqsHandler("fetch");
export const handleEmbedQueue = createSqsHandler("embed");
