'use client';

import type { ReactNode } from 'react';
import type {
  DocumentInfoResponse,
  ExtendedDocumentInfoResponse,
  SerialisedSignature,
} from '../../context/protocol.js';
import type { DocumentMetadata, DocumentPermissions, JavaScriptAction, ViewerPreferences } from '../../core/types.js';
import {
  formatJavaScriptActionHeading,
  formatPermissionsRaw,
  formatSignatureHeading,
  INFO_PANEL_COPY,
} from './info-panel-copy.js';
import {
  buildDocumentPropertiesRows,
  buildMetadataRows,
  buildViewerPreferencesRows,
  formatPrintRangesValue,
} from './info-panel-helpers.js';
import { PANEL_ROOT_CONTAINER_STYLE } from './panel-layout-styles.js';
import { PropertyTable } from './property-table.js';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

interface InfoPanelViewProps {
  pageCount: number;
  metadata: DocumentMetadata | undefined;
  permissions: DocumentPermissions | undefined;
  viewerPrefs: ViewerPreferences | undefined;
  jsActions: JavaScriptAction[] | undefined;
  signatures: SerialisedSignature[] | undefined;
  extInfo: ExtendedDocumentInfoResponse | undefined;
  docInfo: DocumentInfoResponse | undefined;
  printRanges: number[] | undefined;
  collapsedSections: Set<string>;
  onToggleSection: (id: string) => void;
}

function CollapsibleSection({ id, title, collapsed, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)' }}>
      <button
        type="button"
        data-collapsible=""
        onClick={() => onToggle(id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'var(--pdfium-panel-section-bg, #f9fafb)',
          color: 'var(--pdfium-panel-colour, #374151)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'transform 150ms ease',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            opacity: 0.65,
          }}
        >
          <svg
            aria-hidden="true"
            width={10}
            height={10}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
        <span>{title}</span>
      </button>
      {!collapsed && <div style={{ padding: '12px' }}>{children}</div>}
    </div>
  );
}

function LoadingText() {
  return (
    <div style={{ fontSize: '13px', color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>
      {INFO_PANEL_COPY.loadingMessage}
    </div>
  );
}

function InfoPanelView({
  pageCount,
  metadata,
  permissions,
  viewerPrefs,
  jsActions,
  signatures,
  extInfo,
  docInfo,
  printRanges,
  collapsedSections,
  onToggleSection,
}: InfoPanelViewProps) {
  const isCollapsed = (id: string) => collapsedSections.has(id);

  return (
    <div style={{ ...PANEL_ROOT_CONTAINER_STYLE, overflow: 'auto' }}>
      <CollapsibleSection
        id="metadata"
        title={INFO_PANEL_COPY.metadataSectionTitle}
        collapsed={isCollapsed('metadata')}
        onToggle={onToggleSection}
      >
        {metadata && extInfo ? <PropertyTable rows={buildMetadataRows(metadata, extInfo)} /> : <LoadingText />}
      </CollapsibleSection>

      <CollapsibleSection
        id="properties"
        title={INFO_PANEL_COPY.documentPropertiesSectionTitle}
        collapsed={isCollapsed('properties')}
        onToggle={onToggleSection}
      >
        {docInfo && extInfo ? (
          <PropertyTable rows={buildDocumentPropertiesRows(pageCount, docInfo, extInfo)} />
        ) : (
          <LoadingText />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="permissions"
        title={INFO_PANEL_COPY.permissionsSectionTitle}
        collapsed={isCollapsed('permissions')}
        onToggle={onToggleSection}
      >
        {permissions && extInfo ? (
          <>
            <PropertyTable
              rows={[
                { label: 'Print', value: permissions.canPrint },
                { label: 'Modify', value: permissions.canModifyContents },
                { label: 'Copy/Extract', value: permissions.canCopyOrExtract },
                { label: 'Annotations', value: permissions.canAddOrModifyAnnotations },
                { label: 'Fill Forms', value: permissions.canFillForms },
                { label: 'Accessibility', value: permissions.canExtractForAccessibility },
                { label: 'Assemble', value: permissions.canAssemble },
                { label: 'Print HQ', value: permissions.canPrintHighQuality },
              ]}
            />
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
                fontFamily: 'monospace',
              }}
            >
              {formatPermissionsRaw(extInfo.rawPermissions, extInfo.securityHandlerRevision)}
            </div>
          </>
        ) : (
          <LoadingText />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="viewerPrefs"
        title={INFO_PANEL_COPY.viewerPreferencesSectionTitle}
        collapsed={isCollapsed('viewerPrefs')}
        onToggle={onToggleSection}
      >
        {viewerPrefs ? (
          <PropertyTable
            rows={[
              ...buildViewerPreferencesRows(viewerPrefs),
              { label: 'Print Ranges', value: formatPrintRangesValue(printRanges) },
            ]}
          />
        ) : (
          <LoadingText />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="signatures"
        title={INFO_PANEL_COPY.digitalSignaturesSectionTitle}
        collapsed={isCollapsed('signatures')}
        onToggle={onToggleSection}
      >
        {!signatures || signatures.length === 0 ? (
          <div
            style={{
              fontSize: '13px',
              color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
              fontStyle: 'italic',
            }}
          >
            {INFO_PANEL_COPY.noSignaturesMessage}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {signatures.map((signature) => (
              <div
                key={signature.index}
                style={{
                  border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  color: 'var(--pdfium-panel-colour, #374151)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    marginBottom: '6px',
                    color: 'var(--pdfium-panel-colour, #374151)',
                  }}
                >
                  {formatSignatureHeading(signature.index)}
                </div>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
                  <dt style={{ color: 'var(--pdfium-panel-secondary-colour, #6b7280)', fontWeight: 500 }}>Reason</dt>
                  <dd style={{ margin: 0 }}>{signature.reason || '\u2014'}</dd>
                  <dt style={{ color: 'var(--pdfium-panel-secondary-colour, #6b7280)', fontWeight: 500 }}>Time</dt>
                  <dd style={{ margin: 0 }}>{signature.time || '\u2014'}</dd>
                  <dt style={{ color: 'var(--pdfium-panel-secondary-colour, #6b7280)', fontWeight: 500 }}>SubFilter</dt>
                  <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px' }}>
                    {signature.subFilter || '\u2014'}
                  </dd>
                  <dt style={{ color: 'var(--pdfium-panel-secondary-colour, #6b7280)', fontWeight: 500 }}>
                    Byte Range
                  </dt>
                  <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                    {signature.byteRange?.join(', ') || '\u2014'}
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="javascript"
        title={INFO_PANEL_COPY.embeddedJavaScriptSectionTitle}
        collapsed={isCollapsed('javascript')}
        onToggle={onToggleSection}
      >
        {!jsActions || jsActions.length === 0 ? (
          <div
            style={{
              fontSize: '13px',
              color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
              fontStyle: 'italic',
            }}
          >
            {INFO_PANEL_COPY.noJavaScriptActionsMessage}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jsActions.map((action, index) => (
              <div
                key={action.name || index}
                style={{
                  border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--pdfium-panel-section-bg, #f9fafb)',
                    padding: '6px 8px',
                    borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--pdfium-panel-colour, #374151)',
                  }}
                >
                  {formatJavaScriptActionHeading(index, action.name)}
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '8px',
                    backgroundColor: 'var(--pdfium-panel-code-bg, #f3f4f6)',
                    color: 'var(--pdfium-panel-code-colour, #1f2937)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {action.script}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

export { InfoPanelView };
export type { InfoPanelViewProps };
