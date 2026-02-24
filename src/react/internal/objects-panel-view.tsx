import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import type { SerialisedPageObject } from '../../context/protocol.js';
import { formatObjectDetailHeading, formatObjectsTruncatedSummary, OBJECTS_PANEL_COPY } from './objects-panel-copy.js';
import {
  decodeFontFlags,
  formatObjectListBounds,
  getObjectTypeBadgeColours,
  type IndexedPageObject,
} from './objects-panel-helpers.js';
import {
  OBJECT_BOUNDS_LABEL_STYLE,
  OBJECT_DETAIL_CLOSE_STYLE,
  OBJECT_DETAIL_HEADER_STYLE,
  OBJECT_DETAIL_STACK_STYLE,
  OBJECT_DETAIL_TITLE_STYLE,
  OBJECT_FLAG_BADGE_STYLE,
  OBJECT_FLAG_CONTAINER_STYLE,
  OBJECT_INDEX_LABEL_STYLE,
  OBJECT_LIST_ITEM_BASE_STYLE,
  OBJECT_LIST_ITEM_HEADER_STYLE,
  OBJECT_MARK_NAME_STYLE,
  OBJECT_MARK_PARAMS_STYLE,
  OBJECT_MARK_STYLE,
  OBJECT_SEGMENT_CLOSE_STYLE,
  OBJECT_SEGMENT_ROW_STYLE,
  OBJECT_SEGMENT_TYPE_STYLE,
  OBJECT_SEGMENTS_CONTAINER_STYLE,
  OBJECT_SEGMENTS_LIST_STYLE,
  OBJECT_TEXT_BODY_STYLE,
  OBJECT_TEXT_PREVIEW_STYLE,
  OBJECT_TRUNCATION_BUTTON_STYLE,
  OBJECT_TRUNCATION_CONTAINER_STYLE,
  OBJECT_TRUNCATION_TEXT_STYLE,
  OBJECT_TYPE_BADGE_STYLE,
} from './objects-panel-view-styles.js';
import { PANEL_MONO_BLOCK_STYLE, PANEL_SECTION_HEADING_STYLE } from './panel-layout-styles.js';
import { PropertyTable } from './property-table.js';

interface ObjectListItemProps {
  obj: IndexedPageObject;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function ObjectListItem({ obj, isSelected, onSelect }: ObjectListItemProps) {
  const badge = getObjectTypeBadgeColours(obj.type);
  return (
    <button
      key={obj.index}
      type="button"
      data-panel-item=""
      onClick={() => onSelect(obj.index)}
      style={{
        ...OBJECT_LIST_ITEM_BASE_STYLE,
        border: isSelected
          ? '1px solid var(--pdfium-panel-accent-colour, #3b82f6)'
          : '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
        backgroundColor: isSelected
          ? 'var(--pdfium-panel-selected-bg, #eff6ff)'
          : 'var(--pdfium-panel-surface-colour, #ffffff)',
      }}
    >
      <div style={OBJECT_LIST_ITEM_HEADER_STYLE}>
        <span style={{ ...OBJECT_TYPE_BADGE_STYLE, backgroundColor: badge.bg, color: badge.colour }}>{obj.type}</span>
        <span style={OBJECT_INDEX_LABEL_STYLE}>#{obj.index}</span>
      </div>
      <div style={OBJECT_BOUNDS_LABEL_STYLE}>Box: {formatObjectListBounds(obj.bounds)}</div>
      {obj.text !== undefined && <div style={OBJECT_TEXT_PREVIEW_STYLE}>{obj.text.text}</div>}
    </button>
  );
}

function ObjectsTruncationNotice({
  maxVisible,
  totalObjects,
  onShowAll,
}: {
  maxVisible: number;
  totalObjects: number;
  onShowAll: () => void;
}) {
  return (
    <div style={OBJECT_TRUNCATION_CONTAINER_STYLE}>
      <span style={OBJECT_TRUNCATION_TEXT_STYLE}>{formatObjectsTruncatedSummary(maxVisible, totalObjects)} </span>
      <button type="button" onClick={onShowAll} style={OBJECT_TRUNCATION_BUTTON_STYLE}>
        {OBJECTS_PANEL_COPY.showAllLabel}
      </button>
    </div>
  );
}

function ObjectDetailPanel({ obj, onClose }: { obj: IndexedPageObject; onClose: () => void }) {
  return (
    <>
      <div style={OBJECT_DETAIL_HEADER_STYLE}>
        <h3 style={OBJECT_DETAIL_TITLE_STYLE}>{formatObjectDetailHeading(obj.index, obj.type)}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={OBJECTS_PANEL_COPY.closeDetailAriaLabel}
          style={OBJECT_DETAIL_CLOSE_STYLE}
        >
          <svg
            aria-hidden="true"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <ObjectDetail obj={obj} />
    </>
  );
}

function ObjectDetail({ obj }: { obj: IndexedPageObject }) {
  return (
    <div style={OBJECT_DETAIL_STACK_STYLE}>
      <PropertyTable
        rows={[
          { label: 'Type', value: obj.type },
          { label: 'Left', value: obj.bounds.left.toFixed(2) },
          { label: 'Top', value: obj.bounds.top.toFixed(2) },
          { label: 'Right', value: obj.bounds.right.toFixed(2) },
          { label: 'Bottom', value: obj.bounds.bottom.toFixed(2) },
        ]}
      />

      {obj.matrix !== undefined && <TransformMatrix matrix={obj.matrix} />}
      {obj.marks.length > 0 && <ContentMarks marks={obj.marks} />}
      {obj.text !== undefined && <TextDetail text={obj.text} />}
      {obj.image !== undefined && <ImageDetail image={obj.image} />}
      {obj.path !== undefined && <PathDetail path={obj.path} />}
    </div>
  );
}

function TransformMatrix({ matrix }: { matrix: SerialisedPageObject['matrix'] }) {
  return (
    <div>
      <SectionHeading>{OBJECTS_PANEL_COPY.transformMatrixHeading}</SectionHeading>
      <div
        style={{
          ...PANEL_MONO_BLOCK_STYLE,
          fontSize: '12px',
          padding: '8px',
          color: 'var(--pdfium-panel-colour, #374151)',
        }}
      >
        [{matrix.a.toFixed(3)}, {matrix.b.toFixed(3)}, {matrix.c.toFixed(3)}, {matrix.d.toFixed(3)},{' '}
        {matrix.e.toFixed(3)}, {matrix.f.toFixed(3)}]
      </div>
    </div>
  );
}

function ContentMarks({ marks }: { marks: SerialisedPageObject['marks'] }) {
  return (
    <div>
      <SectionHeading>
        {OBJECTS_PANEL_COPY.contentMarksHeading} ({marks.length})
      </SectionHeading>
      {marks.map((mark, mi) => (
        <div key={`${mark.name}-${mi}`} style={OBJECT_MARK_STYLE}>
          <span style={OBJECT_MARK_NAME_STYLE}>{mark.name}</span>
          {mark.params.length > 0 && (
            <div style={OBJECT_MARK_PARAMS_STYLE}>
              {mark.params.map((p) => (
                <div key={p.key}>
                  {p.key}: {String(p.value)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TextDetail({ text }: { text: NonNullable<SerialisedPageObject['text']> }) {
  const fontFlags = useMemo(() => decodeFontFlags(text.fontFlags), [text.fontFlags]);

  return (
    <div>
      <SectionHeading>{OBJECTS_PANEL_COPY.textDetailsHeading}</SectionHeading>
      <div
        style={{
          ...PANEL_MONO_BLOCK_STYLE,
          ...OBJECT_TEXT_BODY_STYLE,
        }}
      >
        {text.text}
      </div>
      <PropertyTable rows={[{ label: 'Font Size', value: text.fontSize.toFixed(1) }]} />

      <SectionHeading style={{ marginTop: '8px' }}>{OBJECTS_PANEL_COPY.fontHeading}</SectionHeading>
      <PropertyTable
        rows={[
          { label: 'Name', value: text.fontName },
          { label: 'Family', value: text.familyName },
          { label: 'Weight', value: text.weight },
          { label: 'Embedded', value: text.isEmbedded },
          { label: 'Italic Angle', value: text.italicAngle },
          { label: 'Ascent', value: text.metrics.ascent.toFixed(1) },
          { label: 'Descent', value: text.metrics.descent.toFixed(1) },
        ]}
      />
      {fontFlags.length > 0 && (
        <div style={OBJECT_FLAG_CONTAINER_STYLE}>
          {fontFlags.map((flag) => (
            <span key={flag} style={OBJECT_FLAG_BADGE_STYLE}>
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageDetail({ image }: { image: NonNullable<SerialisedPageObject['image']> }) {
  return (
    <div>
      <SectionHeading>{OBJECTS_PANEL_COPY.imageDetailsHeading}</SectionHeading>
      <PropertyTable
        rows={[
          { label: 'Width (px)', value: image.width },
          { label: 'Height (px)', value: image.height },
          { label: 'Colour Space', value: image.metadata.colourSpace },
          { label: 'H-DPI', value: image.metadata.horizontalDpi.toFixed(1) },
          { label: 'V-DPI', value: image.metadata.verticalDpi.toFixed(1) },
          { label: 'Bits/Pixel', value: image.metadata.bitsPerPixel },
        ]}
      />
    </div>
  );
}

function PathDetail({ path }: { path: NonNullable<SerialisedPageObject['path']> }) {
  return (
    <div>
      <SectionHeading>{OBJECTS_PANEL_COPY.pathDetailsHeading}</SectionHeading>
      <PropertyTable
        rows={[
          { label: 'Segments', value: path.segmentCount },
          { label: 'Fill Mode', value: path.drawMode.fill },
          { label: 'Stroke', value: path.drawMode.stroke },
          { label: 'Stroke Width', value: path.strokeWidth.toFixed(2) },
          { label: 'Line Cap', value: path.lineCap },
          { label: 'Line Join', value: path.lineJoin },
        ]}
      />
      {path.segments.length > 0 && (
        <div style={OBJECT_SEGMENTS_CONTAINER_STYLE}>
          <SectionHeading>{OBJECTS_PANEL_COPY.segmentsHeading}</SectionHeading>
          <div style={{ ...PANEL_MONO_BLOCK_STYLE, ...OBJECT_SEGMENTS_LIST_STYLE }}>
            {path.segments.slice(0, 50).map((seg, si) => (
              <div key={`${si}-${seg.type}`} style={OBJECT_SEGMENT_ROW_STYLE}>
                <span style={OBJECT_SEGMENT_TYPE_STYLE}>{seg.type}</span>
                <span>
                  ({seg.x.toFixed(1)}, {seg.y.toFixed(1)})
                </span>
                {seg.close && <span style={OBJECT_SEGMENT_CLOSE_STYLE}>close</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children, style: styleProp }: { children: ReactNode; style?: CSSProperties }) {
  return <h4 style={{ ...PANEL_SECTION_HEADING_STYLE, ...styleProp }}>{children}</h4>;
}

export { ObjectDetailPanel, ObjectListItem, ObjectsTruncationNotice };
