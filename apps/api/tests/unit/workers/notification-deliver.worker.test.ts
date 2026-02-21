import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "pg-boss";
import { handleNotificationDeliver } from "@/queues/workers/notification-deliver.worker.js";
import type { NotificationDeliverPayload, WorkerDeps } from "@/queues/types.js";

describe("notification-deliver.worker", () => {
  let mockDeps: WorkerDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      db: {} as unknown as WorkerDeps["db"],
      boss: {} as unknown as WorkerDeps["boss"],
      smsService: {
        sendMessage: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
  });

  it("should call smsService.sendMessage with correct phoneNumber and message", async () => {
    const mockJob = {
      id: "test-job-id",
      name: "notification/deliver",
      data: {
        phoneNumber: "+15551234567",
        message: "Test notification",
      },
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<NotificationDeliverPayload>;

    await handleNotificationDeliver(mockJob, mockDeps);

    expect(mockDeps.smsService.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockDeps.smsService.sendMessage).toHaveBeenCalledWith(
      "+15551234567",
      "Test notification",
    );
  });

  it("should propagate errors from smsService.sendMessage", async () => {
    const mockJob = {
      id: "test-job-id",
      name: "notification/deliver",
      data: {
        phoneNumber: "+15551234567",
        message: "Test notification",
      },
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<NotificationDeliverPayload>;

    const smsError = new Error("SMS delivery failed");
    vi.mocked(mockDeps.smsService.sendMessage).mockRejectedValueOnce(smsError);

    await expect(handleNotificationDeliver(mockJob, mockDeps)).rejects.toThrow(
      "SMS delivery failed",
    );
  });
});
