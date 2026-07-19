import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyError } from '../lib/ui.js';
import { AuthError } from '../lib/drive.js';

test('classifyError: verlopen token → auth', () => {
  assert.equal(classifyError(new AuthError('verlopen')), 'auth');
});

test('classifyError: netwerkfout (TypeError) → offline', () => {
  assert.equal(classifyError(new TypeError('Failed to fetch')), 'offline');
});

test('classifyError: 404 in de melding → notfound', () => {
  assert.equal(classifyError(new Error('Drive 404: File not found')), 'notfound');
});

test('classifyError: overige fout → unknown', () => {
  assert.equal(classifyError(new Error('iets onverwachts')), 'unknown');
});
