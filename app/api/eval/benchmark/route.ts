import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { loadEvalBenchmark } from "@/lib/eval/benchmark";

export async function GET() {
  try {
    await requireUserId();
    const benchmark = loadEvalBenchmark();
    if (!benchmark) {
      return NextResponse.json({ error: "Benchmark data unavailable" }, { status: 404 });
    }
    return NextResponse.json(benchmark);
  } catch (err) {
    return apiError(err);
  }
}
