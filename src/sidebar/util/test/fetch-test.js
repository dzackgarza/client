import { FetchError, fetchJSON } from '../fetch';

describe('sidebar/util/fetch', () => {
  describe('fetchJSON', () => {
    let fakeResponse;

    beforeEach(() => {
      fakeResponse = {
        status: 200,
        json: sinon.stub().resolves({}),
        get ok() {
          return this.status >= 200 && this.status <= 299;
        },
      };
      sinon.stub(window, 'fetch').resolves(fakeResponse);
      window.fetch.resolves(fakeResponse);
    });

    afterEach(() => {
      window.fetch.restore();
    });

    it('fetches the requested URL', async () => {
      const init = { method: 'GET' };
      await fetchJSON('https://example.com', init);
      assert.calledWith(window.fetch, 'https://example.com', init);
    });

    it('throws a FetchError if `fetch` fails', async () => {
      window.fetch.rejects(new Error('Fetch failed'));

      const err = await fetchJSON('https://example.com').then(
        () => assert.fail('fetchJSON should have rejected'),
        e => e,
      );

      assert.instanceOf(err, FetchError);
      assert.equal(err.url, 'https://example.com');
      assert.equal(err.response, null);
      assert.include(err.message, 'Network request failed: Fetch failed');
    });

    it('returns null if the response succeeds with a 204 status', async () => {
      fakeResponse.status = 204;
      const result = await fetchJSON('https://example.com');
      assert.strictEqual(result, null);
    });

    it('throws a FetchError if parsing JSON response fails', async () => {
      fakeResponse.json.rejects(new Error('Oh no'));
      const err = await fetchJSON('https://example.com').then(
        () => assert.fail('fetchJSON should have rejected'),
        e => e,
      );
      assert.instanceOf(err, FetchError);
      assert.equal(err.url, 'https://example.com');
      assert.equal(err.response, fakeResponse);
      assert.equal(
        err.message,
        'Network request failed (200): Failed to parse response',
      );
    });

    it('throws a FetchError if the response has a non-2xx status code', async () => {
      fakeResponse.status = 404;
      fakeResponse.json.resolves({ reason: 'Thing not found' });
      let err;
      try {
        err = await fetchJSON('https://example.com');
      } catch (e) {
        err = e;
      }
      assert.instanceOf(err, FetchError);
      assert.equal(err.url, 'https://example.com');
      assert.equal(err.response, fakeResponse);
      assert.equal(
        err.message,
        'Network request failed (404): Thing not found',
      );
    });

    it('preserves and displays structured API error details', async () => {
      fakeResponse.status = 500;
      fakeResponse.json.resolves({
        code: 'math_normalization_failed',
        description: 'The selected math could not be recovered. Retry Save.',
        reason: 'OCR request timed out',
        retryable: true,
        diagnostic_id: '7f55bf8d-897d-49af-9918-e83c1699f178',
      });

      const err = await fetchJSON('https://example.com').then(
        () => assert.fail('fetchJSON should have rejected'),
        e => e,
      );

      assert.instanceOf(err, FetchError);
      assert.equal(err.code, 'math_normalization_failed');
      assert.equal(
        err.description,
        'The selected math could not be recovered. Retry Save.',
      );
      assert.equal(err.reason, 'OCR request timed out');
      assert.isTrue(err.retryable);
      assert.equal(err.diagnosticID, '7f55bf8d-897d-49af-9918-e83c1699f178');
      // The message is presentation, not contract: it must surface the
      // actionable description and the diagnostic id, but its exact phrasing
      // is free to change.
      assert.include(
        err.message,
        'The selected math could not be recovered. Retry Save.',
      );
      assert.include(err.message, '7f55bf8d-897d-49af-9918-e83c1699f178');
    });

    it('returns the parsed JSON response if the request was successful', async () => {
      fakeResponse.json.resolves({ foo: 'bar' });
      const result = await fetchJSON('https://example.com');
      assert.deepEqual(result, { foo: 'bar' });
    });
  });
});
