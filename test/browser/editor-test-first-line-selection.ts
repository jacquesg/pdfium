export function selectTextRangeOnFirstLine(pageEl: Element): boolean {
  const spans = Array.from(pageEl.querySelectorAll('span'));

  for (const span of spans) {
    const node = span.firstChild;
    if (node === null || node.nodeType !== Node.TEXT_NODE) continue;

    const raw = node.textContent ?? '';
    const text = raw.trim();
    if (text.length < 2) continue;

    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.max(1, Math.min(raw.length, 8)));

    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection.toString().length > 0;
  }

  return false;
}
