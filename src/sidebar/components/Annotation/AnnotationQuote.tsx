import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
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
  quote,
  normalizedQuote,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
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
