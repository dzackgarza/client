/**
 * Recover clean LaTeX from a quote that spans rendered math.
 *
 * When a reviewer selects text over rendered math, the browser captures the math's rendered
 * glyph text, not its source. In a Pandoc/Quarto page the math is authored as
 * `<span class="math inline">\(TeX\)</span>` / `<span class="math display">\[TeX\]</span>` and
 * rendered to plain text at load time by MathJax/KaTeX (`\iota_A \colon \mathcal C.A \to \mathcal C`
 * becomes the literal text `ιA:C.A→C`). The clean TeX is therefore gone from the rendered DOM but
 * still present in the page source.
 *
 * We recover it by reconstruction, not substring matching (single-letter math like `\(A\)` would
 * otherwise corrupt prose and even the LaTeX we insert). We fetch the page, re-render each math
 * span's TeX exactly as the page did (KaTeX reproduces MathJax's textContent), and build the page's
 * rendered text alongside a segment map back to each span's TeX. The quote is then located as a
 * substring of that rendered text, and the matched range is re-emitted with prose verbatim and each
 * math span replaced by its `\(TeX\)` / `$$TeX$$` source — the delimiters Hypothesis's markdown
 * renders.
 *
 * This only rewrites what is displayed; the annotation's anchoring selectors are untouched.
 */

import katex from 'katex';

// KaTeX inserts zero-width and thin spacing chars that MathJax (and a reader's selection) do not.
// Strip them uniformly so the reconstructed rendered text matches the stored quote.
const SPACING = /[   ​‌‍⁠﻿]/g;
const strip = (s: string) => s.replace(SPACING, '');

type Segment = {
  /** Start offset in the page's reconstructed rendered text. */
  start: number;
  /** End offset (exclusive). */
  end: number;
  /** For a math span, its `\(TeX\)` / `$$TeX$$` source; absent for prose. */
  math?: string;
};

type PageModel = {
  /** The page's rendered text, as a reader's selection would capture it. */
  rendered: string;
  /** Ordered segments mapping ranges of `rendered` back to prose or math source. */
  segments: Segment[];
};

// Per-URI cache of the reconstructed page model, so N annotations on one page trigger one fetch.
const pageModels = new Map<string, Promise<PageModel | null>>();

/** Strip `\( \)` / `\[ \]` delimiters from a Pandoc math span's text. */
function spanTeX(raw: string): string {
  return raw
    .trim()
    .replace(/^\\[([]/, '')
    .replace(/\\[)\]]$/, '')
    .trim();
}

/** Render `tex` to the plain text the page's own MathJax/KaTeX would produce. */
function renderToText(tex: string, displayMode: boolean, doc: Document): string {
  const holder = doc.createElement('span');
  try {
    holder.innerHTML = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html', // no MathML annotation, so textContent is glyphs only
    });
  } catch {
    return '';
  }
  return strip(holder.textContent ?? '');
}

/**
 * Build the reconstruction model for a page: its rendered text plus a segment map to the math
 * source. Handles Pandoc/Quarto `<span class="math">` and LaTeXML/KaTeX `<math>` (`alttext` or an
 * `x-tex` annotation) markup.
 */
function buildPageModel(html: string): PageModel {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Tag every math element with its rendered text and clean source, then read them off in one walk.
  for (const span of Array.from(doc.querySelectorAll('span.math'))) {
    const display = span.classList.contains('display');
    const tex = spanTeX(span.textContent ?? '');
    span.setAttribute('data-quote-tex', display ? `$$${tex}$$` : `\\(${tex}\\)`);
    span.textContent = renderToText(tex, display, doc);
  }
  for (const math of Array.from(doc.querySelectorAll('math'))) {
    const tex =
      math.getAttribute('alttext') ??
      math.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
      '';
    if (tex) {
      // The rendered text is already this element's textContent; keep it and record the source.
      math.setAttribute('data-quote-tex', `\\(${tex.trim()}\\)`);
    }
  }

  const root = doc.querySelector('main') ?? doc.body;
  let rendered = '';
  const segments: Segment[] = [];

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = strip(child.textContent ?? '');
        segments.push({ start: rendered.length, end: rendered.length + text.length });
        rendered += text;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const math = el.getAttribute('data-quote-tex');
        if (math !== null) {
          const text = strip(el.textContent ?? '');
          segments.push({ start: rendered.length, end: rendered.length + text.length, math });
          rendered += text;
        } else {
          walk(el);
        }
      }
    }
  };
  walk(root);

  return { rendered, segments };
}

function pageModelFor(uri: string): Promise<PageModel | null> {
  let model = pageModels.get(uri);
  if (!model) {
    model = fetch(uri)
      .then(res => res.text())
      .then(buildPageModel)
      .catch(() => null);
    pageModels.set(uri, model);
  }
  return model;
}

/**
 * Heuristic: could this quote span rendered math? Fires on Greek letters, arrows, and math
 * operators (how Pandoc/MathJax math survives a selection) and on the Mathematical Alphanumeric
 * block and llamapun markers of a LaTeXML capture. Pure ASCII prose does not fire, so plain notes
 * never trigger a page fetch.
 */
export function mightSpanMath(quote: string): boolean {
  return (
    /[\u{1D400}-\u{1D7FF}⁡-⁤]/u.test(quote) ||
    /start_POST(SUB|SUPER)SCRIPT/.test(quote) ||
    /[Ͱ-Ͽ℀-⅏←-⇿∀-⋿⟰-⟿⨀-⫿]/u.test(quote)
  );
}

/**
 * Reconstruct the annotated passage with clean LaTeX in place of rendered math. Returns `null` when
 * the quote is not present in the current page or spans no math, so the caller shows the stored
 * quote unchanged. A quote that no longer matches the page is simply an orphan — recovery makes no
 * attempt to re-anchor it; that is the document's own (changed-out-from-under) concern.
 */
export async function cleanMathQuote(uri: string, quote: string): Promise<string | null> {
  const model = await pageModelFor(uri);
  if (!model) {
    return null;
  }
  const needle = strip(quote);
  const at = model.rendered.indexOf(needle);
  if (at < 0) {
    return null;
  }
  const end = at + needle.length;
  let out = '';
  let replaced = false;
  for (const seg of model.segments) {
    if (seg.end <= at || seg.start >= end) {
      continue;
    }
    if (seg.math !== undefined) {
      out += seg.math;
      replaced = true;
    } else {
      out += model.rendered.slice(Math.max(seg.start, at), Math.min(seg.end, end));
    }
  }
  return replaced ? out : null;
}

/**
 * Does this PDF quote likely span math? Greek letters and math operators survive a PDF text-layer
 * selection as ordinary Unicode, so they are the PDF signal (a PDF page has no math markup to
 * reconstruct from — see {@link ocrMathQuote}).
 */
export function pdfHasMath(quote: string): boolean {
  return /[Ͱ-Ͽ∀-⋿⨀-⫿⟰-⟿←-⇿]/u.test(quote);
}

/**
 * Recover clean `\(..\)` LaTeX for a PDF math region by asking the OCR endpoint (`ocrUrl`, from
 * client config). A PDF page has no math markup, so OCR (server-side, holds the Mathpix key) is the
 * only source of clean math; the client posts the region there at render time. Returns `null` when
 * nothing is recovered. The stored annotation is never touched.
 */
export async function ocrMathQuote(
  ocrUrl: string,
  req: {
    uri: string;
    pageIndex: number;
    prefix: string;
    suffix: string;
    exact: string;
  },
): Promise<string | null> {
  const res = await fetch(ocrUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uri: req.uri,
      page_index: req.pageIndex,
      prefix: req.prefix,
      suffix: req.suffix,
      exact: req.exact,
    }),
  });
  const data = (await res.json()) as { latex: string | null };
  return data.latex;
}
