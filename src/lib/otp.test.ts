import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCode, codeReady } from './otp';

test('an 8-digit code from the email is accepted in full', () => {
  assert.equal(cleanCode('12345678'), '12345678');
  assert.equal(codeReady('12345678'), true);
});

test('a 6-digit code is still accepted', () => {
  assert.equal(codeReady('123456'), true);
});

test('pasted codes with spaces, dashes or letters are cleaned', () => {
  assert.equal(cleanCode('1234 5678'), '12345678');
  assert.equal(cleanCode('1234-5678'), '12345678');
  assert.equal(cleanCode('Code: 123456 '), '123456');
});

test('too short is not ready and nothing longer than 10 digits is kept', () => {
  assert.equal(codeReady('12345'), false);
  assert.equal(codeReady(''), false);
  assert.equal(cleanCode('123456789012345'), '1234567890');
});
