'use client';

const INFO_PANEL_COPY = {
  emptyStateMessage: 'Load a PDF to inspect its metadata and properties.',
  loadingMessage: 'Loading...',
  metadataSectionTitle: 'Metadata',
  documentPropertiesSectionTitle: 'Document Properties',
  permissionsSectionTitle: 'Permissions',
  viewerPreferencesSectionTitle: 'Viewer Preferences',
  digitalSignaturesSectionTitle: 'Digital Signatures',
  embeddedJavaScriptSectionTitle: 'Embedded JavaScript',
  noSignaturesMessage: 'No signatures found',
  noJavaScriptActionsMessage: 'No JavaScript actions found',
  notSetLabel: 'Not set',
} as const;

function formatSignatureHeading(index: number): string {
  return `Signature #${index}`;
}

function formatJavaScriptActionHeading(index: number, name: string): string {
  return name || `Action #${index}`;
}

function formatPermissionsRaw(rawPermissions: number, securityHandlerRevision: number): string {
  return `Raw: 0x${rawPermissions.toString(16).toUpperCase()} \u2022 Security Rev: ${securityHandlerRevision}`;
}

export { INFO_PANEL_COPY, formatJavaScriptActionHeading, formatPermissionsRaw, formatSignatureHeading };
