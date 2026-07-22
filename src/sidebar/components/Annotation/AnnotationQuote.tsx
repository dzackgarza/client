import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import classnames from 'classnames';

import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  /**
   * The live captured selection of a draft that has not been saved yet. A draft has no
   * server response, so the server-normalization contract below does not apply to it:
   * the reader composes against the raw selection while the real document shows the
   * formatted math.
   */
  draftQuote?: string;
  /**
   * The selection with rendered math recovered, produced once at intake and stored server-side
   * (h's AnnotationNormalized), joined into the annotation. This is the only text this
   * component will display for a saved annotation; it is identical to the captured quote
   * when the selection spans no math.
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
  draftQuote,
  normalizedQuote,
  normalizationError,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  // A *saved* quote-bearing annotation without a normalized quote is a broken response,
  // not a display choice: the raw TextQuoteSelector capture is never rendered as the
  // quote of a stored annotation (hypothesis-review#7). The backend normally supplies
  // `normalization_error` itself; this branch also covers a payload that carries
  // neither field. An unsaved draft has no server response yet and shows its live
  // captured selection instead.
  if (draftQuote === undefined && (normalizationError || !normalizedQuote)) {
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

  const displayed = draftQuote ?? normalizedQuote ?? '';
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
