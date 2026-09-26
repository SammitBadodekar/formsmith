export function replayQueue(
  replay: (key: string) => Promise<void>,
  report: (event: string) => void,
  concurrency = 5,
) {
  const pending = new Set<string>();
  const active = new Map<string, Promise<void>>();
  let stopping = false;
  function pump() {
    while (!stopping && active.size < concurrency && pending.size) {
      const key = pending.values().next().value;
      if (!key) break;
      pending.delete(key);
      const work = Promise.resolve()
        .then(() => replay(key))
        .catch(() => report("intake.replay_retry"))
        .finally(() => {
          active.delete(key);
          pump();
        });
      active.set(key, work);
    }
  }
  return {
    async enqueue(key: string) {
      if (stopping || pending.size >= 500) throw new Error("Replay queue is full or stopping");
      if (!active.has(key)) pending.add(key);
      pump();
    },
    async stop() {
      stopping = true;
      // Pending work is recoverable from the S3 index after restart.
      pending.clear();
      await Promise.all(active.values());
    },
  };
}
