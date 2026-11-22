import LandingPage from "@/components/LandingPage";
import { loadEvalBenchmark } from "@/lib/eval/benchmark";

export default function HomePage() {
  const benchmark = loadEvalBenchmark();
  return <LandingPage benchmark={benchmark} />;
}
