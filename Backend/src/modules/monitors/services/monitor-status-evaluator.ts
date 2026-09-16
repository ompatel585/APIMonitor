import type { MonitorStatus } from '../entities/monitor.entity';

export type CheckOutcome = {
  succeeded: boolean;
  latencyMs: number;
};

export type ThresholdConfig = {
  consecutiveFailureThreshold: number;
  consecutiveSuccessThreshold: number;
  degradedThresholdMs: number;
};

/**
 * Pure status transition function. `recentResults` must be ordered oldest to
 * newest, most-recent last. A single failed or slow result never flips the
 * status on its own — only a run of `consecutiveResults` in the same
 * direction crosses the configured threshold. This is what suppresses flaps.
 */
export function evaluate(
  current: MonitorStatus,
  recentResults: CheckOutcome[],
  config: ThresholdConfig,
): MonitorStatus {
  if (current === 'PAUSED') {
    return 'PAUSED';
  }

  if (recentResults.length === 0) {
    return current === 'PENDING' ? 'PENDING' : current;
  }

  const latest = recentResults[recentResults.length - 1];
  if (!latest) {
    return current;
  }

  const consecutiveFailures = countConsecutiveFromEnd(recentResults, (r) => !r.succeeded);
  const consecutiveSuccesses = countConsecutiveFromEnd(recentResults, (r) => r.succeeded);

  if (consecutiveFailures >= config.consecutiveFailureThreshold) {
    return 'DOWN';
  }

  if (current === 'DOWN' && consecutiveSuccesses < config.consecutiveSuccessThreshold) {
    return 'DOWN';
  }

  if (consecutiveSuccesses >= config.consecutiveSuccessThreshold || current !== 'DOWN') {
    if (latest.succeeded && latest.latencyMs > config.degradedThresholdMs) {
      return 'DEGRADED';
    }
    if (latest.succeeded) {
      return 'UP';
    }
  }

  return current === 'PENDING' ? 'PENDING' : current;
}

function countConsecutiveFromEnd(results: CheckOutcome[], predicate: (r: CheckOutcome) => boolean): number {
  let count = 0;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const result = results[i];
    if (!result || !predicate(result)) {
      break;
    }
    count += 1;
  }
  return count;
}
