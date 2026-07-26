import { mount } from '@hypothesis/frontend-testing';
import { page } from '@vitest/browser/context';

import { setAgentQueueEnabled } from '../../agent-queue';
import Toolbar from '../Toolbar';

describe('Toolbar send-to-agent toggle', () => {
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

  beforeEach(() => {
    setAgentQueueEnabled(false);
  });

  it('toggles and glows immediately', async () => {
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    const button = wrapper.find('[data-testid="send-to-agent"]').last();

    assert.notStrictEqual(button.prop('disabled'), true);
    assert.isFalse(button.prop('aria-pressed'));
    button.props().onClick();
    await new Promise(resolve => setTimeout(resolve, 0));
    wrapper.update();

    assert.isTrue(
      wrapper.find('[data-testid="send-to-agent"]').last().prop('aria-pressed'),
    );
    assert.isTrue(wrapper.find('[data-testid="agent-queue-glow"]').exists());
    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/queue-enabled.png',
    });
  });
});
