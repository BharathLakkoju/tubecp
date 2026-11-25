import { getJobStore } from "@/lib/pipeline/jobs";

/** Quick probe for Neon-backed pipeline tables; avoids treating DB outages as a "paused" build. */
export async function probeJobStoreForKb(kbId: string): Promise<boolean> {
  try {
    await getJobStore().getRun(kbId);
    return true;
  } catch (err) {
    console.warn(`Pipeline job store unavailable for ${kbId}:`, err);
    return false;
  }
}