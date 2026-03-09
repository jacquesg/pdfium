export function selectTextRangeAcrossTwoLines(pageEl: Element): boolean {
  const spans = Array.from(pageEl.querySelectorAll('span'))
    .map((span) => {
      const node = span.firstChild;
      const raw = node?.textContent ?? '';
      const text = raw.trim();
      if (node === null || node.nodeType !== Node.TEXT_NODE || text.length < 2) {
        return null;
      }
      const rect = span.getBoundingClientRect();
      return { node, raw, text, top: rect.top, left: rect.left, height: rect.height };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => (Math.abs(a.top - b.top) > 1 ? a.top - b.top : a.left - b.left));

  if (spans.length < 2) return false;

  const start = spans[0]!;
  const lineThreshold = Math.max(4, start.height * 0.5);
  const end = spans.find((span) => Math.abs(span.top - start.top) > lineThreshold);
  if (!end) return false;

  const range = document.createRange();
  range.setStart(start.node, 0);
  range.setEnd(end.node, Math.max(1, Math.min(end.raw.length, 8)));

  const selection = window.getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection.toString().trim().length > 0;
}
