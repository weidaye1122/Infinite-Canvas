type PromisePoolEventType = 'fulfilled' | 'rejected';

type PromisePoolEventListener = (event: {
  type: PromisePoolEventType;
  data: {
    error?: unknown;
    promise: Promise<unknown>;
    result?: unknown;
  };
  target: PromisePool;
}) => void;

type PromiseSource =
  | Iterable<unknown>
  | Iterator<unknown>
  | Promise<unknown>
  | (() => unknown)
  | unknown;

const isIterator = (value: PromiseSource): value is Iterator<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as Iterator<unknown>).next === 'function';

const isIterable = (value: PromiseSource): value is Iterable<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  Symbol.iterator in value &&
  typeof (value as Iterable<unknown>)[Symbol.iterator] === 'function';

const isPromiseLike = (value: PromiseSource): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PromiseLike<unknown>).then === 'function';

const toIterator = (source: PromiseSource): Iterator<unknown> => {
  if (isIterator(source)) {
    return source;
  }

  if (isIterable(source)) {
    return source[Symbol.iterator]();
  }

  if (typeof source === 'function') {
    const fn = source as () => unknown;

    return {
      next() {
        const value = fn();
        return value ? { value, done: false } : { done: true, value: undefined };
      },
    };
  }

  if (isPromiseLike(source)) {
    let called = false;

    return {
      next() {
        if (called) {
          return { done: true, value: undefined };
        }

        called = true;
        return { done: false, value: source };
      },
    };
  }

  let called = false;

  return {
    next() {
      if (called) {
        return { done: true, value: undefined };
      }

      called = true;
      return { done: false, value: Promise.resolve(source) };
    },
  };
};

export class PromisePool {
  private activeCount = 0;
  private isDone = false;
  private readonly iterator: Iterator<unknown>;
  private readonly listeners: Record<PromisePoolEventType, PromisePoolEventListener[]> = {
    fulfilled: [],
    rejected: [],
  };
  private runningPromise: Promise<void> | null = null;

  constructor(source: PromiseSource, private readonly concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error('Invalid concurrency');
    }

    this.iterator = toIterator(source);
  }

  addEventListener(type: PromisePoolEventType, listener: PromisePoolEventListener) {
    if (!this.listeners[type].includes(listener)) {
      this.listeners[type].push(listener);
    }
  }

  removeEventListener(type: PromisePoolEventType, listener: PromisePoolEventListener) {
    this.listeners[type] = this.listeners[type].filter(entry => entry !== listener);
  }

  start() {
    if (this.runningPromise) {
      return this.runningPromise;
    }

    this.runningPromise = new Promise<void>((resolve, reject) => {
      const settleIfComplete = () => {
        if (this.isDone && this.activeCount === 0) {
          this.runningPromise = null;
          resolve();
        }
      };

      const pump = () => {
        while (!this.isDone && this.activeCount < this.concurrency) {
          const next = this.iterator.next();
          if (next.done) {
            this.isDone = true;
            settleIfComplete();
            return;
          }

          const promise = Promise.resolve(next.value);
          this.activeCount += 1;

          promise
            .then(result => {
              this.dispatchEvent('fulfilled', { promise, result });
            })
            .catch(error => {
              this.dispatchEvent('rejected', { promise, error });
              this.runningPromise = null;
              reject(error || new Error('Unknown error'));
            })
            .finally(() => {
              this.activeCount -= 1;
              if (this.runningPromise) {
                pump();
                settleIfComplete();
              }
            });
        }
      };

      pump();
      settleIfComplete();
    });

    return this.runningPromise;
  }

  private dispatchEvent(
    type: PromisePoolEventType,
    data: { error?: unknown; promise: Promise<unknown>; result?: unknown }
  ) {
    const event = {
      type,
      data,
      target: this,
    };

    for (const listener of this.listeners[type]) {
      listener(event);
    }
  }
}

export default PromisePool;
