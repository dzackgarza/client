import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import AnnotationQuote, { $imports } from '../AnnotationQuote';

/**
 * Representative pair from the real boundary (see
 * `dev-server/documents/html/frameworkmath.mustache`): `rawCapture` is the flattened
 * text-layer string a browser selection over `Definition 2.4` puts in the annotation's
 * TextQuoteSelector, and `normalizedQuote` is the quote h's normalization service recovers
 * from the page's math source and stores as AnnotationNormalized.
 *
 * They share no substring, so the rendered output identifies unambiguously which of the two
 * the component displayed.
 */
const rawCapture = 'ιA:C.A→C';
const normalizedQuote = '\\(\\iota_A \\colon \\mathcal C.A \\to \\mathcal C\\)';

describe('AnnotationQuote', () => {
  let fakeApplyTheme;

  /**
   * Mount the component the way `Annotation` does: the raw captured selection always
   * reaches it through `quote`, so every render below is a real opportunity for the raw
   * capture to surface.
   */
  function createQuote(props) {
    return mount(
      <AnnotationQuote
        quote={rawCapture}
        isSaved={true}
        isHovered={false}
        isOrphan={false}
        settings={{}}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeApplyTheme = sinon.stub().returns({});

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../helpers/theme': {
        applyTheme: fakeApplyTheme,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('displays the server-normalized quote of a saved annotation, not its raw capture', () => {
    const wrapper = createQuote({ normalizedQuote });

    // The exact text handed to the Markdown/MathJax renderer is what the reader sees.
    assert.equal(
      wrapper.find('MarkdownView').prop('markdown'),
      normalizedQuote,
      'the stored normalized quote is what gets rendered',
    );
    assert.notInclude(wrapper.text(), rawCapture);
  });

  // hypothesis-review#7 contract: a quote-bearing response without normalized_quote must
  // render a normalization error, never the raw TextQuoteSelector capture.
  it('renders an error and never the raw capture when normalized_quote is absent', () => {
    const wrapper = createQuote({});
    assert.isTrue(wrapper.find('[role="alert"]').exists());
    assert.notInclude(wrapper.text(), rawCapture);
  });

  it('renders an error and never the raw capture when normalized_quote is empty', () => {
    // h emits `normalized_quote: ""` for an annotation with no AnnotationNormalized row.
    const wrapper = createQuote({ normalizedQuote: '' });
    assert.isTrue(wrapper.find('[role="alert"]').exists());
    assert.notInclude(wrapper.text(), rawCapture);
  });

  it('renders the live selection of an unsaved draft without an error state', () => {
    // A draft has no server response yet; the reader composes against the raw
    // selection, so the server-normalization contract does not apply to it.
    const wrapper = createQuote({ isSaved: false });
    assert.isFalse(wrapper.find('[role="alert"]').exists());
    assert.equal(wrapper.find('MarkdownView').prop('markdown'), rawCapture);
  });

  it('surfaces the backend diagnostic, not a message of its own, when normalization is missing', () => {
    // The description is a value carried in the API payload, so an implementation that
    // substituted its own generic wording would drop the operator-facing diagnostic.
    const description =
      'This legacy annotation has no normalized quote. Run the normalization ' +
      'reconciliation command and inspect its diagnostic before using the selection.';
    const wrapper = createQuote({
      normalizedQuote: '',
      normalizationError: {
        code: 'math_normalization_missing',
        description,
        retryable: false,
      },
    });

    assert.equal(wrapper.find('[role="alert"]').text(), description);
    assert.notInclude(wrapper.text(), rawCapture);
  });

  it('applies selectionFontFamily styling from settings', () => {
    fakeApplyTheme
      .withArgs(sinon.match.array.deepEquals(['selectionFontFamily']))
      .returns({ fontFamily: 'monospace' });

    const wrapper = createQuote({ normalizedQuote: 'styled quote' });

    const quote = wrapper.find('blockquote');

    assert.equal(quote.getDOMNode().style.fontFamily, 'monospace');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      // A math-free normalized quote: the accessibility of MathJax's emitted SVG is owned
      // by the renderer, not by this component's markup.
      content: () => createQuote({ normalizedQuote: 'a normalized selection' }),
    }),
  );
});
