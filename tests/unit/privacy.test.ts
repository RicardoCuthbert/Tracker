import assert from 'node:assert/strict';
import { test } from 'node:test';
import { watchPrivateView } from '../../src/features/workspaces/privacy.ts';

test('visible windows hide on blur and reauthorize on focus, restoration and visibility return', () => {
  const page = new EventTarget(); const doc = new EventTarget();
  Object.defineProperty(doc, 'visibilityState', { value: 'visible', configurable: true });
  let hidden = 0; let reloads = 0;
  const cleanup = watchPrivateView(page as unknown as Window, doc as unknown as Document, () => hidden++, () => reloads++);
  page.dispatchEvent(new Event('blur')); assert.equal(hidden, 1); assert.equal(reloads, 0);
  page.dispatchEvent(new Event('focus')); assert.equal(hidden, 2); assert.equal(reloads, 1);
  Object.defineProperty(doc, 'visibilityState', { value: 'hidden' }); doc.dispatchEvent(new Event('visibilitychange')); assert.equal(hidden, 3);
  Object.defineProperty(doc, 'visibilityState', { value: 'visible' }); doc.dispatchEvent(new Event('visibilitychange')); assert.equal(reloads, 2);
  const restored = new Event('pageshow'); Object.defineProperty(restored, 'persisted', { value: true }); page.dispatchEvent(restored); assert.equal(reloads, 3);
  cleanup(); page.dispatchEvent(new Event('blur')); assert.equal(hidden, 5);
});
