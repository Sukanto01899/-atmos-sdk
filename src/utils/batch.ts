import { SdkError } from "../types";
import type { BatchOptions, BatchResult, BatchProgress } from "../types";

const DEFAULT_CONCURRENCY = 3;

export const runBatch = async <TItem, TResult>(
  items: TItem[],
  worker: (item: TItem, index: number) => Promise<TResult>,
  options?: BatchOptions,
): Promise<BatchResult<TItem, TResult>[]> => {
  const total = items.length;
  const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_CONCURRENCY);
  const results: Array<BatchResult<TItem, TResult> | undefined> = new Array(
    total,
  );
  let nextIndex = 0;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let inFlight = 0;
  let stop = false;

  const report = () => {
    const progress: BatchProgress = {
      total,
      completed,
      succeeded,
      failed,
      inFlight,
    };
    options?.onProgress?.(progress);
  };

  const runWorker = async () => {
    while (true) {
      if (stop) return;
      const index = nextIndex;
      if (index >= total) return;
      nextIndex += 1;
      const item = items[index];
      inFlight += 1;
      report();
      try {
        const result = await worker(item, index);
        results[index] = { item, status: "fulfilled", result };
        succeeded += 1;
      } catch (error) {
        results[index] = { item, status: "rejected", error };
        failed += 1;
        if (options?.stopOnError) {
          stop = true;
        }
      } finally {
        completed += 1;
        inFlight -= 1;
        report();
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => runWorker(),
  );
  await Promise.all(workers);

  if (stop) {
    for (let i = 0; i < results.length; i += 1) {
      if (!results[i]) {
        results[i] = {
          item: items[i],
          status: "rejected",
          error: new SdkError("E_BATCH_STOPPED", "Batch stopped after failure."),
        };
        failed += 1;
        completed += 1;
      }
    }
    report();
  }

  return results.map((result, index) =>
    result ??
    ({
      item: items[index],
      status: "rejected",
      error: new SdkError("E_BATCH_UNKNOWN", "Batch item did not complete."),
    } as BatchResult<TItem, TResult>),
  );
};
