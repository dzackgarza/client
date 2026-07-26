import { flagForAgent, setAgentQueueEnabled } from '../agent-queue';

describe('agent queue', () => {
  beforeEach(() => {
    setAgentQueueEnabled(false);
  });

  it('leaves annotations unchanged while disabled', () => {
    const annotation = {
      uri: 'https://example.com',
      target: [],
      tags: ['mine'],
    };

    assert.strictEqual(flagForAgent(annotation), annotation);
  });

  it('adds the queue tag while preserving authored tags when enabled', () => {
    setAgentQueueEnabled(true);
    const annotation = {
      uri: 'https://example.com',
      target: [],
      tags: ['mine'],
    };

    assert.deepEqual(flagForAgent(annotation).tags, ['mine', 'agent:queue']);
  });

  it('does not duplicate the queue tag', () => {
    setAgentQueueEnabled(true);
    const annotation = {
      uri: 'https://example.com',
      target: [],
      tags: ['agent:queue'],
    };

    assert.strictEqual(flagForAgent(annotation), annotation);
  });
});
