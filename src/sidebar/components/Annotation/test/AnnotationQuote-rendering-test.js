import { mount } from '@hypothesis/frontend-testing';
import { page } from '@vitest/browser/context';

import { ServiceContext } from '../../../service-context';
import AnnotationQuote from '../AnnotationQuote';
import recoveredQuotes from './recovered-quotes.json';

/**
 * What a reader actually sees, for every selection in the backend's corpus.
 *
 * The other tests in this directory mock `MarkdownView`, so they prove which string the
 * component hands the renderer -- never that the renderer turns it into mathematics. This
 * one mocks nothing: the real Markdown/KaTeX renderer runs, and every quote in
 * `recovered-quotes.json` is mounted, asserted on, and photographed.
 *
 * The fixture is not invented. It is the output of h's real extractor over its real fixture
 * pages -- ar5iv, a Pandoc+MathJax post, Mathematics Stack Exchange, MathOverflow, a KaTeX
 * page and one with no mathematics at all -- regenerated in that repository with
 * `just _export-recovered-quotes`.
 *
 * The screenshots are the point of the suite, not a side effect: they are written to
 * `build/scripts/__screenshots__/quotes/` so they can be opened and judged. A rendering
 * that is clipped, mis-sized, or drawn as an error passes every assertion here and fails
 * the moment someone looks -- which is how dzackgarza/h#8 was found.
 */
describe('AnnotationQuote rendering', () => {
  const drags = Object.entries(recoveredQuotes);

  // Nothing here is mocked, so the real component tree mounts and its children ask for
  // real services. They get an injector that answers with empty settings, which is what a
  // sidebar with no host-page configuration has.
  const injector = { get: () => ({}) };

  /** Mount with the real renderer -- nothing is mocked. */
  function renderQuote(quote) {
    return mount(
      <ServiceContext.Provider value={injector}>
        <AnnotationQuote
          quote="the flattened capture the reader never sees"
          isSaved={true}
          isHovered={false}
          isOrphan={false}
          settings={{}}
          normalizedQuote={quote}
        />
      </ServiceContext.Provider>,
      { connected: true },
    );
  }

  drags.forEach(([name, { quote }]) => {
    it(`renders ${name} as mathematics, and photographs it`, async () => {
      const wrapper = renderQuote(quote);
      const blockquote = wrapper.find('blockquote').getDOMNode();

      // A formula that failed to typeset stays on screen as its own source, delimiters
      // and all. That is the difference between reading mathematics and reading TeX.
      assert.notInclude(
        blockquote.textContent,
        '$',
        `${name} still shows TeX delimiters, so the renderer did not typeset it`,
      );
      assert.notInclude(blockquote.textContent, '\\');

      await page.screenshot({
        element: blockquote,
        path: `__screenshots__/quotes/${name}.png`,
      });

      wrapper.unmount();
    });
  });

  it('typesets the mathematics rather than dropping it', () => {
    // The corpus is mostly mathematical. Without this, a renderer that silently discarded
    // every formula would satisfy every "no delimiters survive" assertion above by
    // rendering no mathematics at all.
    const mathematical = drags.filter(([, { quote }]) => quote.includes('$'));
    assert.isAbove(mathematical.length, 10, 'the corpus should be mostly mathematical');

    for (const [name, { quote }] of mathematical) {
      const wrapper = renderQuote(quote);
      // The rendered markup is inserted as HTML, so it exists in the document rather than
      // in the component tree -- ask the DOM. MathJax typesets to SVG through the lite
      // adaptor, so a formula that made it through is drawn, not written.
      const blockquote = wrapper.find('blockquote').getDOMNode();
      assert.isNotNull(
        blockquote.querySelector('svg'),
        `${name} produced no typeset mathematics`,
      );
      wrapper.unmount();
    }
  });

  it('shows a selection with no mathematics exactly as the reader selected it', () => {
    const wrapper = renderQuote(recoveredQuotes.plain_prose.quote);

    assert.include(
      wrapper.find('blockquote').text(),
      'I am a postdoctoral researcher at the National Center for Theoretical Sciences',
    );
    wrapper.unmount();
  });
});
