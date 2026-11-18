import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { NOTICE_EVENT, notify } from './notify';
import { ToastBanner, type AppNotification } from '../components/ScanNotifications';

test('a quick notice reaches the toast even with scan alerts off, without changing the bell', () => {
  const source = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const handler = source.match(/const onNotice = \(event: Event\) => \{[\s\S]*?\n    \};/)?.[0];
  assert.ok(handler);
  const code = ts.transpile(`${handler}\nreturn onNotice;`, { target: ts.ScriptTarget.ES2020 });
  let toast: AppNotification | null = null;
  let delay = 0;
  const bell: AppNotification[] = [];
  const notificationPrefsRef = { current: { alerts: false } };
  const toastTimer = { current: null };
  const setToast = (value: AppNotification) => { toast = value; };
  const timer = (_callback: () => void, ms: number) => { delay = ms; return 1; };
  const onNotice = new Function('setToast', 'toastTimer', 'setTimeout', 'notificationPrefsRef', 'setNotifications', code)(setToast, toastTimer, timer, notificationPrefsRef, (value: AppNotification) => bell.push(value));
  const windowTarget = new EventTarget();
  class NoticeEvent<T> extends Event { detail: T; constructor(type: string, init: { detail: T }) { super(type); this.detail = init.detail; } }
  Object.assign(globalThis, { window: windowTarget, CustomEvent: NoticeEvent });
  windowTarget.addEventListener(NOTICE_EVENT, onNotice);
  notify({ kind: 'error', title: 'Could not save', message: 'Please try again.' });
  assert.equal(delay, 4000);
  assert.equal(bell.length, 0);
  const markup = renderToStaticMarkup(createElement(ToastBanner, { toast, soundBlocked: false, onEnableSound() {}, onClose() {} }));
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Could not save/);
  assert.match(markup, /Please try again/);
});

test('successful toast uses status semantics', () => {
  const toast: AppNotification = { id: '1', kind: 'success', title: 'Saved', message: 'Done', at: 0, read: true };
  const markup = renderToStaticMarkup(createElement(ToastBanner, { toast, soundBlocked: false, onEnableSound() {}, onClose() {} }));
  assert.match(markup, /role="status"/);
});
