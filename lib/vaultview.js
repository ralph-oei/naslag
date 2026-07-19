// Vault-weergave: de eenmalige mapkiezer, de mappenboom in de sidebar, en het openen
// van een notitie. Unit 3 toont de ruwe tekst; opmaak (markdown, wikilinks) komt in
// unit 5/6. Alle gebruikersnamen worden ge-escaped (rare bestandsnamen breken niks).
import { getVaultRoot, setVaultRoot, clearVaultRoot, list, noteText } from './vault.js';
import { isFolder, AuthError } from './drive.js';
import { isMarkdown } from './vaultindex.js';

const $ = (id) => document.getElementById(id);
const stripMd = (name) => name.replace(/\.md$/i, '');
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function fail(err, reauth, el) {
  if (err instanceof AuthError) { reauth(); return; }
  if (el) el.textContent = 'Fout: ' + err.message;
}

// ── Mapkiezer (eerste keer) ──────────────────────────────────────────────────
export async function renderVaultPicker(token, reauth) {
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
        b.addEventListener('click', () => { setVaultRoot(b.dataset.id, b.dataset.name); renderTree(token, reauth); }));
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
  const reader = $('reader');
  reader.innerHTML =
    `<div class="note-view">
       <h1 class="note-title">${escapeHtml(stripMd(n.name))}</h1>
       <pre class="note-raw">Laden…</pre>
     </div>`;
  try {
    reader.querySelector('.note-raw').textContent = await noteText(n.id, token);
  } catch (err) { fail(err, reauth, reader.querySelector('.note-raw')); }
}

// ── Sidebar-voet: account + andere map ───────────────────────────────────────
export function renderSidebarFoot(email, { onSignOut, token, reauth }) {
  const sidebar = $('sidebar');
  sidebar.querySelector('.sidebar-foot')?.remove();
  const foot = document.createElement('div');
  foot.className = 'sidebar-foot';
  foot.innerHTML =
    `<div class="acct">${escapeHtml(email)}</div>
     <button class="linkbtn" id="switchVault">Andere map kiezen</button>
     <button class="linkbtn" id="signOut">Uitloggen</button>`;
  sidebar.appendChild(foot);
  $('switchVault').addEventListener('click', () => { clearVaultRoot(); renderVaultPicker(token, reauth); });
  $('signOut').addEventListener('click', onSignOut);
}
