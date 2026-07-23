import {
  Callout,
  CancelIcon,
  CopyIcon,
  IconButton,
  ToastMessages as BaseToastMessages,
} from '@hypothesis/frontend-shared';
import type { ToastMessage } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import { copyPlainText } from '../util/copy-to-clipboard';

export type ToastMessageProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * An error toast, which the reader has to be able to read and quote back.
 *
 * The shared toast dismisses on a click anywhere in it. That is right for a transient
 * success and wrong here: a failed save carries a diagnostic id, and the gesture for
 * copying it -- pressing into the text to select -- is the same gesture that makes it
 * disappear. So an error keeps its text and gets two explicit affordances instead:
 * copy the whole message, or close it.
 */
function ErrorToastMessage({
  message,
  onDismiss,
  onCopy,
}: {
  message: ToastMessage;
  onDismiss: () => void;
  onCopy: () => void;
}) {
  return (
    <Callout status="error" variant="raised">
      <div className="flex gap-x-2 items-start">
        <div className="grow select-text" data-testid="error-text">
          {message.message}
        </div>
        <IconButton
          icon={CopyIcon}
          onClick={onCopy}
          title="Copy this error"
          size="sm"
        />
        <IconButton
          icon={CancelIcon}
          onClick={onDismiss}
          title="Dismiss this error"
          size="sm"
        />
      </div>
    </Callout>
  );
}

/**
 * Component that renders the active toast messages from the sidebar store
 */
function ToastMessages({ toastMessenger }: ToastMessageProps) {
  const store = useSidebarStore();
  const messages = store.getToastMessages();
  const errors = messages.filter(message => message.type === 'error');
  const transient = messages.filter(message => message.type !== 'error');

  const copyError = async (message: ToastMessage) => {
    // The shared type allows arbitrary content, but every message this sidebar creates
    // is text (`ToastMessengerService` takes a string). Anything else is a mistake to
    // hear about, not to paper over with a stringified object on the clipboard.
    if (typeof message.message !== 'string') {
      throw new TypeError('toast message content is not text');
    }
    await copyPlainText(message.message);
    toastMessenger.success('Error copied to clipboard', {
      visuallyHidden: true,
    });
  };

  return (
    <div
      className={classnames(
        // Ensure toast messages are rendered above other content
        'z-10',
        'absolute left-0 w-full',
      )}
    >
      {errors.map(message => (
        <ErrorToastMessage
          key={message.id}
          message={message}
          onDismiss={() => toastMessenger.dismiss(message.id)}
          onCopy={() => copyError(message)}
        />
      ))}
      <BaseToastMessages
        messages={transient}
        onMessageDismiss={(id: string) => toastMessenger.dismiss(id)}
        transitionClasses={{
          transitionIn:
            'motion-safe:animate-slide-in-from-right lg:animate-fade-in motion-reduce:animate-fade-in',
        }}
      />
    </div>
  );
}

export default withServices(ToastMessages, ['toastMessenger']);
