import type { KeyboardEvent } from 'react';
import type { CharacterInfo, CharBox } from '../../core/types.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import { ColourSwatch } from './colour-swatch.js';
import { PanelButton } from './panel-button.js';
import { PANEL_SECTION_HEADING_STYLE } from './panel-layout-styles.js';
import {
  formatAngleDegreesLabel,
  formatCharacterCount,
  formatExtractionCall,
  formatFontSizeLabel,
  formatPageSummary,
  formatUnicodeLabel,
  TEXT_PANEL_COPY,
} from './text-panel-copy.js';
import { formatCharacterBoundingBox, parseCoordinateInput } from './text-panel-helpers.js';

type TextTabId = 'characters' | 'extraction';

interface CharacterDetail {
  charInfo: CharacterInfo;
  charBox: CharBox;
  isPinned: boolean;
}

interface TextCharactersPaneProps {
  charDetail: CharacterDetail | null;
  pageIndex: number;
  dimensions: PageDimension[] | undefined;
  scale: number;
}

interface TextExtractionPaneProps {
  fullText: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  setLeft: (value: number) => void;
  setTop: (value: number) => void;
  setRight: (value: number) => void;
  setBottom: (value: number) => void;
  onExtract: () => void;
  onCoordKeyDown: (event: KeyboardEvent) => void;
  extractError: string | null;
  extractedRect: string | null;
  hasDocument: boolean;
}

const TEXT_PANEL_TABS = [
  { id: 'characters' as const, label: TEXT_PANEL_COPY.charactersTabLabel },
  { id: 'extraction' as const, label: TEXT_PANEL_COPY.extractionTabLabel },
];

function TextCharactersPane({ charDetail, pageIndex, dimensions, scale }: TextCharactersPaneProps) {
  return (
    <div style={{ padding: '12px', fontSize: '13px', color: 'var(--pdfium-panel-secondary-colour, #6b7280)' }}>
      {charDetail ? (
        <div style={{ userSelect: 'text' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--pdfium-panel-item-active-colour, #2563eb)',
                }}
              >
                {charDetail.charInfo.char || '\u00A0'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
                }}
              >
                {formatUnicodeLabel(charDetail.charInfo.unicode)}
              </span>
            </div>
            {charDetail.isPinned && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'var(--pdfium-panel-accent-bg, rgba(59,130,246,0.08))',
                  color: 'var(--pdfium-panel-accent-colour, #3b82f6)',
                }}
              >
                {TEXT_PANEL_COPY.pinnedBadge}
              </span>
            )}
          </div>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '4px 12px',
              fontSize: '12px',
              lineHeight: '1.6',
            }}
          >
            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Index</dt>
            <dd style={{ margin: 0, color: 'var(--pdfium-panel-colour, #1f2937)' }}>{charDetail.charInfo.index}</dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Font</dt>
            <dd style={{ margin: 0, color: 'var(--pdfium-panel-colour, #1f2937)' }}>
              {charDetail.charInfo.fontName ?? '\u2014'}
            </dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Size</dt>
            <dd style={{ margin: 0, color: 'var(--pdfium-panel-colour, #1f2937)' }}>
              {formatFontSizeLabel(charDetail.charInfo.fontSize)}
            </dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Weight</dt>
            <dd style={{ margin: 0, color: 'var(--pdfium-panel-colour, #1f2937)' }}>
              {charDetail.charInfo.fontWeight}
            </dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Angle</dt>
            <dd style={{ margin: 0, color: 'var(--pdfium-panel-colour, #1f2937)' }}>
              {formatAngleDegreesLabel(charDetail.charInfo.angle)}
            </dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Fill</dt>
            <dd style={{ margin: 0 }}>
              <ColourSwatch colour={charDetail.charInfo.fillColour} />
            </dd>

            <dt style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontWeight: 500 }}>Bounding box</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'var(--pdfium-panel-colour, #1f2937)',
              }}
            >
              {formatCharacterBoundingBox(charDetail.charBox)}
            </dd>
          </dl>
        </div>
      ) : (
        <>
          <p style={{ margin: 0 }}>{TEXT_PANEL_COPY.hoverInstruction}</p>
          {dimensions?.[pageIndex] && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
              }}
            >
              {formatPageSummary(
                pageIndex,
                dimensions[pageIndex]?.width ?? 0,
                dimensions[pageIndex]?.height ?? 0,
                scale,
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TextExtractionPane({
  fullText,
  left,
  top,
  right,
  bottom,
  setLeft,
  setTop,
  setRight,
  setBottom,
  onExtract,
  onCoordKeyDown,
  extractError,
  extractedRect,
  hasDocument,
}: TextExtractionPaneProps) {
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--pdfium-panel-colour, #1f2937)' }}>
            {TEXT_PANEL_COPY.fullPageTextHeading}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
            }}
          >
            {formatCharacterCount(fullText.length)}
          </span>
        </div>
        <textarea
          readOnly
          value={fullText}
          aria-label={TEXT_PANEL_COPY.fullPageTextAriaLabel}
          style={{
            width: '100%',
            height: '160px',
            border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
            borderRadius: '6px',
            padding: '8px',
            fontFamily: 'monospace',
            fontSize: '11px',
            backgroundColor: 'var(--pdfium-panel-input-bg, #f9fafb)',
            color: 'var(--pdfium-panel-colour, #1f2937)',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <span
          style={{
            display: 'block',
            ...PANEL_SECTION_HEADING_STYLE,
            color: 'var(--pdfium-panel-colour, #1f2937)',
            marginBottom: '4px',
          }}
        >
          {TEXT_PANEL_COPY.extractByRectHeading}
        </span>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: '11px',
            color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
          }}
        >
          {TEXT_PANEL_COPY.extractByRectHelp}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          <CoordInput label="Left" value={left} onChange={setLeft} onKeyDown={onCoordKeyDown} />
          <CoordInput label="Top" value={top} onChange={setTop} onKeyDown={onCoordKeyDown} />
          <CoordInput label="Right" value={right} onChange={setRight} onKeyDown={onCoordKeyDown} />
          <CoordInput label="Bottom" value={bottom} onChange={setBottom} onKeyDown={onCoordKeyDown} />
        </div>

        <PanelButton onClick={onExtract} disabled={!hasDocument}>
          {TEXT_PANEL_COPY.extractButtonLabel}
        </PanelButton>

        {extractError && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'var(--pdfium-panel-danger-bg, #fef2f2)',
              border: '1px solid var(--pdfium-panel-danger-border, #fecaca)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--pdfium-panel-danger-colour, #b91c1c)',
            }}
          >
            {extractError}
          </div>
        )}

        {extractedRect !== null && !extractError && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
                marginBottom: '4px',
              }}
            >
              {formatExtractionCall(left, top, right, bottom)}
            </div>
            <div
              style={{
                border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
                borderRadius: '6px',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                backgroundColor: 'var(--pdfium-panel-input-bg, #f9fafb)',
                color: 'var(--pdfium-panel-colour, #1f2937)',
                whiteSpace: 'pre-wrap',
                minHeight: '32px',
              }}
            >
              {extractedRect || (
                <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', fontStyle: 'italic' }}>
                  {TEXT_PANEL_COPY.emptyExtractionResultLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CoordInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

function CoordInput({ label, value, onChange, onKeyDown }: CoordInputProps) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontSize: '11px',
        color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
      }}
    >
      <span style={{ marginBottom: '2px' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseCoordinateInput(e.target.value, value))}
        onKeyDown={onKeyDown}
        step="1"
        aria-label={`${label} coordinate`}
        style={{
          border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: 'var(--pdfium-panel-input-bg, #f9fafb)',
          color: 'var(--pdfium-panel-colour, #1f2937)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

export { TEXT_PANEL_TABS, TextCharactersPane, TextExtractionPane };
export type { CharacterDetail, TextTabId };
