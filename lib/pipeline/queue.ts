import { ChangeMessageVisibilityCommand, SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { pipelineConfig } from "@/lib/pipeline/config";
import { serializePipelineMessage, type PipelineMessage, type PipelineStage } from "@/lib/pipeline/messages";

export type QueueAdapter = {
  send(stage: PipelineStage, messages: PipelineMessage[]): Promise<void>;
  changeVisibility(stage: PipelineStage, receiptHandle: string, seconds: number): Promise<void>;
};

let inProcessHandler: ((stage: PipelineStage, message: PipelineMessage) => Promise<void>) | null = null;

/** Workers register this so local/dev can run without SQS. */
export function setInProcessQueueHandler(
  handler: ((stage: PipelineStage, message: PipelineMessage) => Promise<void>) | null
): void {
  inProcessHandler = handler;
}

function queueUrl(stage: PipelineStage): string {
  const { fetchQueueUrl, embedQueueUrl } = pipelineConfig();
  return stage === "fetch" ? fetchQueueUrl : embedQueueUrl;
}

function sqsClient(): SQSClient {
  const { region, roleArn } = pipelineConfig();
  if (roleArn && process.env.VERCEL) {
    return new SQSClient({
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    });
  }
  return new SQSClient({ region });
}

class SqsAdapter implements QueueAdapter {
  async send(stage: PipelineStage, messages: PipelineMessage[]): Promise<void> {
    const url = queueUrl(stage);
    if (!url) {
      throw new Error(`Missing queue URL for ${stage} stage`);
    }
    const client = sqsClient();
    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10);
      await client.send(
        new SendMessageBatchCommand({
          QueueUrl: url,
          Entries: batch.map((message, index) => ({
            Id: `${index}`,
            MessageBody: serializePipelineMessage(message),
            MessageGroupId: undefined,
          })),
        })
      );
    }
  }

  async changeVisibility(stage: PipelineStage, receiptHandle: string, seconds: number): Promise<void> {
    const url = queueUrl(stage);
    if (!url) return;
    await sqsClient().send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: url,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: seconds,
      })
    );
  }
}

class InProcessAdapter implements QueueAdapter {
  async send(stage: PipelineStage, messages: PipelineMessage[]): Promise<void> {
    const handler = inProcessHandler;
    if (!handler) {
      throw new Error("In-process pipeline handler is not registered");
    }
    for (const message of messages) {
      void handler(stage, message).catch((err) => {
        console.error(`In-process ${stage} job failed for ${message.kbId}/${message.videoId}:`, err);
      });
    }
  }

  async changeVisibility(): Promise<void> {
    // Local handler rethrows RetryLaterError; a timer re-runs the worker.
  }
}

export function getQueueAdapter(): QueueAdapter {
  if (queueUrl("fetch") && queueUrl("embed")) {
    return new SqsAdapter();
  }
  return new InProcessAdapter();
}

export async function enqueue(stage: PipelineStage, messages: PipelineMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await getQueueAdapter().send(stage, messages);
}
