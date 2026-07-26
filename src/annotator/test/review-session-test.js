import { render } from 'preact';

import { useAgentQueue } from '../review-session';

/**
 * The toolbar's side of the contract with the extension's relay, exercised over the real
 * event bus.
 *
 * Nothing is stood in for: the events dispatched here are the events the relay dispatches
 * (`src/review-events.js` in the browser-extension repo), and what is asserted is what the
 * toolbar would then show and send. A stand-in for the relay would prove only that this
 * module calls the stand-in.
 */
describe('annotator/review-session', () => {
  let container;
  let seen;
  let listeners;

  /** Let preact flush the state change the dispatched event caused. */
  const flush = () => new Promise(resolve => setTimeout(resolve, 20));

  /** Add a listener that is removed after the test, so cases cannot answer each other. */
  function listen(type, handler) {
    listeners.push([type, handler]);
    window.addEventListener(type, handler);
  }

  /** Render a probe that records the session state on every update. */
  function mountProbe(interval = 10000) {
    function Probe() {
      seen.push(useAgentQueue(window, interval));
      return null;
    }
    render(<Probe />, container);
    return () => seen[seen.length - 1];
  }

  const dispatch = (type, detail) =>
    window.dispatchEvent(new CustomEvent(type, { detail }));

  beforeEach(() => {
    seen = [];
    listeners = [];
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    listeners.forEach(([type, handler]) =>
      window.removeEventListener(type, handler),
    );
    render(null, container);
    container.remove();
  });

  it('offers nothing until a relay answers', () => {
    const state = mountProbe();

    // No extension: the page dispatched its status request into the void.
    assert.isFalse(state().available);
    assert.isFalse(state().enabled);
  });

  it('reports the queue depth the relay last reported', async () => {
    const state = mountProbe();
    await flush(); // the hook attaches its listeners in an effect, after the first render

    dispatch('hypothesis:agent-queue-status', { enabled: true, queued: 3 });
    await flush();

    assert.isTrue(state().available);
    assert.isTrue(state().enabled);
    assert.equal(state().queued, 3);
  });

  it('reports disabled flagging without hiding the relay', async () => {
    const state = mountProbe();
    await flush();

    dispatch('hypothesis:agent-queue-status', { enabled: false, queued: 0 });
    await flush();

    // The distinction the toolbar renders: the control is offered, and says why it
    // cannot be used, rather than vanishing or failing on click.
    assert.isTrue(state().available);
    assert.isFalse(state().enabled);
    assert.equal(state().queued, 0);
  });

  it('stops offering the control when the relay goes away', async () => {
    const state = mountProbe();
    await flush();
    dispatch('hypothesis:agent-queue-status', { enabled: true, queued: 1 });
    await flush();

    dispatch('hypothesis:review-bridge-gone');
    await flush();

    assert.isFalse(state().available);
    assert.isFalse(state().enabled);
    assert.equal(state().queued, 0);
  });

  it('asks again on its own interval, so a session that starts is noticed', async () => {
    let asks = 0;
    const count = () => (asks += 1);
    listen('hypothesis:agent-queue-status-request', count);
    mountProbe(20);
    await new Promise(resolve => setTimeout(resolve, 70));

    // One on mount plus the interval's own: a reader who starts `annotate wait` after
    // opening the page must not have to reload it.
    assert.isAbove(asks, 2);
  });

  it('resolves a toggle with the relay’s queue state', async () => {
    const state = mountProbe();
    await flush();
    listen('hypothesis:agent-queue-toggle', () =>
      dispatch('hypothesis:agent-queue-result', {
        ok: true,
        enabled: true,
        queued: 4,
      }),
    );

    const result = await state().toggle();

    assert.deepEqual(result, { ok: true, enabled: true, queued: 4 });
  });

  it('resolves a failed toggle with the reason, rather than hanging', async () => {
    const state = mountProbe();
    await flush();
    listen('hypothesis:agent-queue-toggle', () =>
      dispatch('hypothesis:agent-queue-result', {
        ok: false,
        error: 'The extension build has no queue credentials.',
      }),
    );

    const result = await state().toggle();

    assert.isFalse(result.ok);
    assert.isTrue(result.error.length > 0);
  });
});
