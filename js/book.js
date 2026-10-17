// What the reader asks for, worked out from book.json, with no DOM: which
// page a typed number opens, what to call an event, and what kind of button
// each GO TO is. book.json is written by `book_converter player-app`.

/**
 * The page a reader typed. One of:
 * - { kind: "terrains", number, intro, sections }: read the section for a terrain
 * - { kind: "location", number, node }: a special location, read whole
 * - { kind: "underDevelopment", number }: a page the book has room for, still empty
 * - { kind: "wrongTurn", input }: anything else
 */
export function resolvePage(book, input) {
  const text = String(input ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return { kind: 'wrongTurn', input: text };
  const number = Number(text);
  const page = book.pages[number];
  if (page) return { ...page, number };
  // Fortune and reference pages are numbered up to the first location; the
  // last location's page ends the book.
  const last = Math.max(book.firstLocationPage - 1, book.lastPage);
  if (number >= 1 && number <= last) return { kind: 'underDevelopment', number };
  return { kind: 'wrongTurn', input: text };
}

/** Where a node is in the book, as a GO TO prints it: "74-G", or "3" for a page. */
export function addressOf(node) {
  if (!node) return '?';
  return node.address ?? (node.page != null ? String(node.page) : '?');
}

/** Whether a node starts a page: a terrain section, a location or a reference page. */
export function isPage(node) {
  return node.kind !== 'event';
}

/**
 * How a node is headed: for events, their address and printed title; for
 * page sections, their page and title (a terrain, a location, a reference
 * page's name). `terrain` is set when the title is one.
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
 * - success / failure: the result of a trial
 * - roll: a luck roll result, with its range as the label
 * - plain: anything else (a choice, a condition, a link with no condition)
 */
export function linkTone(link) {
  switch (link?.kind) {
    case 'success':
      return { tone: 'success', label: 'Success' };
    case 'failure':
      return { tone: 'failure', label: 'Failure' };
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
    ['choice', 'direct', 'trial'].includes(links[0].kind)
  );
}
