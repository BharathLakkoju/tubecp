import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

const ROOT = path.join(__dirname, "..");
const REGION = process.env.PIPELINE_AWS_REGION || "us-east-2";
const VERCEL_TEAM = process.env.VERCEL_OIDC_TEAM || "bharathlakkojus-projects";
const VERCEL_PROJECT = process.env.VERCEL_OIDC_PROJECT || "tubecp";

class TranscriptPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fetchDlq = new sqs.Queue(this, "FetchDlq", {
      retentionPeriod: cdk.Duration.days(14),
    });
    const embedDlq = new sqs.Queue(this, "EmbedDlq", {
      retentionPeriod: cdk.Duration.days(14),
    });

    const fetchQueue = new sqs.Queue(this, "FetchQueue", {
      visibilityTimeout: cdk.Duration.seconds(120),
      deadLetterQueue: { queue: fetchDlq, maxReceiveCount: 5 },
    });
    const embedQueue = new sqs.Queue(this, "EmbedQueue", {
      visibilityTimeout: cdk.Duration.seconds(120),
      deadLetterQueue: { queue: embedDlq, maxReceiveCount: 5 },
    });

    const workerEnv = {
      PIPELINE_AWS_REGION: this.region,
      PIPELINE_FETCH_QUEUE_URL: fetchQueue.queueUrl,
      PIPELINE_EMBED_QUEUE_URL: embedQueue.queueUrl,
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "",
      OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
      YOUTUBE_HTTP_PROXY: process.env.YOUTUBE_HTTP_PROXY ?? "",
      PIPELINE_JOB_STORE: "neon",
    };

    const fetchWorker = new NodejsFunction(this, "FetchWorker", {
      entry: path.join(ROOT, "lib/pipeline/lambda-fetch.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      depsLockFilePath: path.join(ROOT, "package-lock.json"),
      projectRoot: ROOT,
      bundling: {
        tsconfig: path.join(ROOT, "tsconfig.json"),
      },
      environment: workerEnv,
      reservedConcurrentExecutions: 10,
    });

    const embedWorker = new NodejsFunction(this, "EmbedWorker", {
      entry: path.join(ROOT, "lib/pipeline/lambda-embed.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      depsLockFilePath: path.join(ROOT, "package-lock.json"),
      projectRoot: ROOT,
      bundling: {
        tsconfig: path.join(ROOT, "tsconfig.json"),
      },
      environment: workerEnv,
      reservedConcurrentExecutions: 8,
    });

    fetchQueue.grantConsumeMessages(fetchWorker);
    fetchQueue.grantSendMessages(fetchWorker);
    embedQueue.grantSendMessages(fetchWorker);
    embedQueue.grantConsumeMessages(embedWorker);
    fetchQueue.grantSendMessages(embedWorker);

    fetchWorker.addEventSource(
      new SqsEventSource(fetchQueue, { batchSize: 5, maxConcurrency: 10, reportBatchItemFailures: true })
    );
    embedWorker.addEventSource(
      new SqsEventSource(embedQueue, { batchSize: 5, maxConcurrency: 8, reportBatchItemFailures: true })
    );

    new cloudwatch.Alarm(this, "FetchDlqAlarm", {
      metric: fetchDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
    });
    new cloudwatch.Alarm(this, "EmbedDlqAlarm", {
      metric: embedDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
    });

    const issuer = `https://oidc.vercel.com/${VERCEL_TEAM}`;
    const provider = new iam.OpenIdConnectProvider(this, "VercelOidc", {
      url: issuer,
      clientIds: [`https://vercel.com/${VERCEL_TEAM}`],
    });

    const vercelRole = new iam.Role(this, "VercelEnqueueRole", {
      assumedBy: new iam.OpenIdConnectPrincipal(provider).withConditions({
        StringEquals: {
          [`${issuer.replace("https://", "")}:aud`]: `https://vercel.com/${VERCEL_TEAM}`,
        },
        StringLike: {
          [`${issuer.replace("https://", "")}:sub`]: `owner:${VERCEL_TEAM}:project:${VERCEL_PROJECT}:environment:*`,
        },
      }),
      description: "Vercel tubecp enqueue-only role for the transcript pipeline",
    });
    fetchQueue.grantSendMessages(vercelRole);

    new cdk.CfnOutput(this, "FetchQueueUrl", { value: fetchQueue.queueUrl });
    new cdk.CfnOutput(this, "EmbedQueueUrl", { value: embedQueue.queueUrl });
    new cdk.CfnOutput(this, "FetchDlqUrl", { value: fetchDlq.queueUrl });
    new cdk.CfnOutput(this, "EmbedDlqUrl", { value: embedDlq.queueUrl });
    new cdk.CfnOutput(this, "VercelRoleArn", { value: vercelRole.roleArn });
  }
}

const app = new cdk.App();
new TranscriptPipelineStack(app, "TubecpTranscriptPipeline", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: REGION,
  },
});
