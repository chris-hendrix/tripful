import type { Job } from "pg-boss";
import type { WorkerDeps } from "@/queues/types.js";

export async function handleDlq(
  job: Job<unknown>,
  deps: WorkerDeps,
): Promise<void> {
  deps.logger.error(
    { queue: job.name, jobId: job.id, data: job.data },
    "Job moved to dead letter queue",
  );
}
