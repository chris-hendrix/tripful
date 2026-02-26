import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "pg-boss";
import { handleDlq } from "@/queues/workers/dlq.worker.js";
import type { WorkerDeps } from "@/queues/types.js";

describe("dlq.worker", () => {
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

  it("should log error with queue name, job ID, and data", async () => {
    const mockJob = {
      id: "test-job-id",
      name: "notification/deliver/dlq",
      data: {
        phoneNumber: "+15551234567",
        message: "Test notification",
      },
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<unknown>;

    await handleDlq(mockJob, mockDeps);

    expect(mockDeps.logger.error).toHaveBeenCalledTimes(1);
    expect(mockDeps.logger.error).toHaveBeenCalledWith(
      {
        queue: "notification/deliver/dlq",
        jobId: "test-job-id",
        data: {
          phoneNumber: "+15551234567",
          message: "Test notification",
        },
      },
      "Job moved to dead letter queue",
    );
  });

  it("should handle different queue names correctly", async () => {
    const mockJob = {
      id: "batch-job-456",
      name: "notification/batch/dlq",
      data: {
        tripId: "trip-123",
        type: "trip_message",
        title: "New message",
        body: "Hello everyone!",
      },
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<unknown>;

    await handleDlq(mockJob, mockDeps);

    expect(mockDeps.logger.error).toHaveBeenCalledTimes(1);
    expect(mockDeps.logger.error).toHaveBeenCalledWith(
      {
        queue: "notification/batch/dlq",
        jobId: "batch-job-456",
        data: {
          tripId: "trip-123",
          type: "trip_message",
          title: "New message",
          body: "Hello everyone!",
        },
      },
      "Job moved to dead letter queue",
    );
  });

  it("should handle empty data payload", async () => {
    const mockJob = {
      id: "empty-job-789",
      name: "daily-itineraries/dlq",
      data: {},
      expireInSeconds: 600,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<unknown>;

    await handleDlq(mockJob, mockDeps);

    expect(mockDeps.logger.error).toHaveBeenCalledTimes(1);
    expect(mockDeps.logger.error).toHaveBeenCalledWith(
      {
        queue: "daily-itineraries/dlq",
        jobId: "empty-job-789",
        data: {},
      },
      "Job moved to dead letter queue",
    );
  });

  it("should handle complex nested data payload", async () => {
    const complexData = {
      tripId: "trip-abc",
      nested: {
        deep: {
          value: 42,
          list: [1, 2, 3],
        },
      },
      tags: ["urgent", "retry-exhausted"],
    };

    const mockJob = {
      id: "complex-job-101",
      name: "invitation/send/dlq",
      data: complexData,
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<unknown>;

    await handleDlq(mockJob, mockDeps);

    expect(mockDeps.logger.error).toHaveBeenCalledTimes(1);
    expect(mockDeps.logger.error).toHaveBeenCalledWith(
      {
        queue: "invitation/send/dlq",
        jobId: "complex-job-101",
        data: complexData,
      },
      "Job moved to dead letter queue",
    );
  });

  it("should not throw errors and complete successfully", async () => {
    const mockJob = {
      id: "safe-job-202",
      name: "notification/deliver/dlq",
      data: { phoneNumber: "+15559999999", message: "Failed delivery" },
      expireInSeconds: 300,
      heartbeatSeconds: null,
      signal: new AbortController().signal,
    } as Job<unknown>;

    await expect(handleDlq(mockJob, mockDeps)).resolves.toBeUndefined();
  });
});
