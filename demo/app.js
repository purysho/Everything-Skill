const query = document.querySelector('#query');
const topic = document.querySelector('#topic');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const kindNames = new Map([
  ['tool', 'Tool'], ['api', 'API implementation'], ['mcp', 'MCP server'],
  ['dataset', 'Dataset'], ['paper', 'Research paper'], ['other', 'Reference'],
]);

function element(name, text) {
  const node = document.createElement(name);
  node.textContent = text;
  return node;
}
function link(text, url) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Invalid evidence URL.');
  const node = element('a', text);
  node.href = target.href;
  return node;
}
function words(value) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

try {
  const response = await fetch('./catalogue.json');
  if (!response.ok) throw new Error('Catalogue unavailable.');
  const catalogue = await response.json();
  const entries = catalogue.results;
  let page = 0;
  for (const category of [...new Set(entries.map((item) => item.category))].sort()) {
    const option = element('option', category[0].toUpperCase() + category.slice(1));
    option.value = category;
    topic.append(option);
  }
  const render = () => {
    const terms = [...new Set(words(query.value))];
    const matching = entries.map((entry) => {
      const title = new Set(words(entry.title));
      const full = new Set(words(`${entry.title} ${entry.summary} ${entry.category} ${kindNames.get(entry.kind) ?? entry.kind}`));
      const score = terms.reduce((sum, word) => sum + (title.has(word) ? 2 : full.has(word) ? 1 : 0), 0);
      return { entry, score };
    }).filter(({ entry, score }) => (!terms.length || score) && (!topic.value || entry.category === topic.value))
      .sort((a, b) => b.score - a.score);
    const pageSize = terms.length ? 5 : 25;
    const pages = Math.max(1, Math.ceil(matching.length / pageSize));
    page = Math.min(page, pages - 1);
    results.replaceChildren(...matching.slice(page * pageSize, (page + 1) * pageSize).map(({ entry }) => {
      const item = element('li', '');
      const heading = element('h3', '');
      heading.append(link(entry.title, entry.evidenceUrl));
      const provenance = element('p', '');
      const badge = element('span', 'Conditional');
      badge.className = 'badge';
      provenance.append(entry.sourceId.startsWith('met:') ? 'Artwork' : kindNames.get(entry.kind) ?? entry.kind, ' · ', badge,
        ' · ', link(entry.licence, entry.licenceUrl), ` · checked ${entry.checkedOn}`);
      if (entry.kind === 'dataset') provenance.append(' · ', link('Open dataset', entry.url));
      item.append(heading, element('p', entry.summary), provenance);
      return item;
    }));
    const count = matching.length;
    status.textContent = `${count} ${count === 1 ? 'match' : 'matches'} · page ${page + 1} of ${pages} · snapshot ${catalogue.version} · ${catalogue.excluded} intake records held out`;
    document.querySelector('#previous').disabled = page === 0;
    document.querySelector('#next').disabled = page === pages - 1;
  };
  query.addEventListener('input', () => { page = 0; render(); });
  topic.addEventListener('change', () => { page = 0; render(); });
  document.querySelector('#previous').addEventListener('click', () => { page--; render(); });
  document.querySelector('#next').addEventListener('click', () => { page++; render(); });
  render();
} catch {
  status.textContent = 'The catalogue could not be loaded. Open this folder with a static web server or GitHub Pages.';
}
