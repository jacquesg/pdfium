'use client';

import type { SerialisedAnnotation } from '../../context/protocol.js';
import { AnnotationType } from '../../core/types.js';
import {
  ANNOTATIONS_PANEL_COPY,
  formatAnnotationDetailHeading,
  formatAttachmentPointsHeading,
  formatFieldFlagsHeading,
  formatFlagsHeading,
  formatInkPathsHeading,
  formatMoreCount,
  formatOptionsHeading,
  formatPathPointsLabel,
  formatVerticesHeading,
} from './annotations-panel-copy.js';
import {
  buildAnnotationBorderRows,
  buildAnnotationCommonRows,
  buildAnnotationLineRows,
  buildAnnotationLinkRows,
  buildAnnotationTextRows,
  buildAnnotationWidgetRows,
} from './annotations-panel-detail-rows.js';
import { AnnotationFlagBadges } from './annotations-panel-flag-badges.js';
import { decodeAnnotationFlags, decodeFormFieldFlags } from './annotations-panel-helpers.js';
import {
  DETAIL_BLOCK_SCROLL_112_STYLE,
  DETAIL_BLOCK_SCROLL_128_STYLE,
  DETAIL_BLOCK_SCROLL_160_STYLE,
  DETAIL_CLOSE_BUTTON_STYLE,
  DETAIL_HEADER_STYLE,
  DETAIL_MUTED_LABEL_STYLE,
  DETAIL_OPTIONS_ROW_STYLE,
  DETAIL_ROOT_STYLE,
  DETAIL_SELECTED_BADGE_STYLE,
  DETAIL_STACK_4_STYLE,
  DETAIL_TITLE_STYLE,
} from './annotations-panel-view-styles.js';
import { ColourSwatch } from './colour-swatch.js';
import { PANEL_MONO_BLOCK_STYLE, PANEL_SECTION_HEADING_STYLE } from './panel-layout-styles.js';
import { PropertyTable } from './property-table.js';

const MARKUP_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Squiggly,
  AnnotationType.Strikeout,
]);

interface AnnotationDetailProps {
  annotation: SerialisedAnnotation;
  onClose: () => void;
}

function AnnotationDetail({ annotation, onClose }: AnnotationDetailProps) {
  const commonRows = buildAnnotationCommonRows(annotation);
  const textRows = buildAnnotationTextRows(annotation);
  const borderRows = buildAnnotationBorderRows(annotation);
  const lineRows = buildAnnotationLineRows(annotation);
  const linkRows = buildAnnotationLinkRows(annotation);

  return (
    <div style={DETAIL_ROOT_STYLE}>
      <div style={DETAIL_HEADER_STYLE}>
        <h3 style={DETAIL_TITLE_STYLE}>{formatAnnotationDetailHeading(annotation.index, annotation.type)}</h3>
        <button
          type="button"
          onClick={onClose}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClose();
            }
          }}
          aria-label={ANNOTATIONS_PANEL_COPY.closeDetailAriaLabel}
          style={DETAIL_CLOSE_BUTTON_STYLE}
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

      <div>
        <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.commonHeading}</h4>
        <PropertyTable rows={commonRows} />
        <div style={{ marginTop: '8px' }}>
          <span style={DETAIL_MUTED_LABEL_STYLE}>{formatFlagsHeading(annotation.flags)}</span>
          <div style={{ marginTop: '4px' }}>
            <AnnotationFlagBadges flags={annotation.flags} decoder={decodeAnnotationFlags} />
          </div>
        </div>
      </div>

      <div>
        <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.coloursHeading}</h4>
        <div style={DETAIL_STACK_4_STYLE}>
          <ColourSwatch colour={annotation.colour.stroke} label={ANNOTATIONS_PANEL_COPY.strokeLabel} />
          <ColourSwatch colour={annotation.colour.interior} label={ANNOTATIONS_PANEL_COPY.interiorLabel} />
        </div>
      </div>

      {textRows.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.textContentHeading}</h4>
          <PropertyTable rows={textRows} />
        </div>
      ) : null}

      {borderRows.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.borderHeading}</h4>
          <PropertyTable rows={borderRows} />
        </div>
      ) : null}

      {lineRows.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.linePointsHeading}</h4>
          <PropertyTable rows={lineRows} />
        </div>
      ) : null}

      {annotation.vertices && annotation.vertices.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{formatVerticesHeading(annotation.vertices.length)}</h4>
          <div style={{ ...DETAIL_BLOCK_SCROLL_128_STYLE, ...PANEL_MONO_BLOCK_STYLE }}>
            {annotation.vertices.map((vertex, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional vertex data has no stable ID
              <div key={index}>
                [{index}] ({vertex.x.toFixed(1)}, {vertex.y.toFixed(1)})
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {annotation.inkPaths && annotation.inkPaths.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{formatInkPathsHeading(annotation.inkPaths.length)}</h4>
          <div style={{ ...DETAIL_BLOCK_SCROLL_160_STYLE, ...PANEL_MONO_BLOCK_STYLE }}>
            {annotation.inkPaths.map((path, pathIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional ink path data has no stable ID
              <div key={pathIndex} style={{ marginBottom: '4px' }}>
                <div style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 600 }}>
                  {formatPathPointsLabel(pathIndex, path.length)}
                </div>
                {path.slice(0, 10).map((point, pointIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional point data has no stable ID
                  <div key={pointIndex} style={{ marginLeft: '8px' }}>
                    ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                  </div>
                ))}
                {path.length > 10 ? (
                  <div style={{ marginLeft: '8px', color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>
                    {formatMoreCount(path.length - 10)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {MARKUP_TYPES.has(annotation.type) && annotation.attachmentPoints && annotation.attachmentPoints.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>
            {formatAttachmentPointsHeading(annotation.attachmentPoints.length)}
          </h4>
          <div style={{ ...DETAIL_BLOCK_SCROLL_128_STYLE, ...PANEL_MONO_BLOCK_STYLE }}>
            {annotation.attachmentPoints.slice(0, 5).map((points, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional quad-point data has no stable ID
              <div key={index} style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>[{index}]</span> (
                {points.x1.toFixed(0)}, {points.y1.toFixed(0)}) ({points.x2.toFixed(0)},{points.y2.toFixed(0)}) (
                {points.x3.toFixed(0)},{points.y3.toFixed(0)}) ({points.x4.toFixed(0)}, {points.y4.toFixed(0)})
              </div>
            ))}
            {annotation.attachmentPoints.length > 5 ? (
              <div style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>
                {formatMoreCount(annotation.attachmentPoints.length - 5)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {annotation.widget ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.formFieldHeading}</h4>
          <PropertyTable rows={buildAnnotationWidgetRows(annotation.widget)} />
          <div style={{ marginTop: '8px' }}>
            <span style={DETAIL_MUTED_LABEL_STYLE}>{formatFieldFlagsHeading(annotation.widget.fieldFlags)}</span>
            <div style={{ marginTop: '4px' }}>
              <AnnotationFlagBadges flags={annotation.widget.fieldFlags} decoder={decodeFormFieldFlags} />
            </div>
          </div>
          {annotation.widget.options.length > 0 ? (
            <div style={{ marginTop: '8px' }}>
              <span style={DETAIL_MUTED_LABEL_STYLE}>{formatOptionsHeading(annotation.widget.options.length)}</span>
              <div style={{ ...DETAIL_BLOCK_SCROLL_112_STYLE, ...PANEL_MONO_BLOCK_STYLE }}>
                {annotation.widget.options.map((option) => (
                  <div key={option.index} style={DETAIL_OPTIONS_ROW_STYLE}>
                    <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>[{option.index}]</span>
                    <span>{option.label}</span>
                    {option.selected ? (
                      <span style={DETAIL_SELECTED_BADGE_STYLE}>{ANNOTATIONS_PANEL_COPY.selectedBadge}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {linkRows.length > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.linkHeading}</h4>
          <PropertyTable rows={linkRows} />
        </div>
      ) : null}

      {annotation.fontSize > 0 ? (
        <div>
          <h4 style={PANEL_SECTION_HEADING_STYLE}>{ANNOTATIONS_PANEL_COPY.freeTextHeading}</h4>
          <PropertyTable rows={[{ label: 'Font Size', value: annotation.fontSize.toFixed(1) }]} />
        </div>
      ) : null}
    </div>
  );
}

export { AnnotationDetail };
export type { AnnotationDetailProps };
