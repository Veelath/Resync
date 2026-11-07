import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showDesktopAlert } from './ScanNotifications';

test('desktop alerts appear only when the page is hidden or unfocused', () => {
  let count = 0;
  class FakeNotification {
    static permission = 'granted';
    onclick: (() => void) | null = null;
    constructor() { count++; }
    close() {}
  }
  Object.assign(globalThis, { window: { Notification: FakeNotification }, Notification: FakeNotification });
  for (const [visibilityState, focused, expected] of [['hidden', true, 1], ['visible', false, 2], ['visible', true, 2]] as const) {
    Object.assign(globalThis, { document: { visibilityState, hasFocus: () => focused } });
    showDesktopAlert('Ready', 'Your report is ready');
    assert.equal(count, expected);
  }
});
