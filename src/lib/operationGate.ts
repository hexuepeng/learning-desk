/** 等在途媒体操作结束再冻结备份；冻结请求后不再接收新操作。 */
export function createOperationGate() {
  let exclusive = false;
  let active = 0;
  let onIdle: (() => void) | undefined;
  return {
    get blocked() { return exclusive; },
    async mutate<T>(work: () => Promise<T>): Promise<T> {
      if (exclusive) throw new Error('正在保存或备份，请稍后再试。');
      active += 1;
      try {
        return await work();
      } finally {
        active -= 1;
        if (active === 0) onIdle?.();
      }
    },
    async freeze<T>(work: () => Promise<T>): Promise<T> {
      if (exclusive) throw new Error('正在保存或备份，请稍后再试。');
      exclusive = true;
      try {
        if (active > 0) await new Promise<void>((resolve) => { onIdle = resolve; });
        return await work();
      } finally {
        onIdle = undefined;
        exclusive = false;
      }
    },
  };
}

/** 每次写入收到自己的结果；一次失败不会阻断后续重试。 */
export function createWriteQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    run(work: () => Promise<void>): Promise<void> {
      const next = tail.catch(() => {}).then(work);
      tail = next;
      return next;
    },
    flush(): Promise<void> { return tail; },
  };
}
