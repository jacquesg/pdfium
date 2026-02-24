const STRUCTURE_PANEL_COPY = {
  structureTabLabel: 'Structure',
  namedDestinationsTabLabel: 'Named Dests',
  taggedBadge: 'Tagged',
  notTaggedBadge: 'Not Tagged',
  pageLabel: 'Page:',
  pageValueLabel: 'Page',
  noStructureElementsMessage: 'No structure elements on this page.',
  notTaggedMessage: 'This document is not tagged. Structure information is unavailable.',
  searchLabel: 'Look up by name',
  searchPlaceholder: 'e.g. chapter1',
  searchButtonLabel: 'Search',
  noNamedDestinationsMessage: 'No named destinations found.',
  nameColumnHeader: 'Name',
  pageIndexColumnHeader: 'Page Index',
} as const;

function formatNoDestinationFound(name: string): string {
  return `No destination found for \u201c${name}\u201d`;
}

function formatNamedDestinationPage(pageIndex: number): string {
  return `${pageIndex + 1} (index ${pageIndex})`;
}

export { STRUCTURE_PANEL_COPY, formatNamedDestinationPage, formatNoDestinationFound };
