import { MarkdownView } from '@hypothesis/annotation-ui';
import { mount } from '@hypothesis/frontend-testing';

/**
 * Layout regression tests for MathJax SVG output under the production sidebar
 * stylesheet (dzackgarza/client#1).
 *
 * Tailwind's preflight sets `svg { display: block }`; inline MathJax emits an
 * `mjx-container` whose child SVG must stay inline or every inline formula
 * breaks the surrounding sentence onto its own line. These tests render the
 * real MarkdownView (the patched annotation-ui renderer) with the real built
 * stylesheet active and assert on computed layout, not markup.
 */
describe('MathJax layout under the production sidebar stylesheet', () => {
  let styleEl;

  beforeAll(async () => {
    const res = await fetch('/build/styles/sidebar.css');
    assert.isTrue(
      res.ok,
      'production stylesheet must be served to the test page (run the CSS build)',
    );
    styleEl = document.createElement('style');
    styleEl.textContent = await res.text();
    document.head.append(styleEl);
  });

  afterAll(() => {
    styleEl.remove();
  });

  function renderMarkdown(markdown) {
    return mount(<MarkdownView markdown={markdown} mentionMode="username" />, {
      connected: true,
    });
  }

  it('keeps inline math within the surrounding text flow', () => {
    const wrapper = renderMarkdown('before $f(x)=2$ after');
    const para = wrapper.getDOMNode().querySelector('p');
    const svg = para.querySelector('mjx-container svg');
    assert.ok(svg, 'inline MathJax SVG rendered');

    assert.notEqual(
      getComputedStyle(svg).display,
      'block',
      'inline math SVG must not be block-level',
    );
    // "before", the formula, and "after" share one line: the paragraph is a
    // single text line high, not three.
    const lineHeight = parseFloat(getComputedStyle(para).lineHeight);
    assert.isBelow(
      para.getBoundingClientRect().height,
      2 * lineHeight,
      'paragraph with inline math must occupy a single line',
    );
  });

  it('keeps display math block-level', () => {
    const wrapper = renderMarkdown('before\n\n$$f(x)=2$$\n\nafter');
    const root = wrapper.getDOMNode();
    const container = root.querySelector('mjx-container[display="true"]');
    assert.ok(container, 'display MathJax container rendered');
    const svg = container.querySelector('svg');
    assert.equal(
      getComputedStyle(svg).display,
      'block',
      'display math SVG stays block-level',
    );
  });
});
