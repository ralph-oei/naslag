import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrokerUrl, parseTokenFromFragment, tokenValid } from '../lib/auth.js';

const SCRIPT = 'https://script.google.com/macros/s/ABC/exec';

test('buildBrokerUrl hangt de redirect als geëncodeerde parameter aan', () => {
  const u = buildBrokerUrl(SCRIPT, 'https://ralphoei.ai/vault/');
  assert.equal(u, SCRIPT + '?redirect=' + encodeURIComponent('https://ralphoei.ai/vault/'));
});

test('buildBrokerUrl gebruikt & als de script-URL al een query heeft', () => {
  const u = buildBrokerUrl(SCRIPT + '?v=2', 'https://ralphoei.ai/vault/');
  assert.ok(u.includes('/exec?v=2&redirect='));
});

test('parseTokenFromFragment haalt het token eruit en decodeert het', () => {
  assert.equal(parseTokenFromFragment('#naslag_token=abc123'), 'abc123');
  assert.equal(parseTokenFromFragment('#naslag_token=a%2Fb%2Bc'), 'a/b+c');
});

test('parseTokenFromFragment geeft null zonder token', () => {
  assert.equal(parseTokenFromFragment('#iets=anders'), null);
  assert.equal(parseTokenFromFragment(''), null);
  assert.equal(parseTokenFromFragment(null), null);
});

test('tokenValid: vers token is geldig, verouderd niet', () => {
  const now = 1_000_000_000_000;
  assert.equal(tokenValid({ token: 'x', obtainedAt: now }, now), true);
  assert.equal(tokenValid({ token: 'x', obtainedAt: now - 10 * 60 * 1000 }, now), true);   // 10 min oud
  assert.equal(tokenValid({ token: 'x', obtainedAt: now - 60 * 60 * 1000 }, now), false);  // 60 min oud
});

test('tokenValid: leeg/ontbrekend record is ongeldig', () => {
  const now = 1_000_000_000_000;
  assert.equal(tokenValid(null, now), false);
  assert.equal(tokenValid({ token: '', obtainedAt: now }, now), false);
  assert.equal(tokenValid({ token: 'x' }, now), false);
});
