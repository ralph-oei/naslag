// Markdown → HTML voor de notitie-weergave.
// Unit 5: koppen, lijsten, tabellen, code, citaten, checklists, frontmatter verborgen.
// Unit 6: Obsidian-smaak — [[wikilinks]] (doorklikbaar), ![[embeds]] (afbeelding/notitie),
//   #tags (chips). Wikilinks worden bij het renderen opgelost via een resolve-functie;
//   embeds/afbeeldingen worden als placeholders gerenderd en daarna async gehydrateerd
//   (zie vaultview.js), want Drive ophalen kan niet synchroon.
// markdown-it is gevendord en als globale window.markdownit geladen (zie index.html).

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const baseName = (p) => p.split('/').pop() || p;

/** Splitst een leidend `---`-frontmatterblok af (alleen aan het begin). */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text || '');
  if (!m) return { frontmatter: '', body: text || '' };
  return { frontmatter: m[1], body: (text || '').slice(m[0].length) };
}

/** Gerenderde `- [ ]` / `- [x]`-items → leesbare (read-only) vinkjes. */
export function enhanceTaskLists(html) {
  return html.replace(/<li>(\s*(?:<p>)?)\[([ xX])\]\s?/g, (_, mid, mark) => {
    const done = mark.toLowerCase() === 'x';
    return `<li class="task${done ? ' done' : ''}">${mid}<span class="cb" aria-hidden="true">${done ? '✓' : ''}</span> `;
  });
}

/** Vault-relatieve `![](pad)`-afbeeldingen → hydrateerbare placeholder (Drive-blob volgt). */
export function markUnresolvedImages(html) {
  return html.replace(/<img\s+[^>]*?src="([^"]*)"[^>]*?>/g, (m, src) => {
    if (/^(https?:|data:|blob:)/i.test(src)) return m;
    return `<span class="embed-img" data-img="${escapeHtml(src)}">🖼 ${escapeHtml(baseName(src))}</span>`;
  });
}

function externalLinksBlank(html) {
  return html.replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

// ── Obsidian-plugin voor markdown-it ─────────────────────────────────────────
let ctxResolve = () => null;   // wordt per render gezet (afhangt van de huidige notitie)

function obsidianPlugin(md) {
  // ![[embed]] — vóór de wikilink- en image-regel.
  md.inline.ruler.before('image', 'obsidian_embed', (state, silent) => {
    const s = state.src, p = state.pos;
    if (s.charCodeAt(p) !== 0x21 || s.charCodeAt(p + 1) !== 0x5B || s.charCodeAt(p + 2) !== 0x5B) return false;
    const end = s.indexOf(']]', p + 3);
    if (end < 0) return false;
    const inner = s.slice(p + 3, end);
    if (inner.includes('\n') || inner.includes('[')) return false;
    if (!silent) { state.push('obsidian_embed', '', 0).meta = { target: inner.split('|')[0].trim() }; }
    state.pos = end + 2;
    return true;
  });

  // [[wikilink]] / [[link|alias]]
  md.inline.ruler.before('image', 'obsidian_wikilink', (state, silent) => {
    const s = state.src, p = state.pos;
    if (s.charCodeAt(p) !== 0x5B || s.charCodeAt(p + 1) !== 0x5B) return false;
    const end = s.indexOf(']]', p + 2);
    if (end < 0) return false;
    const inner = s.slice(p + 2, end);
    if (inner.includes('\n') || inner.includes('[') || inner.includes(']')) return false;
    if (!silent) {
      const [target, alias] = inner.split('|');
      state.push('obsidian_wikilink', '', 0).meta = { target: target.trim(), label: (alias ?? target).trim() };
    }
    state.pos = end + 2;
    return true;
  });

  // #tag  (niet midden in een woord; minstens één letter, dus #123 telt niet)
  md.inline.ruler.push('obsidian_tag', (state, silent) => {
    const s = state.src, p = state.pos;
    if (s.charCodeAt(p) !== 0x23) return false;
    if (p > 0 && /[\w/]/.test(s[p - 1])) return false;
    const m = /^#([\w/-]*[A-Za-z][\w/-]*)/.exec(s.slice(p));
    if (!m) return false;
    if (!silent) { state.push('obsidian_tag', '', 0).meta = { tag: m[1] }; }
    state.pos = p + m[0].length;
    return true;
  });

  md.renderer.rules.obsidian_wikilink = (tokens, i) => {
    const { target, label } = tokens[i].meta;
    const path = ctxResolve(target);
    const cls = path ? 'wikilink' : 'wikilink unresolved';
    const data = path ? ` data-path="${escapeHtml(path)}"` : '';
    return `<a class="${cls}"${data} data-target="${escapeHtml(target)}">${escapeHtml(label)}</a>`;
  };
  md.renderer.rules.obsidian_embed = (tokens, i) => {
    const t = tokens[i].meta.target;
    const anchorless = t.split('#')[0];
    if (IMG_EXT.test(anchorless)) return `<span class="embed-img" data-img="${escapeHtml(t)}">🖼 ${escapeHtml(baseName(t))}</span>`;
    return `<span class="embed-note" data-note="${escapeHtml(t)}">📄 ${escapeHtml(baseName(anchorless))}</span>`;
  };
  md.renderer.rules.obsidian_tag = (tokens, i) => `<span class="tag">#${escapeHtml(tokens[i].meta.tag)}</span>`;
}

let _md = null;
function getMd() {
  if (_md) return _md;
  if (typeof window === 'undefined' || !window.markdownit) return null;
  _md = window.markdownit({ html: false, linkify: true, typographer: false, breaks: false }).use(obsidianPlugin);
  return _md;
}

/** Volledige notitie-tekst → veilige HTML met placeholders. `opts.resolve(target)` → pad of null. */
export function renderMarkdown(text, opts = {}) {
  ctxResolve = typeof opts.resolve === 'function' ? opts.resolve : () => null;
  const { body } = splitFrontmatter(text);
  const md = getMd();
  if (!md) return `<pre class="note-raw">${escapeHtml(body)}</pre>`;
  let html = md.render(body);
  html = enhanceTaskLists(html);
  html = markUnresolvedImages(html);
  html = externalLinksBlank(html);
  return html;
}
