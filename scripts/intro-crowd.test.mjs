import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('cropped sprite sheets stay in bounds after mobile/desktop resize and skip redundant frames', async () => {
  const source = await readFile(new URL('../intro-crowd.js', import.meta.url), 'utf8');
  for (const rows of [2, 5]) {
    const draws = [];
    const context = { setTransform() {}, clearRect() {}, save() {}, translate() {}, scale() {}, restore() {}, drawImage(...args) { draws.push(args); } };
    const canvas = { clientWidth: 390, clientHeight: 844, getContext: () => context };
    const window = {};
    runInNewContext(source, { window, devicePixelRatio: 3, Math });
    const crowd = window.createIntroCrowd(canvas, { naturalWidth: 3600, naturalHeight: rows * 324 });
    assert.equal(canvas.width, 585);
    crowd.render(0);
    assert.equal(draws.length, 30);
    crowd.render(16.67);
    assert.equal(draws.length, 30);
    crowd.render(16.67);
    assert.equal(draws.length, 60);
    canvas.clientWidth = 1440;
    crowd.resize();
    crowd.render(0);
    assert.equal(draws.length, 130);
    for (const [, x, y, width, height] of draws) {
      assert.ok(x >= 0 && x + width <= 3600);
      assert.ok(y >= 0 && y + height <= rows * 324);
    }
  }
});
