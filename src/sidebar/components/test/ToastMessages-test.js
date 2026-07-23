import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import ToastMessages, { $imports } from '../ToastMessages';

describe('ToastMessages', () => {
  let fakeStore;
  let fakeToastMessenger;
  let fakeCopyToClipboard;

  const fakeMessage = (id = 'someId') => ({
    id,
    type: 'notice',
    message: 'you should know...',
    isDismissed: false,
    moreInfoURL: 'http://www.example.com',
  });

  function createComponent(props) {
    return mount(
      <ToastMessages toastMessenger={fakeToastMessenger} {...props} />,
    );
  }

  beforeEach(() => {
    fakeStore = {
      getToastMessages: sinon.stub(),
    };

    fakeToastMessenger = {
      dismiss: sinon.stub(),
      success: sinon.stub(),
    };

    fakeCopyToClipboard = {
      copyPlainText: sinon.stub().resolves(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render all messages returned by the store', () => {
    fakeStore.getToastMessages.returns([
      fakeMessage('someId1'),
      fakeMessage('someId2'),
      fakeMessage('someId3'),
    ]);

    const wrapper = createComponent();

    assert.lengthOf(wrapper.find('[messages]').prop('messages'), 3);
  });

  it('should dismiss the message when clicked', () => {
    fakeStore.getToastMessages.returns([fakeMessage()]);

    const wrapper = createComponent();
    const messageContainer = wrapper.find('[onMessageDismiss]');

    messageContainer.prop('onMessageDismiss')();

    assert.calledOnce(fakeToastMessenger.dismiss);
  });

  describe('error messages', () => {
    // A failed save carries a diagnostic id the reader has to be able to quote back, so
    // an error is not one of the transient messages: it renders with its own controls,
    // and pressing into its text -- the gesture for selecting the id -- must not be the
    // gesture that destroys it.
    const failure =
      'Saving annotation failed: the selected math could not be recovered. ' +
      'Diagnostic ID: 48d842cc-3164-45e0-928e-9700881eaa95';

    const errorMessage = () => ({
      id: 'errorId',
      type: 'error',
      message: failure,
      isDismissed: false,
    });

    beforeEach(() => {
      // Rendered for real: what is being proven is what the reader can do with the
      // element, which a stand-in component cannot answer.
      $imports.$restore();
      $imports.$mock({
        '../store': { useSidebarStore: () => fakeStore },
        '../util/copy-to-clipboard': fakeCopyToClipboard,
      });
    });

    it('keeps the error when its text is clicked', () => {
      fakeStore.getToastMessages.returns([errorMessage()]);
      const wrapper = createComponent();

      wrapper.find('[data-testid="error-text"]').simulate('click');

      assert.notCalled(fakeToastMessenger.dismiss);
      assert.include(wrapper.text(), 'Diagnostic ID');
    });

    it('copies the whole message, diagnostic id included', () => {
      fakeStore.getToastMessages.returns([errorMessage()]);
      const wrapper = createComponent();

      wrapper.find('button[title="Copy this error"]').simulate('click');

      assert.calledWith(fakeCopyToClipboard.copyPlainText, failure);
    });

    it('dismisses only through its own close control', () => {
      fakeStore.getToastMessages.returns([errorMessage()]);
      const wrapper = createComponent();

      wrapper.find('button[title="Dismiss this error"]').simulate('click');

      assert.calledWith(fakeToastMessenger.dismiss, 'errorId');
    });
  });
});
