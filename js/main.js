// The player app: type a page, pick your terrain, read, and follow the GO TOs.
// Every view has its own address after the #, so the phone's back button
// steps back through what the party read:
//   #/          the page entry
//   #/p/14      a page: its terrains, or a special location
//   #/e/<id>    a page section or an event

import { addressOf, followsWholeChoice, heading, linkTone, resolvePage } from './book.js';

const app = document.getElementById('app');
const LAST_READ = 'liber-catena:last-read';
let book = null;

// ---------------------------------------------------------------- helpers

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const icon = (name, alt = '', cls = 'icon') => el('img', { class: cls, src: `img/${name}.png`, alt });
const terrainIcon = (terrain) => icon(`${terrain.toLowerCase()}_icon`, '', 'terrain-icon');
const nodeHref = (id) => `#/e/${encodeURIComponent(id)}`;
const pageHref = (number) => `#/p/${encodeURIComponent(number)}`;

function remember(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private windows may refuse; remembering is only a convenience.
  }
}

function recall(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Opened straight on an event, there's nothing to go back to but the entry.
function goBack() {
  if (history.length > 1) history.back();
  else navigate('#/');
}

/** The bar over every page but the entry: back, and close the book. */
function topBar() {
  return el(
    'nav',
    { class: 'topbar' },
    el('button', { class: 'bar-button', type: 'button', onclick: goBack },
      el('span', { class: 'chevron', 'aria-hidden': 'true' }, '‹'), 'Back'),
    el('a', { class: 'bar-button', href: '#/' }, 'Close the book'),
  );
}

// ---------------------------------------------------------------- views

function renderHome(message, typed = '') {
  const input = el('input', {
    id: 'page-input',
    class: 'page-input',
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    enterkeyhint: 'go',
    'aria-label': 'Page number',
    value: typed,
  });
  const form = el(
    'form',
    {
      class: 'page-form',
      onsubmit: (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (value) navigate(pageHref(value));
        else input.focus();
      },
    },
    el('label', { for: 'page-input', class: 'page-label' }, 'Turn to page'),
    input,
    el('button', { class: 'button primary', type: 'submit' }, 'Open the book'),
  );

  const lastId = recall(LAST_READ);
  const last = lastId && book.nodes[lastId];
  app.replaceChildren(
    el(
      'main',
      { class: 'home' },
      el('img', { class: 'medallion', src: 'icons/icon-192.png', alt: '' }),
      el('h1', { class: 'book-title' }, 'Liber Catena'),
      el('p', { class: 'book-subtitle' }, 'The Book of Chains'),
      el('div', { class: 'rule', 'aria-hidden': 'true' }),
      form,
      message,
      last &&
        el(
          'a',
          { class: 'last-read', href: nodeHref(lastId) },
          el('span', { class: 'last-read-label' }, 'Where you left off'),
          el('span', { class: 'last-read-target' }, describe(last)),
        ),
      el(
        'footer',
        { class: 'colophon' },
        el('p', {}, `Edition ${book.edition.slice(0, 7)}`),
        el('p', {}, 'Titles set in Nodesto Caps by Solbera (CC BY-SA 4.0)'),
      ),
    ),
  );
  if (message) input.select();
}

/** An address in the titles' font, whose hyphen looks like a full stop. */
function addressText(address) {
  const [page, letter] = address.split('-');
  return el('span', {}, page, letter && el('span', { class: 'address-dash' }, '-'), letter);
}

/** A short label for an event or section: "📖 74-G · Fair Game". */
function describe(node) {
  const { kicker, title } = heading(book, node);
  return [el('img', { class: 'book-glyph', src: 'img/book.png', alt: '' }), ' ', kicker, title ? ` · ${title}` : ''];
}

function notice(kind, title, text) {
  return el(
    'div',
    { class: `notice notice-${kind}`, role: 'status' },
    el('p', { class: 'notice-title' }, title),
    el('p', {}, text),
  );
}

function renderPage(input) {
  const page = resolvePage(book, input);
  switch (page.kind) {
    case 'wrongTurn':
      return renderHome(
        notice(
          'wrong',
          "You've taken a wrong turn…",
          page.input
            ? `There's no page “${page.input}” that leads to an event. Check the number and try again.`
            : 'Type the number of the page you were sent to.',
        ),
        page.input,
      );
    case 'underDevelopment':
      return renderHome(
        notice(
          'pending',
          `Page ${page.number} is under development`,
          'Nothing is written on this page yet.',
        ),
        String(page.number),
      );
    case 'location':
      return renderNode(page.node);
    case 'terrains':
      return renderTerrains(page);
  }
}

function renderTerrains(page) {
  const intro = page.intro && book.nodes[page.intro];
  const grid = el(
    'div',
    { class: 'terrain-grid' },
    book.terrains.map((terrain) => {
      const id = page.sections[terrain];
      return id
        ? el('a', { class: 'terrain', href: nodeHref(id) }, terrainIcon(terrain), el('span', {}, terrain))
        : el(
            'span',
            { class: 'terrain missing', 'aria-disabled': 'true' },
            terrainIcon(terrain),
            el('span', {}, terrain),
            el('small', {}, 'Not yet written'),
          );
    }),
  );
  app.replaceChildren(
    topBar(),
    el(
      'main',
      { class: 'reading' },
      el(
        'header',
        { class: 'page-head' },
        el('p', { class: 'kicker' }, `Page ${page.number}`),
        el('h1', {}, intro?.title ?? 'Where are you?'),
      ),
      intro ? bookText(intro) : el('p', { class: 'lead' }, "Read the section for the terrain you're in."),
      grid,
    ),
  );
}

function renderNode(id) {
  const node = book.nodes[id];
  if (!node) {
    return renderHome(
      notice('wrong', "You've taken a wrong turn…", "That part of the book doesn't exist any more. Turn to a page to carry on."),
    );
  }
  remember(LAST_READ, id);
  const { kicker, title, terrain } = heading(book, node);
  const head =
    node.kind === 'event'
      ? el(
          'header',
          { class: 'event-head' },
          el('p', { class: 'address' }, el('img', { class: 'book-glyph', src: 'img/book.png', alt: '' }), addressText(kicker)),
          title && el('h1', {}, title),
        )
      : el(
          'header',
          { class: 'page-head' },
          el('p', { class: 'kicker' }, kicker),
          el('h1', {}, terrain && terrainIcon(terrain), title),
        );

  const next = node.next && book.nodes[node.next];
  const end = el(
    'footer',
    { class: 'event-end' },
    next
      ? el(
          'a',
          { class: 'button primary', href: nodeHref(node.next), 'data-follow': '' },
          'Continue reading',
          el('span', { class: 'button-address' }, addressOf(next)),
        )
      : el('div', { class: 'rule end-rule', 'aria-hidden': 'true' }),
    el('a', { class: 'button', href: '#/' }, 'Close the book'),
  );

  app.replaceChildren(topBar(), el('main', { class: 'reading' }, head, bookText(node), end));
}

/**
 * The node's text as the book prints it, with its GO TOs turned into
 * buttons that say what they're for: a success, a failure, a luck roll.
 */
function bookText(node) {
  const body = el('article', { class: 'book-text' });
  body.innerHTML = node.html;

  const gotos = [...body.querySelectorAll('.goto')];
  gotos.forEach((goto, i) => {
    const link = node.links[i];
    if (goto.classList.contains('broken')) {
      goto.textContent = 'GO TO … (event under development)';
      return;
    }
    const id = goto.dataset.node;
    const target = book.nodes[id];
    const { tone, label } = linkTone(link);
    goto.className = `goto tone-${tone}`;
    goto.href = nodeHref(id);
    goto.dataset.follow = '';
    const mark = {
      success: () => el('span', { class: 'goto-mark', 'aria-label': label }, '✓'),
      failure: () => el('span', { class: 'goto-mark', 'aria-label': label }, '✗'),
      roll: () => el('span', { class: 'goto-roll', 'aria-label': `Rolled ${label}` }, label),
    }[tone];
    goto.replaceChildren(
      ...(mark ? [mark()] : []),
      el('span', { class: 'goto-verb' }, 'GO TO'),
      el('img', { class: 'book-glyph', src: 'img/book.png', alt: '' }),
      el('span', { class: 'goto-address' }, addressOf(target)),
    );
  });

  // "Continue reading" goes on to the next event, when there is one.
  if (node.next) {
    body.querySelectorAll('.kw').forEach((kw) => {
      if (!/continue reading/i.test(kw.textContent)) return;
      const link = el('a', { class: 'kw kw-continue', href: nodeHref(node.next), 'data-follow': '' }, kw.textContent, ' ↓');
      kw.replaceWith(link);
    });
  }

  body.querySelectorAll('.attr').forEach((attr) => {
    const name = attr.textContent.trim();
    attr.replaceWith(el('img', { class: 'attr-icon', src: `img/${name.toLowerCase()}.png`, alt: name, title: name }));
  });

  // A choice with a single GO TO can be tapped anywhere.
  body.querySelectorAll('.choices > ul > li').forEach((item) => {
    const own = gotos.filter((goto) => item.contains(goto));
    const links = own.map((goto) => node.links[gotos.indexOf(goto)]).filter(Boolean);
    if (own.length !== 1 || !followsWholeChoice(links)) return;
    item.classList.add('choice-go');
    item.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      own[0].click();
    });
  });

  return body;
}

// ---------------------------------------------------------------- routing

// Scroll positions by address, so going back lands where the party was.
const scrolls = new Map();
let followed = false;

function navigate(hash) {
  followed = true;
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [view, ...rest] = hash.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  if (view === 'p' && arg) renderPage(arg);
  else if (view === 'e' && arg) renderNode(arg);
  else renderHome();

  const top = followed ? 0 : scrolls.get(location.hash) ?? 0;
  followed = false;
  window.scrollTo(0, top);
  app.classList.remove('turning');
  void app.offsetWidth;
  app.classList.add('turning');
  if (!hash) document.getElementById('page-input')?.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  if (event.target.closest("[data-follow], a[href^='#']")) followed = true;
});

let scrollTimer = 0;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  const hash = location.hash;
  scrollTimer = setTimeout(() => scrolls.set(hash, window.scrollY), 80);
});
window.addEventListener('hashchange', route);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// ---------------------------------------------------------------- start

function offerUpdate() {
  if (document.querySelector('.update')) return;
  document.body.append(
    el(
      'div',
      { class: 'update', role: 'status' },
      el('span', {}, 'A new edition of the book is ready.'),
      el('button', { class: 'button primary', type: 'button', onclick: () => location.reload() }, 'Reload'),
    ),
  );
}

if ('serviceWorker' in navigator) {
  const hadWorker = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadWorker) offerUpdate();
  });
  // Only works over HTTPS or on localhost; elsewhere the app just isn't
  // available offline.
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

fetch('book.json')
  .then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  })
  .then((data) => {
    book = data;
    route();
  })
  .catch((error) => {
    app.replaceChildren(
      el(
        'main',
        { class: 'home' },
        notice('wrong', "The book won't open", `It couldn't be loaded (${error.message}). Check your connection and try again.`),
      ),
    );
  });
