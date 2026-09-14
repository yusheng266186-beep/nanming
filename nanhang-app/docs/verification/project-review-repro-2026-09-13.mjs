// Read-only, synthetic callback probes. These execute extracted callback bodies with
// controlled dependencies; they are not browser/React integration or visual tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import ts from 'typescript';
const source = readFileSync(fileURLToPath(new URL('../../apps/web/src/App.tsx', import.meta.url)), 'utf8').replaceAll('\r\n', '\n');
const checks = [];

// State setters queue the next render; navigation in this event sees the old closure.
const choose = source.match(/const chooseRoute = \(next: LocateRoute\) => \{([\s\S]*?)\n  \};/)[1];
let queuedEntry = false;
let navigated = false;
const capturedEntry = false;
new Function('next', 'setEntryChosen', 'setRoute', 'goTo', choose)(
  'manual', value => { queuedEntry = value; }, () => {},
  () => { navigated = capturedEntry; });
assert.equal(queuedEntry, true);
assert.equal(navigated, false);
checks.push('first entry queues selection but navigation sees pre-selection gate');

// Removing the only usable score/exam never calls setRange(null).
const rangeEffect = source.match(/useEffect\(\(\) => \{\n    if \(!state.form.primary\) return;([\s\S]*?)\n  \}, \[state.form.primary, state.form.score, examsKey\]\);/)[1];
let range = { low: 590, high: 610 };
new Function('state', 'rangeFromExams', 'setRange', rangeEffect)(
  { form: { primary: 'PHYSICS', score: null, exams: [] } }, () => null,
  value => { range = value; });
assert.deepEqual(range, { low: 590, high: 610 });
checks.push('clearing all score sources leaves previous range');

// A failed completion still freezes the direction set, with no pending state.
const finalBody = source.match(/const runFinalTurn = async \(\) => \{([\s\S]*?)\n  \};/)[1]
  .replaceAll(' as const', '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let done = false;
let pendingDuringRequest = null;
let ai = { history: [], suggestions: [], pending: false };
await new AsyncFunction('aiSeq', 'ai', 'state', 'evidenceForRequest', 'askAi',
  'aiStamp', 'FINAL_TURN_INSTRUCTION', 'catalog', 'setAi', 'applyTurnResult',
  'mergeSuggestions', 'setFinalDone', finalBody)(
  { current: 0 }, ai, { generation: 1, registry: {} }, () => [],
  async () => { pendingDuringRequest = ai.pending; return { reply: null, status: 'NETWORK_ERROR', suggestions: [] }; },
  () => ({ runId: 'synthetic', inputRevision: 1 }), 'synthetic final instruction', null,
  update => { ai = update(ai); }, (current, next) => ({ ...current, ...next }),
  previous => previous, value => { done = value; });
assert.equal(done, true);
assert.equal(pendingDuringRequest, false);
checks.push('failed final turn marks done and leaves pending false during request');

const clear = source.match(/const clear = \(\) => \{([\s\S]*?)\n  \};/)[1];
assert.equal(/setFinalDone|finalTurnRef/.test(clear), false);
checks.push('clear callback does not reset final completion latch (source check)');

// Run the actual Redis client against a synthetic local RESP peer. A timed-out
// first response must not be delivered to the second command on the connection.
const redisSource = readFileSync(fileURLToPath(new URL('../../packages/ai-gateway/src/redis-client.ts', import.meta.url)), 'utf8');
const compiled = ts.transpileModule(redisSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const { RedisConnection } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const timers = [];
const peers = new Set();
const peer = createServer(socket => {
  peers.add(socket);
  let commands = 0;
  socket.on('data', () => {
    commands += 1;
    if (commands === 1) timers.push(setTimeout(() => socket.write('+FIRST\r\n'), 80));
    // The second response stays outstanding until this probe closes the socket.
  });
});
await new Promise(resolve => peer.listen(0, '127.0.0.1', resolve));
const redis = new RedisConnection({ host: '127.0.0.1', port: peer.address().port, commandTimeoutMs: 50 });
try {
  await assert.rejects(redis.command(['GET', 'first']), /timed out/);
  const second = await redis.command(['GET', 'second']);
  assert.equal(second, 'FIRST');
  checks.push('actual Redis client delivers timed-out first response to second command');
} finally {
  timers.forEach(clearTimeout);
  redis.close();
  peers.forEach(socket => socket.destroy());
  await new Promise(resolve => peer.close(resolve));
}
console.log(JSON.stringify({ status: 'reproduced', scope: 'extracted callbacks with synthetic dependencies; no browser', checks }, null, 2));
