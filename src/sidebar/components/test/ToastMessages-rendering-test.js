import { mount } from '@hypothesis/frontend-testing';
import { page } from '@vitest/browser/context';

import ToastMessages, { $imports } from '../ToastMessages';

/**
 * What the reader actually sees when a save fails, photographed.
 *
 * `ToastMessages-test.js` mocks the child components, so it proves which props this
 * component passes down -- never that the result is legible. The failure it renders is a
 * long one: the server's explanation, the operator-facing technical detail, and a
 * diagnostic id the reader is expected to quote back. Whether that fits, wraps, and
 * leaves its controls reachable is not something an assertion can answer.
 *
 * So nothing is mocked here except the store the messages come from, and the rendered
 * toast is written to `build/scripts/__screenshots__/toasts/` to be opened and judged.
 */
describe('ToastMessages rendering', () => {
  const failure =
    'Saving annotation failed: Network request failed (500): The annotation was ' +
    'not saved because its selected math could not be recovered. Check that the ' +
    'document is reachable, then retry. Technical detail: MATHPIX_API_URL is not ' +
    'set; math recovery cannot run. Diagnostic ID: ' +
    '48d842cc-3164-45e0-928e-9700881eaa95';

  // Only the store is stood in for, to put a message on screen. Every component below
  // -- Callout, the icon buttons, the layout -- is the real one, because how it looks is
  // the whole question.
  beforeEach(() => {
    $imports.$mock({
      '../store': {
        useSidebarStore: () => ({
          getToastMessages: () => [
            { id: 'errorId', type: 'error', message: failure },
          ],
        }),
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders a full save failure with its controls, and photographs it', async () => {
    const toastMessenger = { dismiss: () => {}, success: () => {} };
    // The width the sidebar actually gives it. Judged full-bleed, the message looks
    // comfortable; the question is whether it survives the column it really lives in.
    const wrapper = mount(
      <div style={{ width: '380px', position: 'relative' }}>
        <ToastMessages toastMessenger={toastMessenger} />
      </div>,
      { connected: true },
    );

    const callout = wrapper.find('[data-component="Callout"]').getDOMNode();

    // The whole message survives into the DOM: a failure truncated to fit is a failure
    // the reader cannot act on.
    assert.include(callout.textContent, failure);
    assert.include(callout.textContent, '48d842cc-3164-45e0-928e-9700881eaa95');

    await page.screenshot({
      element: callout,
      path: '__screenshots__/toasts/save-failure.png',
    });

    wrapper.unmount();
  });
});
