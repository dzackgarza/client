/**
 * The toolbar's half of the review-session contract with the browser extension.
 *
 * A review session is a window opened by `annotate wait`: notes written while it is open
 * are delivered to the agent when the browser closes it. The service that owns it listens
 * on loopback, which this page cannot reach -- so the extension injects a relay, and this
 * module talks to that relay over DOM events.
 *
 * The event names are restated here rather than imported, because the extension is a
 * different repository; its half lives in `src/review-events.js`. Each side declares them
 * once.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';

const BRIDGE_READY_EVENT = 'hypothesis:review-bridge-ready';
const BRIDGE_GONE_EVENT = 'hypothesis:review-bridge-gone';
const SEND_EVENT = 'hypothesis:review-send';
const RESULT_EVENT = 'hypothesis:review-result';
const STATUS_REQUEST_EVENT = 'hypothesis:review-status-request';
const STATUS_EVENT = 'hypothesis:review-status';

/** How often the toolbar asks the relay what the session is doing. */
export const STATUS_INTERVAL = 5000;

export type ReviewSession = {
  /** Whether the extension's relay is present. Without it there is no transport. */
  available: boolean;
  /** Whether a review session is currently listening on loopback. */
  listening: boolean;
  /** How many annotations that session would deliver if closed now. */
  queued: number;
  /** Close the session, delivering the batch. Resolves to the relay's answer. */
  send: () => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Track the review session, and offer a way to close it.
 *
 * Polls rather than subscribes because the thing being watched is a local process that
 * starts and stops outside the browser entirely: there is nothing to subscribe to, and a
 * count that only refreshed on click would tell the reader nothing before they act.
 */
export function useReviewSession(
  window_: Window = window,
  interval: number = STATUS_INTERVAL,
): ReviewSession {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const onReady = () => setAvailable(true);
    const onGone = () => {
      setAvailable(false);
      setListening(false);
    };
    const onStatus = (event: Event) => {
      const { listening: isListening, queued: count } =
        (event as CustomEvent).detail ?? {};
      // An answer at all proves the relay is there, whether or not a session is
      // listening -- which is the difference between hiding the control and showing it
      // with the reason it cannot be used.
      setAvailable(true);
      setListening(Boolean(isListening));
      setQueued(typeof count === 'number' ? count : 0);
    };

    window_.addEventListener(BRIDGE_READY_EVENT, onReady);
    window_.addEventListener(BRIDGE_GONE_EVENT, onGone);
    window_.addEventListener(STATUS_EVENT, onStatus);

    // The relay may have announced itself before this mounted -- it is injected when the
    // tab activates, and the sidebar loads afterwards. Asking immediately settles that:
    // an answer means it is there.
    const ask = () => window_.dispatchEvent(new CustomEvent(STATUS_REQUEST_EVENT));
    ask();
    const timer = setInterval(ask, interval);

    return () => {
      clearInterval(timer);
      window_.removeEventListener(BRIDGE_READY_EVENT, onReady);
      window_.removeEventListener(BRIDGE_GONE_EVENT, onGone);
      window_.removeEventListener(STATUS_EVENT, onStatus);
    };
  }, [window_, interval]);

  const send = useCallback(
    () =>
      new Promise<{ ok: boolean; error?: string }>(resolve => {
        const onResult = (event: Event) => {
          window_.removeEventListener(RESULT_EVENT, onResult);
          resolve((event as CustomEvent).detail ?? { ok: false });
        };
        window_.addEventListener(RESULT_EVENT, onResult);
        window_.dispatchEvent(new CustomEvent(SEND_EVENT));
      }),
    [window_],
  );

  return { available, listening, queued, send };
}
