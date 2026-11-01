import { retryBackoffSeconds } from "@/lib/pipeline/errors";

export class RetryLaterError extends Error {
  readonly delaySeconds: number;

  constructor(delaySeconds: number, message = "Retry later") {
    super(message);
    this.name = "RetryLaterError";
    this.delaySeconds = delaySeconds;
  }
}

export function retryLater(receiveCount: number, message?: string): RetryLaterError {
  return new RetryLaterError(retryBackoffSeconds(receiveCount), message);
}

export class DeadLetteredError extends Error {
  constructor(message = "Job moved to the dead-letter queue") {
    super(message);
    this.name = "DeadLetteredError";
  }
}
