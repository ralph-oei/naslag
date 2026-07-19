import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitFrontmatter, enhanceTaskLists, markUnresolvedImages } from '../lib/render.js';

test('splitFrontmatter haalt een leidend --- blok eruit', () => {
  const r = splitFrontmatter('---\ntitel: x\ntags: [a]\n---\n# Kop\ntekst');
  assert.equal(r.frontmatter, 'titel: x\ntags: [a]');
  assert.equal(r.body, '# Kop\ntekst');
});

test('splitFrontmatter: geen frontmatter → body ongewijzigd', () => {
  const r = splitFrontmatter('# Kop\ntekst');
  assert.equal(r.frontmatter, '');
  assert.equal(r.body, '# Kop\ntekst');
});

test('splitFrontmatter: een --- verderop is een horizontale lijn, geen frontmatter-eind', () => {
  const r = splitFrontmatter('# Kop\n\n---\n\nmeer');   // begint niet met ---
  assert.equal(r.frontmatter, '');
  assert.equal(r.body, '# Kop\n\n---\n\nmeer');
});

test('splitFrontmatter: neemt alleen het eerste ---...--- blok (niet-hebberig)', () => {
  const r = splitFrontmatter('---\na: 1\n---\ntekst\n---\nnog meer');
  assert.equal(r.frontmatter, 'a: 1');
  assert.equal(r.body, 'tekst\n---\nnog meer');
});

test('enhanceTaskLists: [x] wordt afgevinkt, [ ] leeg, gewone li ongemoeid', () => {
  assert.match(enhanceTaskLists('<li>[x] Klaar</li>'), /class="task done"/);
  assert.match(enhanceTaskLists('<li>[x] Klaar</li>'), /✓/);
  const open = enhanceTaskLists('<li>[ ] Todo</li>');
  assert.match(open, /class="task"/);
  assert.doesNotMatch(open, /✓/);
  assert.equal(enhanceTaskLists('<li>gewoon item</li>'), '<li>gewoon item</li>');
});

test('markUnresolvedImages: absolute blijft, relatief wordt hydrateerbare placeholder', () => {
  const abs = '<img src="https://x.nl/a.png" alt="a">';
  assert.equal(markUnresolvedImages(abs), abs);
  const rel = markUnresolvedImages('<img src="assets/plaatje.png" alt="p">');
  assert.match(rel, /class="embed-img"/);
  assert.match(rel, /data-img="assets\/plaatje\.png"/);
  assert.match(rel, /plaatje\.png/);
  assert.doesNotMatch(rel, /<img/);
});
