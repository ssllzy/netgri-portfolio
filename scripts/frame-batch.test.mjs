import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('scroll effects coalesce updates and finish all geometry reads before style writes', async () => {
  const callbacks = [], events = [], window = {};
  runInNewContext(await readFile(new URL('../frame-batch.js', import.meta.url), 'utf8'), {
    window, Map, requestAnimationFrame(callback) { callbacks.push(callback); return callbacks.length; },
  });
  window.NetgriFrame.schedule('nav', () => { events.push('read-old'); return 0; }, () => events.push('write-old'));
  window.NetgriFrame.schedule('nav', () => { events.push('read-nav'); return 260; }, value => events.push(`write-nav:${value}`));
  window.NetgriFrame.schedule('whatsapp', () => { events.push('read-whatsapp'); return 1; }, value => events.push(`write-whatsapp:${value}`));
  assert.equal(callbacks.length, 1);
  callbacks[0]();
  assert.deepEqual(events, ['read-nav', 'read-whatsapp', 'write-nav:260', 'write-whatsapp:1']);
  window.NetgriFrame.schedule('nav', () => 0, () => {});
  assert.equal(callbacks.length, 2);
});
