/**
 * Recover clean LaTeX from a quote that spans rendered math.
 *
 * When a reviewer selects text over rendered math (arXiv/LaTeXML MathML, KaTeX, MathJax),
 * the browser captures the concatenation of every text layer inside each `<math>` — the
 * presentation glyphs, the embedded TeX, and the accessibility text — producing an
 * unreadable quote. The clean source is already in the page though: as a `<math>`
 * `alttext` attribute or an `<annotation encoding="application/x-tex">`. We fetch the
 * annotated page, map each `<math>`'s garbled `textContent` to its `$…$` LaTeX, and
 * substitute those spans in the quote.
 *
 * This only rewrites what is displayed; the annotation's anchoring selectors are untouched.
 */

// Per-URI cache of {garbled textContent -> "$latex$"} maps, so that N annotations on one
// page trigger a single fetch.
const mathMaps = new Map<string, Promise<Map<string, string>>>();

function extractMathMap(html: string): Map<string, string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const map = new Map<string, string>();
  for (const math of Array.from(doc.querySelectorAll('math'))) {
    const garbled = math.textContent ?? '';
    const tex =
      math.getAttribute('alttext') ??
      math.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
      '';
    if (garbled && tex && !map.has(garbled)) {
      // \(..\) inline delimiters -- Hypothesis's markdown renders those and $$..$$,
      // never single $..$ (which would show as literal text in the sidebar).
      map.set(garbled, `\\(${tex.trim()}\\)`);
    }
  }
  return map;
}

function mathMapFor(uri: string): Promise<Map<string, string>> {
  let map = mathMaps.get(uri);
  if (!map) {
    map = fetch(uri)
      .then(res => res.text())
      .then(extractMathMap);
    mathMaps.set(uri, map);
  }
  return map;
}

/**
 * Heuristic: does this quote likely span rendered math? Looks for Mathematical
 * Alphanumeric Symbols, invisible math operators, or LaTeXML's llamapun accessibility
 * markers — all strong signals of a garbled `<math>` capture, rare in ordinary prose.
 */
export function hasGarbledMath(quote: string): boolean {
  return (
    /[\u{1D400}-\u{1D7FF}⁡-⁤]/u.test(quote) ||
    /start_POST(SUB|SUPER)SCRIPT/.test(quote)
  );
}

/**
 * Replace garbled `<math>` spans in `quote` with their `$…$` LaTeX. Longest matches first,
 * so a formula is never partially rewritten by a shorter sub-span.
 */
export async function cleanMathQuote(uri: string, quote: string): Promise<string> {
  const map = await mathMapFor(uri);
  const entries = Array.from(map.entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );
  let out = quote;
  for (const [garbled, tex] of entries) {
    if (out.includes(garbled)) {
      out = out.split(garbled).join(tex);
    }
  }
  return out;
}

// ponytail: hardcoded local OCR endpoint for the PDF path -- promote to a client config
// field (settings.ocrUrl) once the mechanism is verified.
const OCR_ENDPOINT = 'http://localhost:8901/ocr';

/**
 * Does this PDF quote likely span math? Greek letters and math operators survive a PDF
 * text-layer selection as ordinary Unicode (unlike the Mathematical Alphanumeric block of an
 * HTML `<math>` capture that {@link hasGarbledMath} detects), so they are the PDF signal.
 */
export function pdfHasMath(quote: string): boolean {
  return /[Ͱ-Ͽ∀-⋿⨀-⫿⟰-⟿←-⇿]/u.test(quote);
}

/**
 * Recover clean `\(..\)` LaTeX for a PDF math region by asking the local OCR endpoint. A PDF
 * page has no x-tex layer, so OCR (server-side, holds the Mathpix key) is the only source of
 * clean math; the client posts the region here at render time. Returns `null` when nothing is
 * recovered. The stored annotation is never touched.
 */
export async function ocrMathQuote(req: {
  uri: string;
  pageIndex: number;
  prefix: string;
  suffix: string;
  exact: string;
}): Promise<string | null> {
  const res = await fetch(OCR_ENDPOINT, {
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
