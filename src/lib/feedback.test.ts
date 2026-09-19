import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFeedbackText, markFeedbackHandled, normalizeFeedbackList } from './feedback.ts';

describe('feedback', () => {
  it('builds one-tap labels with an optional note', () => {
    assert.equal(buildFeedbackText('too-hard', ''), '太难了');
    assert.equal(buildFeedbackText('boring', '排字母太久'), '没意思。排字母太久');
    assert.equal(buildFeedbackText('note', '想学动物'), '想学动物');
  });

  it('marks an item handled and read', () => {
    const next = markFeedbackHandled(
      [
        {
          id: 'a',
          text: '太难了',
          kind: 'too-hard',
          createdAt: 't',
          read: false,
          handled: false,
        },
      ],
      'a',
    );
    assert.equal(next[0].handled, true);
    assert.equal(next[0].read, true);
  });

  it('fills missing kind/handled on old inbox items', () => {
    const next = normalizeFeedbackList([{ id: 'x', text: 'hello', createdAt: 't', read: true }]);
    assert.equal(next[0].kind, 'note');
    assert.equal(next[0].handled, false);
  });
});
