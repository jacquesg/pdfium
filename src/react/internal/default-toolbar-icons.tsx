const DEFAULT_TOOLBAR_ICON_SIZE = 18;

function ContinuousScrollIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="1" width="10" height="7" rx="1" />
      <rect x="4" y="10" width="10" height="7" rx="1" />
    </svg>
  );
}

function SinglePageIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="2" width="12" height="14" rx="1" />
    </svg>
  );
}

function HorizontalScrollIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="7" height="10" rx="1" />
      <rect x="10" y="4" width="7" height="10" rx="1" />
      <path d="M4 14.5L1.5 16.5M4 14.5L6.5 16.5" />
    </svg>
  );
}

function NoSpreadIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="8" height="14" rx="1" />
    </svg>
  );
}

function OddSpreadIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="7" height="14" rx="1" />
      <rect x="10" y="2" width="7" height="14" rx="1" />
      <line x1="2.5" y1="5" x2="6.5" y2="5" strokeWidth="1" opacity="0.4" />
      <line x1="2.5" y1="7.5" x2="5" y2="7.5" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function EvenSpreadIcon() {
  return (
    <svg
      width={DEFAULT_TOOLBAR_ICON_SIZE}
      height={DEFAULT_TOOLBAR_ICON_SIZE}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="7" height="14" rx="1" />
      <rect x="10" y="2" width="7" height="14" rx="1" />
      <line x1="11.5" y1="5" x2="15.5" y2="5" strokeWidth="1" opacity="0.4" />
      <line x1="11.5" y1="7.5" x2="14" y2="7.5" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export {
  ContinuousScrollIcon,
  DEFAULT_TOOLBAR_ICON_SIZE,
  EvenSpreadIcon,
  HorizontalScrollIcon,
  NoSpreadIcon,
  OddSpreadIcon,
  SinglePageIcon,
};
