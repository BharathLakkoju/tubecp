import { NonRetriableError } from "inngest";
import {
  classifyPipelineError,
  describePipelineError,
  isTerminalErrorClass,
} from "@/lib/pipeline/errors";
import { KB_BUILD_STEP_MS, KB_BUILD_STEP_TIMEOUT } from "@/lib/services/kb-build-steps";

export class KbBuildStepTimeoutError extends Error {
  constructor() {
    super(`Knowledge base build step exceeded ${KB_BUILD_STEP_TIMEOUT}`);
    this.name = "KbBuildStepTimeoutError";
  }
}

export function runWithKbBuildStepDeadline<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new KbBuildStepTimeoutError()), KB_BUILD_STEP_MS);
    void fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

type StepRun = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (id: string, fn: () => Promise<any>) => Promise<unknown>;
};

function rethrowIfTerminal(err: unknown): never {
  if (isTerminalErrorClass(classifyPipelineError(err))) {
    throw new NonRetriableError(describePipelineError(err), { cause: err });
  }
  throw err;
}

export async function kbBuildStepRun<T>(step: StepRun, id: string, fn: () => Promise<T>): Promise<T> {
  try {
    return (await step.run(id, () => runWithKbBuildStepDeadline(fn))) as T;
  } catch (err) {
    rethrowIfTerminal(err);
  }
}

export function chunkIdsInBatches(chunkIds: string[], batchSize: number): string[][] {
  if (chunkIds.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < chunkIds.length; i += batchSize) {
    batches.push(chunkIds.slice(i, i + batchSize));
  }
  return batches;
}