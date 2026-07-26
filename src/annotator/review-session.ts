/**
 * The toolbar's half of the agent-queue contract with the browser extension.
 *
 * The extension owns the authenticated tag writes. This module owns only the visible
 * toggle state and the DOM-event transport to that extension boundary.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';

const BRIDGE_READY_EVENT = 'hypothesis:review-bridge-ready';
const BRIDGE_GONE_EVENT = 'hypothesis:review-bridge-gone';
const TOGGLE_EVENT = 'hypothesis:agent-queue-toggle';
const RESULT_EVENT = 'hypothesis:agent-queue-result';
const STATUS_REQUEST_EVENT = 'hypothesis:agent-queue-status-request';
const STATUS_EVENT = 'hypothesis:agent-queue-status';

/** How often the extension reconciles newly-created annotations while enabled. */
export const STATUS_INTERVAL = 5000;

export type AgentQueue = {
  /** Whether the extension relay is present. */
  available: boolean;
  /** Whether bulk positive queue flagging is enabled. */
  enabled: boolean;
  /** Number of annotations currently carrying the active queue flag. */
  queued: number;
  /** Toggle bulk queue flagging. */
  toggle: () => Promise<{
    ok: boolean;
    enabled?: boolean;
    queued?: number;
    error?: string;
  }>;
};

export function useAgentQueue(
  window_: Window = window,
  interval: number = STATUS_INTERVAL,
): AgentQueue {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const applyStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      setAvailable(true);
      setEnabled(detail.enabled === true);
      setQueued(typeof detail.queued === 'number' ? detail.queued : 0);
    };
    const onReady = () => setAvailable(true);
    const onGone = () => {
      setAvailable(false);
      setEnabled(false);
      setQueued(0);
    };

    window_.addEventListener(BRIDGE_READY_EVENT, onReady);
    window_.addEventListener(BRIDGE_GONE_EVENT, onGone);
    window_.addEventListener(STATUS_EVENT, applyStatus);
    window_.addEventListener(RESULT_EVENT, applyStatus);

    const ask = () =>
      window_.dispatchEvent(new CustomEvent(STATUS_REQUEST_EVENT));
    ask();
    const timer = setInterval(ask, interval);

    return () => {
      clearInterval(timer);
      window_.removeEventListener(BRIDGE_READY_EVENT, onReady);
      window_.removeEventListener(BRIDGE_GONE_EVENT, onGone);
      window_.removeEventListener(STATUS_EVENT, applyStatus);
      window_.removeEventListener(RESULT_EVENT, applyStatus);
    };
  }, [window_, interval]);

  const toggle = useCallback(
    () =>
      new Promise<{
        ok: boolean;
        enabled?: boolean;
        queued?: number;
        error?: string;
      }>(resolve => {
        const onResult = (event: Event) => {
          window_.removeEventListener(RESULT_EVENT, onResult);
          resolve((event as CustomEvent).detail ?? { ok: false });
        };
        window_.addEventListener(RESULT_EVENT, onResult);
        window_.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
      }),
    [window_],
  );

  return { available, enabled, queued, toggle };
}
