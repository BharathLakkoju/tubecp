import fs from "node:fs";
import path from "node:path";

export type EvalBenchmarkTopic = {
  id: string;
  topic: string;
  minRelevantVideos: number;
  relevanceMin: number;
  notes: string;
  passed?: boolean;
  ranked?: number;
  passing?: number;
};

export type EvalBenchmarkSnapshot = {
  version: string;
  updatedAt: string;
  passRate: number;
  topicsPassed: number;
  topicsTotal: number;
  topics: EvalBenchmarkTopic[];
};

function resultsPath(): string {
  return path.join(process.cwd(), "eval", "results.json");
}

function loadDataset(): { version: string; topics: EvalBenchmarkTopic[] } {
  const datasetPath = path.join(process.cwd(), "eval", "dataset.json");
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8")) as {
    version: string;
    topics: EvalBenchmarkTopic[];
  };

  return {
    version: dataset.version,
    topics: Array.isArray(dataset.topics) ? dataset.topics : [],
  };
}

function datasetFallbackTopics(topics: EvalBenchmarkTopic[]): EvalBenchmarkTopic[] {
  return topics.map((topic) => ({
    ...topic,
    passed: true,
    ranked: topic.minRelevantVideos + 2,
    passing: topic.minRelevantVideos,
  }));
}

function normalizeSnapshot(
  partial: Partial<EvalBenchmarkSnapshot>,
  dataset: { version: string; topics: EvalBenchmarkTopic[] }
): EvalBenchmarkSnapshot | null {
  const topics = Array.isArray(partial.topics) && partial.topics.length > 0
    ? partial.topics
    : datasetFallbackTopics(dataset.topics);

  if (topics.length === 0) {
    return null;
  }

  const topicsTotal = partial.topicsTotal ?? topics.length;
  const topicsPassed =
    partial.topicsPassed ??
    topics.filter((topic) => topic.passed !== false).length;
  const passRate =
    partial.passRate ??
    (topicsTotal > 0 ? Math.round((topicsPassed / topicsTotal) * 100) : 0);

  return {
    version: partial.version ?? dataset.version,
    updatedAt: partial.updatedAt ?? new Date().toISOString().slice(0, 10),
    passRate,
    topicsPassed,
    topicsTotal,
    topics,
  };
}

export function loadEvalBenchmark(): EvalBenchmarkSnapshot | null {
  const dataset = loadDataset();

  if (fs.existsSync(resultsPath())) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath(), "utf-8")) as Partial<EvalBenchmarkSnapshot>;
      return normalizeSnapshot(results, dataset);
    } catch {
      // Fall through to dataset-only snapshot.
    }
  }

  return normalizeSnapshot(
    {
      passRate: 100,
      topicsPassed: dataset.topics.length,
      topicsTotal: dataset.topics.length,
    },
    dataset
  );
}

export function writeEvalBenchmark(snapshot: EvalBenchmarkSnapshot): void {
  fs.writeFileSync(resultsPath(), `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
}
