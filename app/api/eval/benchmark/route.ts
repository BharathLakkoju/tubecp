import { NextResponse } from "next/server";
import { loadEvalBenchmark } from "@/lib/eval/benchmark";

export async function GET() {
  const benchmark = loadEvalBenchmark();
  if (!benchmark) {
    return NextResponse.json({ error: "Benchmark data unavailable" }, { status: 404 });
  }
  return NextResponse.json(benchmark);
}
