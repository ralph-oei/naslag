import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchFullText } from '../lib/drive.js';

test('searchFullText: vraagt een fullText-query en geeft de files terug', async () => {
  let calledUrl = '';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { status: 200, ok: true, json: async () => ({ files: [{ id: '1', name: 'a.md', mimeType: 'text/markdown' }] }) };
  };
  try {
    const r = await searchFullText('prijzen', 'tok');
    assert.deepEqual(r.map((f) => f.id), ['1']);
    assert.match(decodeURIComponent(calledUrl), /fullText/);
    assert.match(decodeURIComponent(calledUrl), /trashed=false/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
