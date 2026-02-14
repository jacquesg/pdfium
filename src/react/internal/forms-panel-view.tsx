'use client';

import type { CSSProperties } from 'react';
import type { SerialisedFormWidget } from '../../context/protocol.js';
import type { FlattenResult } from '../../core/types.js';
import { FlattenFlags } from '../../core/types.js';
import { EmptyPanelState } from './empty-panel-state.js';
import {
  FORMS_PANEL_COPY,
  formatHighlightAlphaAriaValueText,
  formatHighlightAlphaLabel,
  formatWidgetsSummary,
  formatWidgetValue,
} from './forms-panel-copy.js';
import { buildWidgetDetailRows, flattenResultStyle } from './forms-panel-helpers.js';
import { PanelButton } from './panel-button.js';
import {
  PANEL_DETAIL_REGION_STYLE,
  PANEL_ROOT_CONTAINER_STYLE,
  PANEL_SCROLL_REGION_STYLE,
  PANEL_SECTION_HEADING_STYLE,
  PANEL_SUMMARY_STYLE,
} from './panel-layout-styles.js';

export interface FormsPanelViewProps {
  widgets: readonly SerialisedFormWidget[];
  hasForm: boolean | undefined;
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
  formError: string | null;
  onDismissError: () => void;
  highlightColour: string;
  onHighlightColourChange: (colour: string) => void;
  highlightAlpha: number;
  highlightAlphaInputId: string;
  onHighlightAlphaChange: (alpha: number) => void;
  onHighlightToggle: () => void;
  highlightEnabled: boolean;
  onKillFocus: () => void;
  onUndo: () => void;
  confirmingFlatten: FlattenFlags | null;
  onFlatten: (flags: FlattenFlags) => void;
  flattenResult: FlattenResult | null;
}

const sectionHeadingStyle: CSSProperties = {
  ...PANEL_SECTION_HEADING_STYLE,
};

const badgeBase: CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '9999px',
  lineHeight: '1.4',
};

const widgetItemStyle: CSSProperties = {
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
  backgroundColor: 'var(--pdfium-panel-surface-colour, #ffffff)',
  fontSize: '12px',
};

function FormsPanelView({
  widgets,
  hasForm,
  selectedIndex,
  onSelectIndex,
  formError,
  onDismissError,
  highlightColour,
  onHighlightColourChange,
  highlightAlpha,
  highlightAlphaInputId,
  onHighlightAlphaChange,
  onHighlightToggle,
  highlightEnabled,
  onKillFocus,
  onUndo,
  confirmingFlatten,
  onFlatten,
  flattenResult,
}: FormsPanelViewProps) {
  const selectedWidget = selectedIndex === null ? null : (widgets[selectedIndex] ?? null);

  return (
    <div style={PANEL_ROOT_CONTAINER_STYLE}>
      <div
        style={{
          ...PANEL_SUMMARY_STYLE,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontFamily: 'monospace' }}>{formatWidgetsSummary(widgets.length)}</span>
        <span
          style={{
            ...badgeBase,
            ...(hasForm
              ? {
                  backgroundColor: 'var(--pdfium-panel-badge-success-bg, #dcfce7)',
                  color: 'var(--pdfium-panel-badge-success-colour, #166534)',
                }
              : {
                  backgroundColor: 'var(--pdfium-panel-badge-bg, #f3f4f6)',
                  color: 'var(--pdfium-panel-badge-colour, #6b7280)',
                }),
          }}
        >
          {hasForm ? FORMS_PANEL_COPY.formDetectedBadge : FORMS_PANEL_COPY.noFormBadge}
        </span>
      </div>

      <div style={PANEL_SCROLL_REGION_STYLE}>
        {widgets.length === 0 ? (
          <EmptyPanelState message={FORMS_PANEL_COPY.emptyWidgetsMessage} />
        ) : (
          <div
            role="listbox"
            aria-label={FORMS_PANEL_COPY.widgetsListAriaLabel}
            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            {widgets.map((widget, index) => {
              const selected = selectedIndex === index;
              return (
                <button
                  key={widget.fieldName || `widget-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-panel-item=""
                  onClick={() => onSelectIndex(selected ? null : index)}
                  style={{
                    ...widgetItemStyle,
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundColor: selected
                      ? 'var(--pdfium-panel-item-active-bg, #eff6ff)'
                      : 'var(--pdfium-panel-item-bg, #ffffff)',
                    borderColor: selected
                      ? 'var(--pdfium-panel-item-active-border, #93c5fd)'
                      : 'var(--pdfium-panel-section-border, #e5e7eb)',
                    transition: 'background-color 150ms ease, border-color 150ms ease',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{widget.fieldName}</div>
                  <div style={{ color: 'var(--pdfium-panel-muted-colour, #6b7280)', marginTop: '2px' }}>
                    Type: {widget.fieldType}
                  </div>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                  >
                    Val: {widget.fieldValue}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedWidget && (
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
              fontSize: '12px',
            }}
          >
            <h3 style={sectionHeadingStyle}>{FORMS_PANEL_COPY.widgetDetailHeading}</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '2px 10px',
              }}
            >
              {buildWidgetDetailRows(selectedWidget).map(({ label, value }) => (
                <div key={label} style={{ display: 'contents' }}>
                  <div style={{ color: 'var(--pdfium-panel-muted-colour, #6b7280)', fontWeight: 500 }}>{label}</div>
                  <div style={{ wordBreak: 'break-word' }}>{formatWidgetValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          ...PANEL_DETAIL_REGION_STYLE,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {formError !== null && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: 'var(--pdfium-panel-badge-error-bg, #fef2f2)',
              border: '1px solid var(--pdfium-panel-badge-error-border, #fca5a5)',
              color: 'var(--pdfium-panel-badge-error-colour, #991b1b)',
            }}
          >
            <span>{formError}</span>
            <button
              type="button"
              onClick={onDismissError}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0 0 8px',
                lineHeight: 1,
                color: 'inherit',
              }}
              aria-label={FORMS_PANEL_COPY.dismissErrorAriaLabel}
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
        )}

        <section>
          <h3 style={sectionHeadingStyle}>{FORMS_PANEL_COPY.formFieldVisibilityHeading}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="color"
              value={highlightColour}
              onChange={(event) => onHighlightColourChange(event.target.value)}
              aria-label={FORMS_PANEL_COPY.highlightColourAriaLabel}
              style={{ width: '28px', height: '28px', border: 'none', padding: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--pdfium-panel-muted-colour, #6b7280)' }}>
              {highlightColour}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label htmlFor={highlightAlphaInputId} style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              {formatHighlightAlphaLabel(highlightAlpha)}
            </label>
            <input
              id={highlightAlphaInputId}
              type="range"
              min={0}
              max={255}
              value={highlightAlpha}
              onChange={(event) => onHighlightAlphaChange(Number(event.target.value))}
              aria-label={FORMS_PANEL_COPY.highlightAlphaAriaLabel}
              aria-valuenow={highlightAlpha}
              aria-valuemin={0}
              aria-valuemax={255}
              aria-valuetext={formatHighlightAlphaAriaValueText(highlightAlpha)}
              style={{ width: '100%', accentColor: 'var(--pdfium-panel-btn-bg, #3b82f6)' }}
            />
          </div>
          <PanelButton variant="secondary" onClick={onHighlightToggle} style={{ width: '100%' }}>
            {highlightEnabled ? FORMS_PANEL_COPY.hideFormFieldsButton : FORMS_PANEL_COPY.showFormFieldsButton}
          </PanelButton>
        </section>

        <section>
          <h3 style={sectionHeadingStyle}>{FORMS_PANEL_COPY.interactionHeading}</h3>
          <PanelButton variant="danger" onClick={onKillFocus} style={{ width: '100%', marginBottom: '6px' }}>
            {FORMS_PANEL_COPY.killFocusButton}
          </PanelButton>
          <PanelButton variant="secondary" onClick={onUndo} style={{ width: '100%' }}>
            {FORMS_PANEL_COPY.undoButton}
          </PanelButton>
        </section>

        <section>
          <h3 style={sectionHeadingStyle}>Flatten</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <PanelButton
              variant={confirmingFlatten === FlattenFlags.NormalDisplay ? 'danger' : 'secondary'}
              onClick={() => onFlatten(FlattenFlags.NormalDisplay)}
              style={{ width: '100%' }}
            >
              {confirmingFlatten === FlattenFlags.NormalDisplay
                ? FORMS_PANEL_COPY.flattenConfirmButton
                : FORMS_PANEL_COPY.flattenForDisplayButton}
            </PanelButton>
            <PanelButton
              variant={confirmingFlatten === FlattenFlags.Print ? 'danger' : 'secondary'}
              onClick={() => onFlatten(FlattenFlags.Print)}
              style={{ width: '100%' }}
            >
              {confirmingFlatten === FlattenFlags.Print
                ? FORMS_PANEL_COPY.flattenConfirmButton
                : FORMS_PANEL_COPY.flattenForPrintButton}
            </PanelButton>
          </div>
          {flattenResult !== null && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid',
                ...flattenResultStyle(flattenResult),
              }}
            >
              Result: {flattenResult}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export { FormsPanelView };
