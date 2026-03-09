export function resolveBlankPointOnPage(targetPageIndex: number): { x: number; y: number } | null {
  const pageRoot = document.querySelector<HTMLElement>(`[data-page-index="${String(targetPageIndex)}"]`);
  if (!pageRoot) {
    return null;
  }

  const rect = pageRoot.getBoundingClientRect();
  const left = Math.max(rect.left + 8, 8);
  const top = Math.max(rect.top + 8, 8);
  const right = Math.min(rect.right - 8, window.innerWidth - 8);
  const bottom = Math.min(rect.bottom - 8, window.innerHeight - 8);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const steps = 15;
  const isPageElement = (element: Element) =>
    element === pageRoot || (element instanceof HTMLElement && pageRoot.contains(element));
  const firstSafePoint = (candidates: Array<{ x: number; y: number }>) =>
    candidates.find((candidate) => !isOccupied(candidate.x, candidate.y)) ?? null;

  const isOccupied = (x: number, y: number) => {
    const elements = document.elementsFromPoint(x, y);
    const hasPageElement = elements.some((element) => isPageElement(element));
    if (!hasPageElement) {
      return true;
    }
    return elements.some((element) => {
      if (!(element instanceof Element)) {
        return false;
      }
      return (
        element.closest('[data-testid="selection-overlay"]') !== null ||
        element.closest('[data-testid="select-hit-target"]') !== null ||
        element.closest('[data-testid="shape-creation-overlay"]') !== null ||
        element.getAttribute('data-annotation-index') !== null
      );
    });
  };

  const cornerCandidates = [
    { x: left + 12, y: top + 12 },
    { x: right - 12, y: top + 12 },
    { x: left + 12, y: bottom - 12 },
    { x: right - 12, y: bottom - 12 },
    { x: left + 12, y: top + height * 0.5 },
    { x: right - 12, y: top + height * 0.5 },
    { x: left + width * 0.5, y: top + 12 },
    { x: left + width * 0.5, y: bottom - 12 },
  ];
  const cornerPoint = firstSafePoint(cornerCandidates);
  if (cornerPoint !== null) {
    return cornerPoint;
  }

  for (let row = 0; row <= steps; row++) {
    for (let col = 0; col <= steps; col++) {
      const x = left + width * ((col + 0.5) / (steps + 1));
      const y = top + height * ((row + 0.5) / (steps + 1));
      if (!isOccupied(x, y)) {
        return { x, y };
      }
    }
  }

  return null;
}
