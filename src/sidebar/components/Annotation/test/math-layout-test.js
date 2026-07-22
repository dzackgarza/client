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

  /** Laid-out box of a text node, so the formula can be located relative to its words. */
  function textBox(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect();
  }

  it('lays inline math out as inline content between the words around it', () => {
    const wrapper = renderMarkdown('before $f(x)=2$ after');
    const para = wrapper.getDOMNode().querySelector('p');
    const [beforeText, container, afterText] = para.childNodes;
    const svg = container.querySelector('svg');

    // The property the requirement demands, stated positively: any other value —
    // `block` (the preflight regression) or an invisible one — is a failure.
    assert.equal(getComputedStyle(svg).display, 'inline');

    // Observable consequence: the formula's box occupies the horizontal gap between
    // "before" and "after" on the same line. A formula that is not laid out at all has
    // a degenerate box that cannot separate the two words, and a block-level one pushes
    // "after" back to the paragraph's left edge on a later line.
    const beforeBox = textBox(beforeText);
    const svgBox = svg.getBoundingClientRect();
    const afterBox = textBox(afterText);

    assert.isAtLeast(
      svgBox.left,
      beforeBox.right - 0.5,
      'the formula starts where the preceding word ends',
    );
    assert.isAtLeast(
      afterBox.left,
      svgBox.right - 0.5,
      'the following word starts where the formula ends',
    );
    assert.isAbove(
      svgBox.width,
      0,
      'the formula occupies horizontal space in the line',
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
    const svg = container.querySelector('svg');
    assert.equal(
      getComputedStyle(svg).display,
      'block',
      'display math SVG stays block-level',
    );
    assert.isAbove(
      svg.getBoundingClientRect().width,
      0,
      'the display formula occupies space on its own line',
    );
  });
});
