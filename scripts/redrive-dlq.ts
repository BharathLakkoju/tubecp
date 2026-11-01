import { GetQueueAttributesCommand, SQSClient, StartMessageMoveTaskCommand } from "@aws-sdk/client-sqs";
import { loadEnvFiles } from "../lib/load-env";

loadEnvFiles();

async function queueArn(client: SQSClient, url: string): Promise<{ arn: string; depth: string }> {
  const attrs = await client.send(
    new GetQueueAttributesCommand({
      QueueUrl: url,
      AttributeNames: ["QueueArn", "ApproximateNumberOfMessages"],
    })
  );
  const arn = attrs.Attributes?.QueueArn;
  if (!arn) throw new Error(`Could not resolve ARN for ${url}`);
  return { arn, depth: attrs.Attributes?.ApproximateNumberOfMessages ?? "0" };
}

async function main() {
  const region = process.env.PIPELINE_AWS_REGION || "us-east-2";
  const sourceUrl = process.argv[2] || process.env.PIPELINE_FETCH_DLQ_URL;
  const destUrl = process.argv[3] || process.env.PIPELINE_FETCH_QUEUE_URL;
  if (!sourceUrl || !destUrl) {
    throw new Error("Usage: tsx scripts/redrive-dlq.ts <dlqUrl> <queueUrl>");
  }

  const client = new SQSClient({ region });
  const source = await queueArn(client, sourceUrl);
  const dest = await queueArn(client, destUrl);
  console.log(`DLQ depth ${source.depth}; redriving ${source.arn} → ${dest.arn}`);
  const result = await client.send(
    new StartMessageMoveTaskCommand({
      SourceArn: source.arn,
      DestinationArn: dest.arn,
    })
  );
  console.log(result.TaskHandle ?? "started");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
