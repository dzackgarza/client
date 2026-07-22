import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import classnames from 'classnames';

import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  /**
   * The selection with rendered math recovered, produced once at intake and stored server-side
   * (h's AnnotationNormalized), joined into the annotation. This is the only text this
   * component will display; it is identical to the captured quote when the selection spans
   * no math.
   */
  normalizedQuote?: string;
  normalizationError?: {
    code: string;
    description: string;
    retryable: boolean;
  };
  isHovered?: boolean;
  isOrphan?: boolean;
  settings: SidebarSettings;
};

/**
 * Display the selected text of an annotation.
 *
 * The math in a selection is recovered once, at intake, and stored (see the enrichment worker and
 * h's AnnotationNormalized); this component simply renders that stored quote. It runs no
 * recovery of its own — normalization never re-fires on viewing or editing an annotation — and the
 * annotation's anchoring selectors are never involved in what is shown.
 */
function AnnotationQuote({
  normalizedQuote,
  normalizationError,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  // A quote-bearing annotation without a normalized quote is a broken response, not a
  // display choice: the raw TextQuoteSelector capture is never rendered as the quote
  // (hypothesis-review#7). The backend normally supplies `normalization_error` itself;
  // this branch also covers a payload that carries neither field.
  if (normalizationError || !normalizedQuote) {
    return (
      <p
        className="border-l-4 border-l-red-error bg-red-light px-3 py-2 text-sm text-red-dark"
        role="alert"
      >
        {normalizationError?.description ??
          'This annotation has no server-normalized quote to display.'}
      </p>
    );
  }

  const displayed = normalizedQuote;
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
