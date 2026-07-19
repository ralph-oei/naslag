import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMarkdown, buildNameIndex, resolveWikilink } from '../lib/vaultindex.js';

test('isMarkdown herkent .md ongeacht hoofdletters', () => {
  assert.equal(isMarkdown('Note.md'), true);
  assert.equal(isMarkdown('Note.MD'), true);
  assert.equal(isMarkdown('plaatje.png'), false);
});

test('buildNameIndex indexeert alleen markdown, op basisnaam (klein)', () => {
  const idx = buildNameIndex([
    { path: 'A/Note.md', name: 'Note.md' },
    { path: 'X/note.md', name: 'note.md' },
    { path: 'A/plaatje.png', name: 'plaatje.png' },
  ]);
  assert.deepEqual(idx.get('note'), ['A/Note.md', 'X/note.md']);
  assert.equal(idx.has('plaatje'), false);
});

test('resolveWikilink: unieke naam → dat pad', () => {
  const idx = buildNameIndex([{ path: 'A/B/Uniek.md', name: 'Uniek.md' }]);
  assert.equal(resolveWikilink('Uniek', 'ergens/anders.md', idx), 'A/B/Uniek.md');
});

test('resolveWikilink: dubbele naam → dichtstbijzijnde map', () => {
  const idx = buildNameIndex([
    { path: 'A/Note.md', name: 'Note.md' },
    { path: 'X/Note.md', name: 'Note.md' },
  ]);
  assert.equal(resolveWikilink('Note', 'A/B/vanaf.md', idx), 'A/Note.md');
  assert.equal(resolveWikilink('Note', 'X/Y/vanaf.md', idx), 'X/Note.md');
});

test('resolveWikilink: expliciet pad matcht exact', () => {
  const idx = buildNameIndex([
    { path: 'A/Note.md', name: 'Note.md' },
    { path: 'X/Note.md', name: 'Note.md' },
  ]);
  assert.equal(resolveWikilink('X/Note', 'A/vanaf.md', idx), 'X/Note.md');
});

test('resolveWikilink: alias en anchor worden genegeerd, .md optioneel', () => {
  const idx = buildNameIndex([{ path: 'Note.md', name: 'Note.md' }]);
  assert.equal(resolveWikilink('Note|toon dit', 'x.md', idx), 'Note.md');
  assert.equal(resolveWikilink('Note#Kop', 'x.md', idx), 'Note.md');
  assert.equal(resolveWikilink('Note.md', 'x.md', idx), 'Note.md');
});

test('resolveWikilink: onbekende naam → null', () => {
  const idx = buildNameIndex([{ path: 'Note.md', name: 'Note.md' }]);
  assert.equal(resolveWikilink('Bestaatniet', 'x.md', idx), null);
});
