import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchTitles, escapeDriveValue } from '../lib/search.js';

const FILES = [
  { id: '1', name: 'Zelesta dossier.md', path: 'Zelesta/Zelesta dossier.md' }, // naam begint met
  { id: '2', name: 'Over Zelesta.md', path: 'Klanten/Over Zelesta.md' },        // naam bevat
  { id: '3', name: 'Notes.md', path: 'Zelesta/Notes.md' },                      // alleen pad
  { id: '4', name: 'plaatje.png', path: 'Zelesta/plaatje.png' },                // geen md
];

test('searchTitles: alleen md, case-ongevoelig, correcte rangorde', () => {
  const r = searchTitles(FILES, 'zelesta');
  assert.deepEqual(r.map((x) => x.file.id), ['1', '2', '3']); // png eruit, rank-volgorde
});

test('searchTitles: lege query → geen resultaten', () => {
  assert.deepEqual(searchTitles(FILES, '   '), []);
});

test('searchTitles: highlight-ranges wijzen naar de getoonde naam', () => {
  const r = searchTitles(FILES, 'zelesta');
  const hit = r.find((x) => x.file.id === '2');
  assert.equal(hit.field, 'name');
  const [s, e] = hit.ranges[0];
  assert.equal('Over Zelesta'.slice(s, e).toLowerCase(), 'zelesta');
});

test('searchTitles: pad-match levert field=path met ranges in het pad', () => {
  const r = searchTitles(FILES, 'zelesta');
  const hit = r.find((x) => x.file.id === '3');
  assert.equal(hit.field, 'path');
  const [s, e] = hit.ranges[0];
  assert.equal('Zelesta/Notes.md'.slice(s, e).toLowerCase(), 'zelesta');
});

test('escapeDriveValue: ontsnapt backslash en quote (backslash eerst)', () => {
  assert.equal(escapeDriveValue("d'or"), "d\\'or");
  assert.equal(escapeDriveValue('a\\b'), 'a\\\\b');
});
