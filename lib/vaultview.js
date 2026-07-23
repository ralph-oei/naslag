// Vault-weergave: de eenmalige mapkiezer, de mappenboom in de sidebar, en het openen
// van een notitie. Unit 3 toont de ruwe tekst; opmaak (markdown, wikilinks) komt in
// unit 5/6. Alle gebruikersnamen worden ge-escaped (rare bestandsnamen breken niks).
import { getVaultRoot, setVaultRoot, clearVaultRoot, list, noteText, noteBlob, getIndex, ensureIndex } from './vault.js';
import { isFolder, AuthError } from './drive.js';
import { isMarkdown, resolveWikilink } from './vaultindex.js';
import { renderMarkdown } from './render.js';
import { classifyError } from './ui.js';

const $ = (id) => document.getElementById(id);
const stripMd = (name) => name.replace(/\.md$/i, '');
const baseName = (p) => p.split('/').pop() || p;
let openNoteRef = null;   // huidige open notitie, voor re-render zodra de index klaar is
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function fail(err, reauth, el) {
  const kind = classifyError(err);
  if (kind === 'auth') { reauth(); return; }
  if (!el) return;
  if (kind === 'offline') el.innerHTML = '<div class="tnote">Geen internet, en dit is niet eerder geopend (dus niet in de offline-cache).</div>';
  else if (kind === 'notfound') el.innerHTML = '<div class="tnote">Niet gevonden.</div>';
  else el.textContent = 'Fout: ' + (err.message || err);
}

// ── Mapkiezer (eerste keer) ──────────────────────────────────────────────────
export async function renderVaultPicker(token, reauth, onPicked) {
  $('tree').textContent = 'Kies eerst je vault-map.';
  const reader = $('reader');
  let stack = [{ id: 'root', name: 'Mijn Drive' }];

  async function draw() {
    const cur = stack[stack.length - 1];
    const crumbs = stack.map((s, i) => `<button class="crumb" data-i="${i}">${escapeHtml(s.name)}</button>`)
      .join('<span class="sep">›</span>');
    reader.innerHTML =
      `<div class="picker">
         <h2>Kies je vault-map</h2>
         <p class="picker-sub">Blader naar je Obsidian-vault en tik “Dit is 'm”.</p>
         <div class="crumbs">${crumbs}</div>
         <div class="folders" id="pf">Laden…</div>
       </div>`;
    reader.querySelectorAll('.crumb').forEach((b) =>
      b.addEventListener('click', () => { stack = stack.slice(0, +b.dataset.i + 1); draw(); }));
    try {
      const folders = (await list(cur.id, token)).filter(isFolder);
      const pf = $('pf');
      if (!folders.length) { pf.innerHTML = '<div class="muted">Geen submappen hier.</div>'; return; }
      pf.innerHTML = folders.map((f) =>
        `<div class="folder-row">
           <button class="folder-open" data-id="${f.id}" data-name="${escapeHtml(f.name)}">📁 ${escapeHtml(f.name)}</button>
           <button class="folder-pick" data-id="${f.id}" data-name="${escapeHtml(f.name)}">Dit is 'm</button>
         </div>`).join('');
      pf.querySelectorAll('.folder-open').forEach((b) =>
        b.addEventListener('click', () => { stack.push({ id: b.dataset.id, name: b.dataset.name }); draw(); }));
      pf.querySelectorAll('.folder-pick').forEach((b) =>
        b.addEventListener('click', () => { setVaultRoot(b.dataset.id, b.dataset.name); renderTree(token, reauth); onPicked?.(); }));
    } catch (err) { fail(err, reauth, $('pf')); }
  }
  draw();
}

// ── Mappenboom ───────────────────────────────────────────────────────────────
export async function renderTree(token, reauth) {
  const root = getVaultRoot();
  const reader = $('reader');
  reader.innerHTML =
    `<section class="welcome">
       <svg class="glyph" viewBox="0 0 48 48" aria-hidden="true"><use href="#naslag-mark"/></svg>
       <h2>${escapeHtml(root.name)}</h2>
       <p>Kies links een notitie om te lezen.</p>
       <div class="fine">Opmaak (koppen, wikilinks, afbeeldingen) komt in de volgende stappen.</div>
     </section>`;
  const tree = $('tree');
  tree.className = 'tree';
  tree.innerHTML = '';
  await renderChildren(root.id, tree, 0, token, reauth);

  // Volledige index op de achtergrond (voor wikilinks/embeds); als 'ie klaar is en
  // er staat een notitie open, die opnieuw renderen zodat links/embeds oplossen.
  ensureIndex(root.id, token)
    .then(() => { if (openNoteRef) openNote(openNoteRef, token, reauth); })
    .catch(() => {});
}

async function renderChildren(folderId, container, depth, token, reauth) {
  const pad = depth * 14 + 8;
  container.innerHTML = `<div class="tnote" style="padding-left:${pad}px">…</div>`;
  try {
    const items = await list(folderId, token);
    const folders = items.filter(isFolder);
    const notes = items.filter((i) => isMarkdown(i.name));
    container.innerHTML = '';
    for (const f of folders) container.appendChild(folderRow(f, depth, token, reauth));
    for (const n of notes) container.appendChild(noteRow(n, depth, token, reauth));
    if (!folders.length && !notes.length)
      container.innerHTML = `<div class="tnote" style="padding-left:${pad}px">leeg</div>`;
  } catch (err) { fail(err, reauth, container); }
}

function folderRow(f, depth, token, reauth) {
  const wrap = document.createElement('div');
  const btn = document.createElement('button');
  btn.className = 'row folder';
  btn.style.paddingLeft = (depth * 14 + 8) + 'px';
  btn.innerHTML = `<span class="tw">▸</span><span class="nm">${escapeHtml(f.name)}</span>`;
  const kids = document.createElement('div');
  kids.hidden = true;
  let loaded = false;
  btn.addEventListener('click', async () => {
    if (!kids.hidden) { kids.hidden = true; btn.querySelector('.tw').textContent = '▸'; return; }
    kids.hidden = false; btn.querySelector('.tw').textContent = '▾';
    if (!loaded) { loaded = true; await renderChildren(f.id, kids, depth + 1, token, reauth); }
  });
  wrap.appendChild(btn);
  wrap.appendChild(kids);
  return wrap;
}

function noteRow(n, depth, token, reauth) {
  const btn = document.createElement('button');
  btn.className = 'row note';
  btn.style.paddingLeft = (depth * 14 + 8) + 'px';
  btn.innerHTML = `<span class="nm">${escapeHtml(stripMd(n.name))}</span>`;
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tree .row.note.active').forEach((e) => e.classList.remove('active'));
    btn.classList.add('active');
    document.body.classList.remove('nav-open');
    openNote(n, token, reauth);
  });
  return btn;
}

async function openNote(n, token, reauth) {
  openNoteRef = n;
  const reader = $('reader');
  reader.innerHTML =
    `<article class="note-view">
       <h1 class="note-title">${escapeHtml(stripMd(n.name))}</h1>
       <div class="note-body" id="nb"><p class="tnote">Laden…</p></div>
     </article>`;
  document.querySelector('.content')?.scrollTo(0, 0);
  try {
    const text = await noteText(n.id, token);
    const idx = getIndex();
    const fromPath = idx?.files.find((f) => f.id === n.id)?.path || '';
    const resolve = (target) => { const i = getIndex(); return i ? resolveWikilink(target, fromPath, i.nameIndex) : null; };
    const nb = $('nb');
    nb.innerHTML = renderMarkdown(text, { resolve });
    hydrate(nb, token, reauth, 0);
  } catch (err) { fail(err, reauth, $('nb')); }
}

/** Opent een notitie vanuit het zoekvenster (file = index-item {id,name,path,...}). */
export function openNoteFromSearch(file, token, reauth) {
  document.querySelectorAll('#tree .row.note.active').forEach((e) => e.classList.remove('active'));
  document.body.classList.remove('nav-open');
  const reader = document.getElementById('reader');
  reader?.scrollTo?.(0, 0);
  openNote(file, token, reauth);
}

/** Vult wikilink-klikken, afbeelding-embeds (Drive-blob) en notitie-transclusie (diepte 1). */
function hydrate(container, token, reauth, depth) {
  container.querySelectorAll('a.wikilink[data-path]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const f = getIndex()?.byPath.get(a.dataset.path.toLowerCase());
      if (f) { document.body.classList.remove('nav-open'); openNote(f, token, reauth); }
    });
  });

  container.querySelectorAll('.embed-img[data-img]').forEach(async (el) => {
    const f = getIndex()?.byName.get(baseName(el.dataset.img).toLowerCase());
    if (!f) return;
    try {
      const url = URL.createObjectURL(await noteBlob(f.id, token));
      const img = document.createElement('img');
      img.src = url; img.alt = f.name; img.loading = 'lazy';
      el.replaceWith(img);
    } catch (err) { if (err instanceof AuthError) reauth(); }
  });

  if (depth < 1) container.querySelectorAll('.embed-note[data-note]').forEach(async (el) => {
    const idx = getIndex();
    if (!idx) return;
    const path = resolveWikilink(el.dataset.note, '', idx.nameIndex);
    const f = path && idx.byPath.get(path.toLowerCase());
    if (!f || f.id === openNoteRef?.id) { el.classList.add('missing'); return; }
    try {
      const text = await noteText(f.id, token);
      const block = document.createElement('div');
      block.className = 'embed-note-block';
      block.innerHTML = `<div class="embed-note-title">📄 ${escapeHtml(stripMd(f.name))}</div><div class="embed-note-body"></div>`;
      const body = block.querySelector('.embed-note-body');
      body.innerHTML = renderMarkdown(text, { resolve: (t) => resolveWikilink(t, path, idx.nameIndex) });
      el.replaceWith(block);
      hydrate(body, token, reauth, depth + 1);
    } catch (err) { if (err instanceof AuthError) reauth(); }
  });
}

// ── Sidebar-voet: account + andere map ───────────────────────────────────────
export function renderSidebarFoot(email, { onSignOut, token, reauth, onVaultPicked }) {
  const sidebar = $('sidebar');
  sidebar.querySelector('.sidebar-foot')?.remove();
  const foot = document.createElement('div');
  foot.className = 'sidebar-foot';
  foot.innerHTML =
    `<div class="acct">${escapeHtml(email)}</div>
     <button class="linkbtn" id="switchVault">Andere map kiezen</button>
     <button class="linkbtn" id="signOut">Uitloggen</button>`;
  sidebar.appendChild(foot);
  $('switchVault').addEventListener('click', () => { clearVaultRoot(); renderVaultPicker(token, reauth, onVaultPicked); });
  $('signOut').addEventListener('click', onSignOut);
}
