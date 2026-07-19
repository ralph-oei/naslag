// Markdown → HTML voor de notitie-weergave. Unit 5: koppen, lijsten, tabellen, code,
// citaten, links, checklists, en frontmatter netjes verborgen. Wikilinks/embeds/tags
// komen in unit 6; vault-relatieve afbeeldingen krijgen nu een nette placeholder.
// markdown-it is gevendord en als globale `window.markdownit` geladen (zie index.html).

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Splitst een leidend `---`-frontmatterblok af. Alleen aan het begin; een `---` verderop
 *  in de tekst (horizontale lijn) telt niet als eind. */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text || '');
  if (!m) return { frontmatter: '', body: text || '' };
  return { frontmatter: m[1], body: (text || '').slice(m[0].length) };
}

/** Zet gerenderde `- [ ]` / `- [x]`-items om naar leesbare (read-only) vinkjes. */
export function enhanceTaskLists(html) {
  return html.replace(/<li>(\s*(?:<p>)?)\[([ xX])\]\s?/g, (_, mid, mark) => {
    const done = mark.toLowerCase() === 'x';
    return `<li class="task${done ? ' done' : ''}">${mid}<span class="cb" aria-hidden="true">${done ? '✓' : ''}</span> `;
  });
}

/** Vault-relatieve afbeeldingen (geen http/data-URL) → placeholder. Unit 6 lost ze op via Drive. */
export function markUnresolvedImages(html) {
  return html.replace(/<img\s+[^>]*?src="([^"]*)"[^>]*>/g, (m, src) => {
    if (/^(https?:|data:)/i.test(src)) return m;
    const name = src.split('/').pop() || src;
    return `<span class="img-todo">🖼 ${escapeHtml(name)}</span>`;
  });
}

/** Externe links in een nieuw tabblad. */
function externalLinksBlank(html) {
  return html.replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

let _md = null;
function getMd() {
  if (_md) return _md;
  if (typeof window === 'undefined' || !window.markdownit) return null;
  _md = window.markdownit({ html: false, linkify: true, typographer: false, breaks: false });
  return _md;
}

/** Volledige notitie-tekst → veilige HTML-string. Frontmatter wordt verborgen. */
export function renderMarkdown(text) {
  const { body } = splitFrontmatter(text);
  const md = getMd();
  if (!md) return `<pre class="note-raw">${escapeHtml(body)}</pre>`;   // fallback zonder lib
  let html = md.render(body);
  html = enhanceTaskLists(html);
  html = markUnresolvedImages(html);
  html = externalLinksBlank(html);
  return html;
}
