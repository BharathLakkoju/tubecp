import { NextResponse } from "next/server";
import { loadEvalBenchmark } from "@/lib/eval/benchmark";

export async function GET() {
  const benchmark = loadEvalBenchmark();
  return NextResponse.json(benchmark);
}
