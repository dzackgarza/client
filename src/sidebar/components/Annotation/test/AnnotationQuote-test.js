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

  it('renders the quote', () => {
    const wrapper = createQuote();
    const quote = wrapper.find('blockquote');
    assert.equal(quote.text(), 'test quote');
  });

  it('renders a spinner while normalization is pending', () => {
    const wrapper = createQuote({ normalizationStatus: 'pending' });

    assert.isTrue(wrapper.exists('[data-testid="normalization-pending"]'));
    assert.isFalse(wrapper.exists('blockquote'));
  });

  it('renders an error with a retry when normalization failed', () => {
    const onRetry = sinon.stub();
    const wrapper = createQuote({
      normalizationStatus: 'failed',
      normalizationError: 'html-normalize failed: fetch failed',
      onRetry,
    });

    assert.isTrue(wrapper.exists('[data-testid="normalization-failed"]'));
    assert.isFalse(wrapper.exists('blockquote'));

    wrapper.find('Button[data-testid="normalization-retry"]').props().onClick();
    assert.calledOnce(onRetry);
  });

  it('omits the retry control when there is no retry handler', () => {
    const wrapper = createQuote({ normalizationStatus: 'failed' });

    assert.isTrue(wrapper.exists('[data-testid="normalization-failed"]'));
    assert.isFalse(wrapper.exists('[data-testid="normalization-retry"]'));
  });

  it('renders the stored quote when normalization is ready', () => {
    const wrapper = createQuote({
      normalizationStatus: 'ready',
      normalizedQuote: 'recovered $x$',
    });

    assert.equal(wrapper.find('blockquote').text(), 'recovered $x$');
  });

  it('applies selectionFontFamily styling from settings', () => {
    fakeApplyTheme
      .withArgs(sinon.match.array.deepEquals(['selectionFontFamily']))
      .returns({ fontFamily: 'monospace' });

    const wrapper = createQuote();

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
