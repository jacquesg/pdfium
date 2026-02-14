# Toolbar

`@scaryterry/pdfium/react` ships two toolbar components:

- **`DefaultToolbar`** -- a ready-made, unstyled reference toolbar that renders
  native HTML controls for every viewer action.
- **`PDFToolbar`** -- a headless compound component that exposes five **slot**
  sub-components with render props, giving you full control over markup and
  styling.

`DefaultToolbar` is built on top of `PDFToolbar` internally, so every
customisation available through the advanced API is also available when
extending the default toolbar.

---

## DefaultToolbar

```tsx
import { DefaultToolbar } from '@scaryterry/pdfium/react';
```

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `viewer` | `UseViewerSetupResult \| undefined` | Context value | Override the viewer state for navigation, zoom, fit, and scroll controls. When omitted the component reads state from the nearest `<PDFViewer>` context automatically. Can be used outside `<PDFViewer>` by passing an explicit `viewer` — the search toggle will be omitted since search state lives in the `<PDFViewer>` context. |
| `children` | `ReactNode \| undefined` | -- | Additional content **appended** after the default toolbar controls. Use this to add extra buttons or indicators without rebuilding the entire toolbar. |
| `className` | `string \| undefined` | -- | CSS class applied to the root `<div>` element. |
| `style` | `CSSProperties \| undefined` | -- | Inline styles applied to the root `<div>` element. |

### Basic usage

```tsx
<PDFViewer>
  <DefaultToolbar />
</PDFViewer>
```

### Extending with children

Any `children` are rendered **after** the built-in controls. This is the
simplest way to add a download button or other custom actions:

```tsx
<DefaultToolbar>
  <button onClick={handleDownload}>Download</button>
</DefaultToolbar>
```

### HTML output and CSS targeting

`DefaultToolbar` renders native, unstyled HTML elements. Each logical group is
wrapped in a `<div>` carrying a `data-toolbar-group` attribute that you can
target from CSS:

```html
<div role="toolbar" aria-orientation="horizontal">
  <!-- Navigation -->
  <div data-toolbar-group="navigation">
    <button>Prev</button>
    <input type="number" style="width: 48px; text-align: center" />
    <span>/ 12</span>
    <button>Next</button>
  </div>

  <span aria-hidden="true">|</span>

  <!-- Zoom -->
  <div data-toolbar-group="zoom">
    <button>-</button>
    <span>100%</span>
    <button>+</button>
  </div>

  <span aria-hidden="true">|</span>

  <!-- Fit -->
  <div data-toolbar-group="fit">
    <button>Fit W</button>
    <button>Fit P</button>
  </div>

  <span aria-hidden="true">|</span>

  <!-- Scroll mode -->
  <div data-toolbar-group="scroll-mode">
    <select>
      <option value="continuous">Continuous</option>
      <option value="single">Single page</option>
    </select>
  </div>

  <span aria-hidden="true">|</span>

  <!-- Search toggle (text changes based on state) -->
  <button>Search</button>  <!-- or "Close Search" when open -->
</div>
```

Style individual groups with attribute selectors:

```css
[data-toolbar-group='navigation'] {
  gap: 8px;
}

[data-toolbar-group='zoom'] button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

[data-toolbar-group='scroll-mode'] select {
  padding: 4px 8px;
}
```

---

## PDFToolbar (Advanced)

```tsx
import { PDFToolbar } from '@scaryterry/pdfium/react';
```

`PDFToolbar` is a headless compound component. The root element renders a
`<div role="toolbar">` and provides context to five **slot** sub-components.
Each slot accepts a single **render prop** (`children` function) that receives
the relevant state and **prop-getter** functions.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `viewer` | `UseViewerSetupResult` | *required* | The viewer state object, typically from `useViewerSetup()` or the `<PDFViewer>` context. |
| `search` | `ToolbarSearchState \| undefined` | -- | Optional search state. When provided, enables the `PDFToolbar.Search` slot. When omitted the search slot renders nothing. |
| `children` | `ReactNode \| undefined` | -- | Slot sub-components and any additional elements. |
| `className` | `string \| undefined` | -- | CSS class applied to the root `<div>` element. |
| `style` | `CSSProperties \| undefined` | -- | Inline styles applied to the root `<div>` element. |

### Slot sub-components

Each slot is accessed as a static property on `PDFToolbar`:

| Slot | Render props type | Description |
| --- | --- | --- |
| `PDFToolbar.Navigation` | `NavigationRenderProps` | Page navigation controls |
| `PDFToolbar.Zoom` | `ZoomRenderProps` | Zoom in/out/reset controls |
| `PDFToolbar.Fit` | `FitRenderProps` | Fit-to-width and fit-to-page |
| `PDFToolbar.ScrollMode` | `ScrollModeRenderProps` | Continuous vs single-page toggle |
| `PDFToolbar.Search` | `SearchRenderProps` | Search input, match navigation, toggle |

---

### NavigationRenderProps

Passed to the `PDFToolbar.Navigation` render prop.

| Field | Type | Description |
| --- | --- | --- |
| `pageIndex` | `number` | Zero-based index of the current page. |
| `setPageIndex` | `(index: number) => void` | Set the current page by zero-based index. |
| `next` | `() => void` | Navigate to the next page. |
| `prev` | `() => void` | Navigate to the previous page. |
| `canNext` | `boolean` | `true` when a next page exists. |
| `canPrev` | `boolean` | `true` when a previous page exists. |
| `pageCount` | `number` | Total number of pages in the document. |
| `pageNumber` | `number` | One-based page number (`pageIndex + 1`), or `0` when the document has no pages. |
| `goToPage` | `(pageNumber: number) => void` | Navigate to a one-based page number. The value is clamped to valid bounds. |
| `getPrevProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "previous page" button. |
| `getNextProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "next page" button. |
| `getInputProps` | `(overrides?: InputOverrides) => InputProps` | Prop-getter for the page number `<input>`. |

### ZoomRenderProps

Passed to the `PDFToolbar.Zoom` render prop.

| Field | Type | Description |
| --- | --- | --- |
| `scale` | `number` | Current zoom scale (e.g. `1.0` = 100%). |
| `setScale` | `(scale: number) => void` | Set the zoom scale directly. Clears any active fit mode. |
| `zoomIn` | `() => void` | Increment zoom by one step. |
| `zoomOut` | `() => void` | Decrement zoom by one step. |
| `reset` | `() => void` | Reset zoom to the initial scale. |
| `canZoomIn` | `boolean` | `true` when the scale has not reached the maximum. |
| `canZoomOut` | `boolean` | `true` when the scale has not reached the minimum. |
| `percentage` | `number` | Current scale expressed as a rounded percentage (e.g. `150`). |
| `getZoomInProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "zoom in" button. |
| `getZoomOutProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "zoom out" button. |
| `getResetProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "reset zoom" button. |

### FitRenderProps

Passed to the `PDFToolbar.Fit` render prop.

| Field | Type | Description |
| --- | --- | --- |
| `fitWidth` | `() => void` | Apply fit-to-width zoom. |
| `fitPage` | `() => void` | Apply fit-to-page zoom. |
| `fitScale` | `(mode: FitMode) => number` | Compute the scale value for a given fit mode without applying it. `FitMode` is `'page-width' \| 'page-height' \| 'page-fit'`. |
| `activeFitMode` | `FitMode \| null` | The currently active fit mode, or `null` if the user has manually zoomed since the last fit action. |
| `getFitWidthProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "fit to width" button. |
| `getFitPageProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "fit to page" button. |

### ScrollModeRenderProps

Passed to the `PDFToolbar.ScrollMode` render prop.

| Field | Type | Description |
| --- | --- | --- |
| `scrollMode` | `'continuous' \| 'single'` | The active scroll mode. |
| `setScrollMode` | `(mode: 'continuous' \| 'single') => void` | Set the scroll mode. |
| `options` | `ReadonlyArray<{ value: 'continuous' \| 'single'; label: string }>` | Pre-defined options array for rendering a `<select>`. Contains `{ value: 'continuous', label: 'Continuous' }` and `{ value: 'single', label: 'Single page' }`. |
| `getSelectProps` | `(overrides?: SelectOverrides) => SelectProps` | Prop-getter for the scroll mode `<select>`. |

### SearchRenderProps

Passed to the `PDFToolbar.Search` render prop. Only available when a
`ToolbarSearchState` is passed to the `PDFToolbar` root via the `search` prop.
If `search` is not provided, the `PDFToolbar.Search` slot renders nothing.

| Field | Type | Description |
| --- | --- | --- |
| `query` | `string` | The current search query string. |
| `setQuery` | `(query: string) => void` | Update the search query. |
| `totalMatches` | `number` | Total number of matches found across the document. |
| `currentIndex` | `number` | Zero-based index of the currently highlighted match. |
| `isSearching` | `boolean` | `true` while the search operation is in progress. |
| `next` | `() => void` | Navigate to the next match. |
| `prev` | `() => void` | Navigate to the previous match. |
| `isOpen` | `boolean` | Whether the search UI is currently open. |
| `toggle` | `() => void` | Toggle the search UI open/closed. |
| `getInputProps` | `(overrides?: InputOverrides) => SearchInputProps` | Prop-getter for the search `<input>`. Returns `type: 'search'` with a `placeholder` of `'Search...'`. |
| `getToggleProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the search toggle button. The `aria-label` switches between `'Open search'` and `'Close search'` based on `isOpen`. |
| `getNextProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "next match" button. Disabled when `totalMatches === 0`. |
| `getPrevProps` | `(overrides?: ButtonOverrides) => ButtonProps` | Prop-getter for the "previous match" button. Disabled when `totalMatches === 0`. |

---

### The prop-getter pattern

Every slot provides one or more **prop-getter** functions (e.g.
`getNextProps`, `getZoomInProps`, `getSelectProps`). These return a plain
object containing all the props a native HTML element needs to function
correctly -- `type`, `disabled`, `onClick`, `aria-label`, etc.

**Always spread the result onto your element:**

```tsx
<button {...getNextProps()}>Next</button>
```

**Merge your own overrides by passing them as an argument.** Your values are
spread *after* the defaults, so they take precedence:

```tsx
<button {...getNextProps({ className: 'my-btn', style: { color: 'blue' } })}>
  Next
</button>
```

Prop-getters are safe to call conditionally. They are plain functions with no
side effects:

```tsx
{canNext && <button {...getNextProps()}>Next</button>}
```

Each prop-getter returns a typed object (`ButtonProps`, `InputProps`,
`SelectProps`, or `SearchInputProps`) so your editor will provide full
autocompletion on the returned props.

---

### Complete custom toolbar example

```tsx
import { PDFToolbar } from '@scaryterry/pdfium/react';
import type { ToolbarSearchState } from '@scaryterry/pdfium/react';

interface MyToolbarProps {
  viewer: UseViewerSetupResult;
  search: ToolbarSearchState;
}

function MyToolbar({ viewer, search }: MyToolbarProps) {
  return (
    <PDFToolbar viewer={viewer} search={search} className="my-toolbar">
      <PDFToolbar.Navigation>
        {({ getPrevProps, getNextProps, getInputProps, pageNumber, pageCount }) => (
          <div className="nav-group">
            <button {...getPrevProps({ className: 'icon-btn' })}>
              <ChevronLeftIcon />
            </button>
            <label>
              Page{' '}
              <input {...getInputProps({ className: 'page-input' })} />
              {' '}of {pageCount}
            </label>
            <button {...getNextProps({ className: 'icon-btn' })}>
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </PDFToolbar.Navigation>

      <PDFToolbar.Zoom>
        {({ getZoomInProps, getZoomOutProps, getResetProps, percentage }) => (
          <div className="zoom-group">
            <button {...getZoomOutProps({ className: 'icon-btn' })}>
              <MinusIcon />
            </button>
            <span className="zoom-label">{percentage}%</span>
            <button {...getZoomInProps({ className: 'icon-btn' })}>
              <PlusIcon />
            </button>
            <button {...getResetProps({ className: 'text-btn' })}>
              Reset
            </button>
          </div>
        )}
      </PDFToolbar.Zoom>

      <PDFToolbar.Fit>
        {({ getFitWidthProps, getFitPageProps, activeFitMode }) => (
          <div className="fit-group">
            <button
              {...getFitWidthProps({
                className: activeFitMode === 'page-width' ? 'active' : undefined,
              })}
            >
              Fit Width
            </button>
            <button
              {...getFitPageProps({
                className: activeFitMode === 'page-fit' ? 'active' : undefined,
              })}
            >
              Fit Page
            </button>
          </div>
        )}
      </PDFToolbar.Fit>

      <PDFToolbar.ScrollMode>
        {({ getSelectProps, options }) => (
          <div className="scroll-group">
            <label>
              Layout:{' '}
              <select {...getSelectProps({ className: 'scroll-select' })}>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </PDFToolbar.ScrollMode>

      <PDFToolbar.Search>
        {({
          getInputProps,
          getToggleProps,
          getNextProps,
          getPrevProps,
          isOpen,
          totalMatches,
          currentIndex,
          isSearching,
        }) => (
          <div className="search-group">
            <button {...getToggleProps({ className: 'icon-btn' })}>
              <SearchIcon />
            </button>
            {isOpen && (
              <div className="search-bar">
                <input {...getInputProps({ className: 'search-input' })} />
                <span className="match-count">
                  {isSearching
                    ? 'Searching...'
                    : totalMatches > 0
                      ? `${currentIndex + 1} / ${totalMatches}`
                      : 'No matches'}
                </span>
                <button {...getPrevProps({ className: 'icon-btn' })}>
                  <ChevronUpIcon />
                </button>
                <button {...getNextProps({ className: 'icon-btn' })}>
                  <ChevronDownIcon />
                </button>
              </div>
            )}
          </div>
        )}
      </PDFToolbar.Search>
    </PDFToolbar>
  );
}
```

---

## Type definitions

All types below are exported from `@scaryterry/pdfium/react`.

### Prop-getter override types

These are the argument types accepted by every prop-getter function. Pass them
to merge your own class names or styles with the defaults.

```ts
interface ButtonOverrides {
  className?: string;
  style?: CSSProperties;
}

interface InputOverrides {
  className?: string;
  style?: CSSProperties;
}

interface SelectOverrides {
  className?: string;
  style?: CSSProperties;
}
```

### Prop-getter return types

These are the objects returned by prop-getters. Spread them onto native HTML
elements.

```ts
interface ButtonProps extends ButtonOverrides {
  type: 'button';
  disabled: boolean;
  onClick: () => void;
  'aria-label': string;
}

interface InputProps extends InputOverrides {
  type: 'number';
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  'aria-label': string;
}

interface SelectProps extends SelectOverrides {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  'aria-label': string;
}

interface SearchInputProps extends InputOverrides {
  type: 'search';
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  'aria-label': string;
}
```

### ToolbarSearchState

The search state object passed to `PDFToolbar` via the `search` prop. When
using `DefaultToolbar` this is assembled automatically from the `<PDFViewer>`
context.

```ts
interface ToolbarSearchState {
  query: string;
  setQuery: (query: string) => void;
  totalMatches: number;
  currentIndex: number;
  isSearching: boolean;
  next: () => void;
  prev: () => void;
  isOpen: boolean;
  toggle: () => void;
}
```
