import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import { Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useState } from 'preact/hooks';

import type { SidebarSettings } from '../../../types/config';
import { cleanMathQuote, hasGarbledMath } from '../../helpers/math-quote';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  quote: string;
  /** URL of the annotated document, used to recover LaTeX for math quotes. */
  uri?: string;
  isHovered?: boolean;
  isOrphan?: boolean;
  settings: SidebarSettings;
};

/**
 * Display the selected text from the document associated with an annotation.
 *
 * When the selection spans rendered math, its captured text is a garbled concatenation of
 * the page's `<math>` layers. We recover the LaTeX from the page and render it (KaTeX),
 * showing a spinner while converting. The annotation's anchoring selectors are untouched,
 * so this only changes what is displayed.
 */
function AnnotationQuote({
  quote,
  uri,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  const needsMath = hasGarbledMath(quote);
  const [mathQuote, setMathQuote] = useState<string | null>(null);
  const [converting, setConverting] = useState(needsMath && !!uri);

  useEffect(() => {
    if (!needsMath || !uri) {
      return () => {};
    }
    let cancelled = false;
    setConverting(true);
    cleanMathQuote(uri, quote)
      .then(clean => {
        if (!cancelled) {
          setMathQuote(clean);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setConverting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsMath, uri, quote]);

  return (
    <InlineControlExcerpt collapsedHeight={35} overflowThreshold={20}>
      <StyledText classes={classnames({ 'p-redacted-text': isOrphan })}>
        <blockquote
          className={classnames('hover:border-l-blue-quote', {
            'border-l-blue-quote': isHovered,
          })}
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          {converting ? (
            <span className="flex items-center gap-x-2 text-color-text-light">
              <Spinner size="sm" />
              rendering math…
            </span>
          ) : mathQuote !== null ? (
            <MarkdownView markdown={mathQuote} mentionMode="username" />
          ) : (
            quote
          )}
        </blockquote>
      </StyledText>
    </InlineControlExcerpt>
  );
}

export default withServices(AnnotationQuote, ['settings']);
