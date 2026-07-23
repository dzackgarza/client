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
      new CustomEvent('hypothesis:review-status', { detail }),
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

  it('shows the control with no relay at all, saying so', async () => {
    // The state that used to render nothing: an indicator that disappears cannot
    // distinguish "not connected" from "no such feature".
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    await new Promise(resolve => setTimeout(resolve, 20));
    wrapper.update();

    const button = wrapper.find('[data-testid="send-to-agent"]').last();
    assert.isTrue(button.exists());
    assert.include(button.prop('title'), 'not connected');
    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/no-relay.png',
    });
    wrapper.unmount();
  });

  it('shows the control beside the others when a session is listening', async () => {
    const wrapper = await shoot('session-listening', {
      listening: true,
      queued: 3,
    });

    const button = wrapper.find('[data-testid="send-to-agent"]').last();
    assert.isTrue(button.exists());
    // The queue depth is what the reader checks before closing a session, and it is on
    // screen rather than in a tooltip.
    assert.include(button.prop('title'), '3');
    assert.equal(wrapper.find('[data-testid="agent-status"]').last().text(), '3');
    wrapper.unmount();
  });

  it('shows the control disabled, with the reason, when no session is listening',
    async () => {
      const wrapper = await shoot('no-session', { listening: false });

      const button = wrapper.find('[data-testid="send-to-agent"]').last();
      assert.isTrue(button.exists());
      assert.include(button.prop('title'), 'annotate wait');
      wrapper.unmount();
    });
});
