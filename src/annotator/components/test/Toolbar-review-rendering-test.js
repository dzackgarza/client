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

  it('shows distinct off and on states when toggled', async () => {
    const wrapper = mount(<Toolbar {...toolbarProps} />, { connected: true });
    const button = wrapper.find('[data-testid="send-to-agent"]').last();

    assert.notStrictEqual(button.prop('disabled'), true);
    assert.isFalse(button.prop('aria-pressed'));
    assert.equal(
      button.prop('title'),
      'Automatically queue new annotations for the agent: off',
    );
    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/queue-disabled.png',
    });

    button.props().onClick();
    await new Promise(resolve => setTimeout(resolve, 0));
    wrapper.update();

    const enabledButton = wrapper
      .find('[data-testid="send-to-agent"]')
      .last();
    assert.isTrue(enabledButton.prop('aria-pressed'));
    assert.equal(
      enabledButton.prop('title'),
      'Automatically queue new annotations for the agent: on',
    );
    assert.isTrue(wrapper.find('[data-testid="agent-queue-glow"]').exists());
    await page.screenshot({
      element: wrapper.getDOMNode(),
      path: '__screenshots__/toolbar/queue-enabled.png',
    });
  });
});
