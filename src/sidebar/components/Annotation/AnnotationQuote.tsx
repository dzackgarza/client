import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import {
  Button,
  CancelIcon,
  RefreshIcon,
  SpinnerSpokesIcon,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  quote: string;
  /**
   * The selection with rendered math recovered, produced once at intake and stored server-side
   * (h's AnnotationNormalized), joined into the annotation. This is what is displayed; it is the
   * raw quote when the selection spans no math. Absent only for annotations predating enrichment,
   * where the raw quote is shown instead.
   */
  normalizedQuote?: string;
  /**
   * Server-side enrichment status: `pending` shows a spinner (recovery in flight), `failed`
   * shows an error with a retry, `ready`/absent renders the stored quote.
   */
  normalizationStatus?: 'pending' | 'ready' | 'failed';
  /** When `normalizationStatus` is `failed`, the reason (shown as the retry control's tooltip). */
  normalizationError?: string;
  /** Retry a failed normalization. Omitted when the annotation can't be retried. */
  onRetry?: () => void;
  isHovered?: boolean;
  isOrphan?: boolean;
  settings: SidebarSettings;
};

/**
 * Display the selected text of an annotation.
 *
 * The math in a selection is recovered once, at intake, and stored (see the enrichment worker and
 * h's AnnotationNormalized); this component renders that stored quote when it is ready, a spinner
 * while it is pending, and an error with a retry when it failed. It runs no recovery of its own,
 * and the annotation's anchoring selectors are never involved in what is shown.
 */
function AnnotationQuote({
  quote,
  normalizedQuote,
  normalizationStatus,
  normalizationError,
  onRetry,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  if (normalizationStatus === 'pending') {
    return (
      <StyledText>
        <div
          className="flex items-center gap-x-2 text-color-text-light"
          data-testid="normalization-pending"
        >
          <SpinnerSpokesIcon className="animate-spin" />
          <span>Recovering math…</span>
        </div>
      </StyledText>
    );
  }

  if (normalizationStatus === 'failed') {
    return (
      <StyledText>
        <div
          className="flex items-center gap-x-2 text-color-text-light"
          data-testid="normalization-failed"
        >
          <CancelIcon className="text-red-dark" />
          <span title={normalizationError}>Math recovery failed</span>
          {onRetry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRetry}
              title={normalizationError}
              data-testid="normalization-retry"
            >
              <RefreshIcon />
              Retry
            </Button>
          )}
        </div>
      </StyledText>
    );
  }

  const displayed = normalizedQuote ?? quote;
  return (
    <InlineControlExcerpt collapsedHeight={35} overflowThreshold={20}>
      <StyledText classes={classnames({ 'p-redacted-text': isOrphan })}>
        <blockquote
          className={classnames('hover:border-l-blue-quote', {
            'border-l-blue-quote': isHovered,
          })}
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          <MarkdownView markdown={displayed} mentionMode="username" />
        </blockquote>
      </StyledText>
    </InlineControlExcerpt>
  );
}

export default withServices(AnnotationQuote, ['settings']);
