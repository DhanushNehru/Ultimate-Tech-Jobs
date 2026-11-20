(async function () {
  const list = document.getElementById('list');
  const chips = document.getElementById('chips');
  const q = document.getElementById('q');
  const count = document.getElementById('count');
  let data;
  try {
    data = await (await fetch('data.json')).json();
  } catch (e) {
    list.textContent = 'Could not load the list. See the README on GitHub instead.';
    return;
  }
  let active = location.hash.slice(1) || 'all';
  if (active !== 'all' && !data.sections.some((s) => s.id === active)) active = 'all';
  q.value = new URLSearchParams(location.search).get('q') || '';

  function syncUrl(term, hash) {
    const url = new URL(location.href);
    if (term) url.searchParams.set('q', term);
    else url.searchParams.delete('q');
    if (hash !== undefined) url.hash = hash;
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  const host = (u) => new URL(u).hostname.replace(/^www\./, '');

  function el(tag, props, kids) {
    const n = document.createElement(tag);
    Object.assign(n, props || {});
    (kids || []).forEach((k) => n.append(k));
    return n;
  }

  function drawChips() {
    chips.replaceChildren();
    [{ id: 'all', title: 'All' }, ...data.sections].forEach((s) => {
      const b = el('button', { type: 'button', textContent: s.title.replace(/ job sites$/i, '').replace(/-specific/i, '') });
      b.setAttribute('aria-pressed', String(s.id === active));
      b.onclick = () => {
        active = s.id;
        syncUrl(q.value.trim(), '#' + s.id);
        render();
      };
      chips.append(b);
    });
  }

  function render() {
    drawChips();
    const term = q.value.trim().toLowerCase();
    list.replaceChildren();
    let n = 0;
    data.sections.forEach((s) => {
      if (active !== 'all' && s.id !== active) return;
      const items = s.items.filter((i) => !term || (i.name + ' ' + i.note + ' ' + i.url + ' ' + s.title).toLowerCase().includes(term));
      if (!items.length) return;
      n += items.length;
      const ul = el('ul');
      items.forEach((i) => {
        const a = el('a', { href: i.url, textContent: i.name, target: '_blank', rel: 'noopener noreferrer' });
        const li = el('li', {}, [a, el('span', { className: 'host', textContent: host(i.url) })]);
        if (i.note) li.append(el('p', { textContent: i.note }));
        ul.append(li);
      });
      list.append(el('section', { id: s.id }, [el('h2', { textContent: s.title }), ul]));
    });
    if (!n) list.append(el('p', { className: 'empty', textContent: 'Nothing matches that search.' }));
    count.textContent = n + (n === 1 ? ' site' : ' sites');
  }
  function isEditable(target) {
    const node = target && target.nodeType === 3 ? target.parentElement : target;
    if (!node || node.nodeType !== 1) return false;
    if (node.isContentEditable) return true;
    return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT';
  }

  q.placeholder = 'Search sites (press /)';
  q.setAttribute('aria-keyshortcuts', '/');
  q.addEventListener('input', () => {
    syncUrl(q.value.trim());
    render();
  });
  q.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    e.preventDefault();
    if (q.value) {
      q.value = '';
      syncUrl('');
      render();
    }
    q.blur();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.defaultPrevented) return;
    if (isEditable(e.target) || isEditable(document.activeElement)) return;
    e.preventDefault();
    q.focus();
    q.select();
  });
  render();
})();
