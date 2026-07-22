import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import classnames from 'classnames';

import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  /**
   * The annotation's raw captured selection — the `exact` field of its TextQuoteSelector,
   * which for a selection spanning math is the flattened text-layer capture rather than the
   * mathematics the reader selected.
   *
   * This component receives it because it owns the decision of when it may be shown: it is
   * the live selection of an unsaved draft, and it is never the quote of a saved annotation
   * (hypothesis-review#7).
   */
  quote: string;
  /**
   * Whether the annotation has a server response yet. A draft does not, so the
   * server-normalization contract does not apply to it: the reader composes against the
   * live captured selection while the real document shows the formatted math.
   */
  isSaved: boolean;
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

type QuoteBodyProps = {
  text: string;
  isHovered?: boolean;
  isOrphan?: boolean;
  settings: SidebarSettings;
};

function QuoteBody({ text, isHovered, isOrphan, settings }: QuoteBodyProps) {
  return (
    <InlineControlExcerpt collapsedHeight={35} overflowThreshold={20}>
      <StyledText classes={classnames({ 'p-redacted-text': isOrphan })}>
        <blockquote
          className={classnames('hover:border-l-blue-quote', {
            'border-l-blue-quote': isHovered,
          })}
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          <MarkdownView markdown={text} mentionMode="username" />
        </blockquote>
      </StyledText>
    </InlineControlExcerpt>
  );
}

/**
 * Display the selected text of an annotation.
 *
 * The math in a selection is recovered once, at intake, by h's normalization service and
 * stored as AnnotationNormalized; this component simply renders that stored quote. It runs
 * no recovery of its own — normalization never re-fires on viewing or editing an
 * annotation — and for a saved annotation the raw capture it is handed is never displayed.
 */
function AnnotationQuote({
  quote,
  isSaved,
  normalizedQuote,
  normalizationError,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  if (!isSaved) {
    // An unsaved draft has no server response yet, so its live captured selection is what
    // the reader is composing against and what is shown.
    return (
      <QuoteBody
        text={quote}
        isHovered={isHovered}
        isOrphan={isOrphan}
        settings={settings}
      />
    );
  }

  // A *saved* quote-bearing annotation without a normalized quote is a broken response,
  // not a display choice: the raw TextQuoteSelector capture is never rendered as the
  // quote of a stored annotation (hypothesis-review#7). The backend normally supplies
  // `normalization_error` itself; this branch also covers a payload that carries
  // neither field.
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

  return (
    <QuoteBody
      text={normalizedQuote}
      isHovered={isHovered}
      isOrphan={isOrphan}
      settings={settings}
    />
  );
}

export default withServices(AnnotationQuote, ['settings']);
