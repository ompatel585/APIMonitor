import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
  requestId: string;
  correlationId: string;
  userId?: string;
  organizationId?: string;
};

export const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContextStorage.getStore();
}

export function runWithRequestContext<T>(store: RequestContextStore, fn: () => T): T {
  return requestContextStorage.run(store, fn);
}
