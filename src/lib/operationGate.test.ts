import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createOperationGate, createWriteQueue } from './operationGate.ts';

it('waits for an in-flight recording and blocks new mutations before a snapshot', async () => {
  const gate = createOperationGate();
  const events: string[] = [];
  let release!: () => void;
  const recording = gate.mutate(async () => {
    await new Promise<void>((resolve) => { release = resolve; });
    events.push('recording saved');
  });
  const backup = gate.freeze(async () => { events.push('snapshot'); });
  assert.equal(gate.blocked, true);
  await assert.rejects(gate.mutate(async () => { events.push('unexpected'); }));
  assert.deepEqual(events, []);
  release();
  await Promise.all([recording, backup]);
  assert.deepEqual(events, ['recording saved', 'snapshot']);
  assert.equal(gate.blocked, false);
});

it('unlocks after backup failure without allowing concurrent freezes', async () => {
  const gate = createOperationGate();
  await assert.rejects(gate.freeze(async () => {
    await assert.rejects(gate.freeze(async () => {}));
    throw new Error('disk full');
  }), /disk full/);
  assert.equal(gate.blocked, false);
  await gate.mutate(async () => {});
});

it('serializes writes and permits a retry after a rejected write', async () => {
  const queue = createWriteQueue();
  const writes: string[] = [];
  let release!: () => void;
  const first = queue.run(async () => {
    await new Promise<void>((resolve) => { release = resolve; });
    writes.push('old');
  });
  const second = queue.run(async () => { writes.push('new'); });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(writes, []);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(writes, ['old', 'new']);
  await assert.rejects(queue.run(async () => { throw new Error('full'); }), /full/);
  await queue.run(async () => { writes.push('retry'); });
  await queue.flush();
  assert.deepEqual(writes, ['old', 'new', 'retry']);
});
