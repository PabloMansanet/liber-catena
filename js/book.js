// What the reader asks for, worked out from book.json, with no DOM: which
// page a typed number opens, what to call an event, and what kind of button
// each GO TO is. book.json is written by `book_converter player-app`.

/**
 * The page a reader typed. One of:
 * - { kind: "terrains", number, intro, sections }: read the section for a terrain
 * - { kind: "location", number, node }: a quest location and its quest, read whole
 * - { kind: "town", number, node }: a town, read whole
 * - { kind: "underDevelopment", number }: a page the book has room for, still empty
 * - { kind: "wrongTurn", input }: anything else, the unused pages (31 to 40) too
 */
export function resolvePage(book, input) {
  const text = String(input ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return { kind: 'wrongTurn', input: text };
  const number = Number(text);
  const page = book.pages[number];
  if (page) return { ...page, number };
  const [firstUnused, lastUnused] = book.unusedPages ?? [];
  if (number >= firstUnused && number <= lastUnused) return { kind: 'wrongTurn', input: text };
  // Any other page up to the last the book lays out is still to be written.
  if (number >= 1 && number <= book.lastPage) return { kind: 'underDevelopment', number };
  return { kind: 'wrongTurn', input: text };
}

/** Where a node is in the book, as a GO TO prints it: "74-G", or "3" for a page. */
export function addressOf(node) {
  if (!node) return '?';
  return node.address ?? (node.page != null ? String(node.page) : '?');
}

/** Whether a node starts a page: a terrain section, a location, a town or a reference page. */
export function isPage(node) {
  return node.kind !== 'event';
}

/**
 * How a node is headed: for events, their address and printed title; for
 * page sections, their page and title (a terrain, a location, a town, a
 * reference page's name). `terrain` is set when the title is one.
 */
export function heading(book, node) {
  if (isPage(node)) {
    const title = node.title ?? '';
    return {
      kicker: `Page ${addressOf(node)}`,
      title,
      terrain: book.terrains.includes(title) ? title : null,
    };
  }
  return { kicker: addressOf(node), title: node.title, terrain: null };
}

/**
 * What a GO TO is for, from why the book follows it:
 * - roll: a result of the weather vane, with its directions as the label
 * - plain: anything else (a choice, a condition, a link with no condition)
 */
export function linkTone(link) {
  switch (link?.kind) {
    case 'roll':
      return { tone: 'roll', label: link.clause ?? '' };
    default:
      return { tone: 'plain', label: '' };
  }
}

/** Whether tapping anywhere on a choice can follow its one GO TO. */
export function followsWholeChoice(links) {
  return (
    links.length === 1 &&
    links[0].to != null &&
    ['choice', 'direct'].includes(links[0].kind)
  );
}

/**
 * Whether nothing is written after `node` within `root`, so that reading on
 * from it leaves the text. The other options of its choice don't count, nor
 * does the punctuation that closes its sentence.
 */
export function endsText(node, root) {
  for (let at = node; at && at !== root; at = at.parentNode) {
    for (let next = at.nextSibling; next; next = next.nextSibling) {
      if (at.nodeName === 'LI' && next.nodeName === 'LI') continue;
      if (/[^\s.,;:!?]/.test(next.textContent ?? '')) return false;
    }
  }
  return true;
}
