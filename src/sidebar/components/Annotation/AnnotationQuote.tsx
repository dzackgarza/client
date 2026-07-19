import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
import { Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useState } from 'preact/hooks';

import type { SidebarSettings } from '../../../types/config';
import {
  cleanMathQuote,
  mightSpanMath,
  ocrMathQuote,
  pdfHasMath,
} from '../../helpers/math-quote';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import InlineControlExcerpt from '../InlineControlExcerpt';

type AnnotationQuoteProps = {
  quote: string;
  /**
   * The selection with math recovered, produced at intake and stored server-side (h's
   * AnnotationNormalized), joined into the annotation. When present and different from the raw
   * `quote`, it is rendered directly — no display-time recovery. Absent/equal to `quote` for
   * annotations not yet enriched (e.g. HTML, still reconstructed on the client below).
   */
  normalizedQuote?: string;
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
  normalizedQuote,
  uri,
  pdfRegion,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  // Preferred path: the intake-time normalized quote, stored server-side and joined into the
  // annotation. When it carries recovered math (differs from the raw capture) it is rendered
  // directly, with no display-time work. Only when it is absent (annotation not yet enriched) does
  // the client fall back to reconstructing from the live document below.
  const stored =
    normalizedQuote && normalizedQuote !== quote ? normalizedQuote : null;

  // Math recovery consults the live document (its `<span class="math">` source or, for PDFs, the
  // OCR endpoint) to render the quote's math. That is only sound for an annotation Hypothesis has
  // anchored to *this* version of the page. An orphan was made on a previous version — Hypothesis
  // already flags it as such; recovery must not go re-matching it against the changed page (it would
  // silently degrade or, worse, reconstruct from a different occurrence). Leave orphans untouched.
  // A PDF annotation (identified by its page-anchored region) has no math markup to read, so it
  // takes the OCR path; an HTML annotation reconstructs from the page's math-span source. These are
  // mutually exclusive by document type — never let the HTML detector, which also fires on bare math
  // operators, shadow the PDF path.
  const ocrUrl = settings.ocrUrl;
  const isPdf = !!pdfRegion;
  const needsHtmlMath = !stored && !isOrphan && !isPdf && mightSpanMath(quote);
  const needsPdfMath =
    !stored && !isOrphan && isPdf && !!uri && !!ocrUrl && pdfHasMath(quote);
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
          {stored !== null ? (
            <MarkdownView markdown={stored} mentionMode="username" />
          ) : converting ? (
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
