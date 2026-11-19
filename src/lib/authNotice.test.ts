import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authNotice } from './authNotice';

const now = Date.parse('2026-11-19T12:00:00Z');
const user = { created_at: '2026-11-19T11:59:30Z', last_sign_in_at: '2026-11-19T11:59:31Z', user_metadata: { first_name: 'Henry' } };

test('new signup and first sign-in receive a welcome', () => {
  assert.deepEqual(authNotice(user, 'signup', now), { kind: 'success', title: 'Account created', message: 'Welcome to ReSync, Henry!' });
  assert.equal(authNotice(user, 'signin', now)?.title, 'Account created');
  assert.equal(authNotice({ ...user, user_metadata: {} }, 'signup', now)?.message, 'Welcome to ReSync!');
});

test('returning sign-in is welcomed back and refresh is quiet', () => {
  assert.equal(authNotice({ ...user, created_at: '2026-01-01T00:00:00Z' }, 'signin', now)?.message, 'Welcome back, Henry!');
  assert.equal(authNotice({ ...user, last_sign_in_at: '2026-11-19T12:00:00Z' }, 'signin', now)?.title, 'Signed in successfully');
  assert.equal(authNotice(user, 'refresh', now), null);
  assert.equal(authNotice(null, 'signin', now), null);
});
