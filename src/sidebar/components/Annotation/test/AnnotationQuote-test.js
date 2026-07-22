import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import AnnotationQuote, { $imports } from '../AnnotationQuote';

describe('AnnotationQuote', () => {
  let fakeApplyTheme;

  function createQuote(props) {
    return mount(
      <AnnotationQuote
        quote={'test quote'}
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

  it('renders the server-normalized quote', () => {
    const wrapper = createQuote({ normalizedQuote: 'the normalized quote' });
    const quote = wrapper.find('blockquote');
    assert.equal(quote.text(), 'the normalized quote');
  });

  // hypothesis-review#7 contract: a quote-bearing response without normalized_quote must
  // render a normalization error, never the raw TextQuoteSelector capture.
  it('renders an error and never the raw capture when normalized_quote is absent', () => {
    const wrapper = createQuote({});
    assert.isTrue(wrapper.find('[role="alert"]').exists());
    assert.notInclude(wrapper.text(), 'test quote');
  });

  it('renders an error and never the raw capture when normalized_quote is empty', () => {
    const wrapper = createQuote({ normalizedQuote: '' });
    assert.isTrue(wrapper.find('[role="alert"]').exists());
    assert.notInclude(wrapper.text(), 'test quote');
  });

  it('shows the backend description and never the raw quote when normalization is missing', () => {
    const wrapper = createQuote({
      normalizedQuote: '',
      normalizationError: {
        code: 'math_normalization_missing',
        description: 'This annotation has no normalized quote.',
        retryable: false,
      },
    });

    assert.equal(
      wrapper.find('[role="alert"]').text(),
      'This annotation has no normalized quote.',
    );
    assert.notInclude(wrapper.text(), 'test quote');
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
      content: () => createQuote(),
    }),
  );
});
