import { describe, expect, it, vi } from "vitest";
import { runBatch } from "../src/utils/batch";
import { SdkError } from "../src/types";

describe("runBatch", () => {
  it("respects concurrency limits", async () => {
    vi.useFakeTimers();
    const items = [0, 1, 2, 3, 4];
    let current = 0;
    let max = 0;

    const worker = async (item: number) => {
      current += 1;
      max = Math.max(max, current);
      try {
        return await new Promise<number>((resolve) => {
          setTimeout(() => resolve(item), 50);
        });
      } finally {
        current -= 1;
      }
    };

    const batchPromise = runBatch(items, worker, { concurrency: 2 });

    await vi.runAllTimersAsync();
    const results = await batchPromise;
    expect(max).toBe(2);
    expect(current).toBe(0);
    expect(results.every((item) => item.status === "fulfilled")).toBe(true);
    vi.useRealTimers();
  });

  it("stops on first error when stopOnError is true", async () => {
    const items = ["a", "b", "c"];
    const worker = async (item: string) => {
      if (item === "a") {
        throw new Error("boom");
      }
      return item;
    };

    const results = await runBatch(items, worker, {
      concurrency: 1,
      stopOnError: true,
    });

    const first = results[0];
    expect(first.status).toBe("rejected");
    const stopped = results.slice(1);
    expect(stopped.every((item) => item.status === "rejected")).toBe(true);
    const stoppedError = stopped[0].status === "rejected" ? stopped[0].error : null;
    expect(stoppedError).toBeInstanceOf(SdkError);
  });

  it("retries and succeeds when retry succeeds", async () => {
    vi.useFakeTimers();
    const items = ["x"];
    let attempts = 0;

    const worker = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("fail");
      }
      return "ok";
    };

    const batchPromise = runBatch(items, worker, {
      retries: 1,
      retryDelayMs: 10,
    });

    await vi.runAllTimersAsync();
    const results = await batchPromise;
    expect(results[0].status).toBe("fulfilled");
    expect(attempts).toBe(2);
    vi.useRealTimers();
  });

  it("returns rejected result when retries are exhausted", async () => {
    vi.useFakeTimers();
    const items = ["x"];
    let attempts = 0;

    const worker = async () => {
      attempts += 1;
      throw new Error("fail");
    };

    const batchPromise = runBatch(items, worker, {
      retries: 1,
      retryDelayMs: 10,
    });

    await vi.runAllTimersAsync();
    const results = await batchPromise;
    expect(results[0].status).toBe("rejected");
    expect(attempts).toBe(2);
    vi.useRealTimers();
  });
});
