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
      b.onclick = () => { active = s.id; history.replaceState(null, '', '#' + s.id); render(); };
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
  q.addEventListener('input', render);
  render();
})();
