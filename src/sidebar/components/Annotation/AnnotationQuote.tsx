import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import { Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useState } from 'preact/hooks';

import type { SidebarSettings } from '../../../types/config';
import {
  cleanMathQuote,
  hasGarbledMath,
  ocrMathQuote,
  pdfHasMath,
} from '../../helpers/math-quote';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  quote: string;
  /** URL of the annotated document, used to recover LaTeX for math quotes. */
  uri?: string;
  /**
   * Page + surrounding prose for a PDF annotation, used to OCR a math quote's region at
   * display time. `null`/absent for HTML annotations (which recover from the page's x-tex).
   */
  pdfRegion?: { pageIndex: number; prefix: string; suffix: string } | null;
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
  pdfRegion,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  // HTML math recovers from the page's x-tex layer; PDF math has no such layer and is OCR'd
  // via the configured endpoint. Both only change what is displayed, never the annotation.
  const ocrUrl = settings.ocrUrl;
  const needsHtmlMath = hasGarbledMath(quote);
  const needsPdfMath =
    !needsHtmlMath && !!uri && !!pdfRegion && !!ocrUrl && pdfHasMath(quote);
  const [mathQuote, setMathQuote] = useState<string | null>(null);
  const [converting, setConverting] = useState(
    (needsHtmlMath && !!uri) || needsPdfMath,
  );

  useEffect(() => {
    if (!uri) {
      return () => {};
    }
    let cancelled = false;
    let recovered: Promise<string | null>;
    if (needsHtmlMath) {
      recovered = cleanMathQuote(uri, quote);
    } else if (needsPdfMath && pdfRegion && ocrUrl) {
      recovered = ocrMathQuote(ocrUrl, { uri, ...pdfRegion, exact: quote });
    } else {
      return () => {};
    }
    setConverting(true);
    recovered
      .then(clean => {
        if (!cancelled && clean !== null) {
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
  }, [
    needsHtmlMath,
    needsPdfMath,
    ocrUrl,
    uri,
    quote,
    pdfRegion?.pageIndex,
    pdfRegion?.prefix,
    pdfRegion?.suffix,
  ]);

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
