import type { Job } from "pg-boss";
import type { NotificationDeliverPayload, WorkerDeps } from "@/queues/types.js";

export async function handleNotificationDeliver(
  job: Job<NotificationDeliverPayload>,
  deps: WorkerDeps,
): Promise<void> {
  const { phoneNumber, message } = job.data;
  await deps.smsService.sendMessage(phoneNumber, message);
}
