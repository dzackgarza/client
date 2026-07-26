import { mount } from '@hypothesis/frontend-testing';
import { page } from '@vitest/browser/context';

import Toolbar from '../Toolbar';

/**
 * The send-to-agent control as it actually appears in the toolbar, photographed.
 *
 * The point of moving it out of a floating red box was that it should look like the app's
 * other controls. No assertion can judge that: the toolbar is rendered for real, with the
 * relay's status events driving the button exactly as the extension drives them, and the
 * result is written to `build/scripts/__screenshots__/toolbar/` to be looked at.
 */
describe('Toolbar send-to-agent rendering', () => {
  const toolbarProps = {
    closeSidebar: () => {},
    createAnnotation: () => {},
    toggleHighlights: () => {},
    toggleSidebar: () => {},
    isSidebarOpen: true,
    showHighlights: true,
    newAnnotationType: 'note',
    supportedTools: ['selection'],
  };

  async function shoot(name, detail) {
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    // The status the relay would have pushed. Sent after mount, because the toolbar
    // attaches its listener in an effect.
    await new Promise(resolve => setTimeout(resolve, 20));
    window.dispatchEvent(
      new CustomEvent('hypothesis:agent-queue-status', { detail }),
    );
    await new Promise(resolve => setTimeout(resolve, 20));

    // The DOM re-rendered when the status arrived; the wrapper's snapshot of it did not.
    wrapper.update();

    const toolbar = wrapper.getDOMNode();
    await page.screenshot({
      element: toolbar,
      path: `__screenshots__/toolbar/${name}.png`,
    });
    return wrapper;
  }

  it('photographs the send in flight', async () => {
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    await new Promise(resolve => setTimeout(resolve, 20));
    // A session is listening, and the send has been clicked but not yet answered: the
    // one moment the button is genuinely busy.
    window.dispatchEvent(
      new CustomEvent('hypothesis:agent-queue-status', {
        detail: { enabled: true, queued: 2 },
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 20));
    wrapper.update();
    wrapper.find('[data-testid="send-to-agent"]').last().props().onClick();
    await new Promise(resolve => setTimeout(resolve, 20));
    wrapper.update();

    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/sending.png',
    });
    wrapper.unmount();
  });

  it('shows the control with no relay at all, saying so', async () => {
    // The state that used to render nothing: an indicator that disappears cannot
    // distinguish "not connected" from "no such feature".
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    await new Promise(resolve => setTimeout(resolve, 20));
    wrapper.update();

    const button = wrapper.find('[data-testid="send-to-agent"]').last();
    assert.isTrue(button.exists());
    assert.include(button.prop('title'), 'not connected');
    assert.isFalse(wrapper.find('[data-testid="agent-queue-glow"]').exists());
    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/no-relay.png',
    });
    wrapper.unmount();
  });

  it('shows the control beside the others when queue flagging is enabled', async () => {
    const wrapper = await shoot('queue-enabled', {
      enabled: true,
      queued: 3,
    });

    const button = wrapper.find('[data-testid="send-to-agent"]').last();
    assert.isTrue(button.exists());
    // The queue depth is what the reader checks before closing a session.
    assert.include(button.prop('title'), '3');
    // The live ring, which a still frame cannot catch mid-ping.
    assert.isTrue(wrapper.find('[data-testid="agent-queue-glow"]').exists());
    assert.isTrue(button.prop('aria-pressed'));
    wrapper.unmount();
  });

  it('shows the available control without a glow when flagging is disabled', async () => {
    const wrapper = await shoot('queue-disabled', {
      enabled: false,
      queued: 0,
    });

    const button = wrapper.find('[data-testid="send-to-agent"]').last();
    assert.isTrue(button.exists());
    assert.isFalse(button.prop('aria-pressed'));
    assert.isFalse(wrapper.find('[data-testid="agent-queue-glow"]').exists());
    wrapper.unmount();
  });
});
