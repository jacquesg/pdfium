import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocMDPPermission, DuplexMode, FormType, PageMode } from '../../../../src/core/types.js';
import { InfoPanelView } from '../../../../src/react/internal/info-panel-view.js';

describe('info-panel-view', () => {
  it('renders metadata rows when metadata and extended info are available', () => {
    render(
      <InfoPanelView
        pageCount={3}
        metadata={{ title: 'Spec', author: 'Alice' }}
        permissions={undefined}
        viewerPrefs={undefined}
        jsActions={undefined}
        signatures={undefined}
        extInfo={{
          fileVersion: 17,
          rawPermissions: 0,
          securityHandlerRevision: 4,
          signatureCount: 0,
          hasValidCrossReferenceTable: true,
        }}
        docInfo={{
          isTagged: false,
          hasForm: false,
          formType: FormType.None,
          namedDestinationCount: 0,
          pageMode: PageMode.UseNone,
        }}
        printRanges={undefined}
        collapsedSections={new Set()}
        onToggleSection={vi.fn()}
      />,
    );

    expect(screen.getByText('Spec')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('calls toggle callback for collapsible section headers', () => {
    const onToggleSection = vi.fn();

    render(
      <InfoPanelView
        pageCount={1}
        metadata={undefined}
        permissions={undefined}
        viewerPrefs={undefined}
        jsActions={undefined}
        signatures={undefined}
        extInfo={undefined}
        docInfo={undefined}
        printRanges={undefined}
        collapsedSections={new Set()}
        onToggleSection={onToggleSection}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Metadata' })[0]!);
    expect(onToggleSection).toHaveBeenCalledWith('metadata');
  });

  it('renders javascript actions and signatures', () => {
    render(
      <InfoPanelView
        pageCount={1}
        metadata={undefined}
        permissions={undefined}
        viewerPrefs={{ printScaling: true, numCopies: 1, duplexMode: DuplexMode.Simplex }}
        jsActions={[{ name: 'OpenAction', script: 'app.alert("hello")' }]}
        signatures={[
          {
            index: 0,
            contents: undefined,
            byteRange: [0, 1, 2, 3],
            reason: 'Approved',
            time: '2024-01-01',
            subFilter: 'adbe.pkcs7.detached',
            docMDPPermission: DocMDPPermission.FillAndSign,
          },
        ]}
        extInfo={undefined}
        docInfo={undefined}
        printRanges={[1, 2]}
        collapsedSections={new Set()}
        onToggleSection={vi.fn()}
      />,
    );

    expect(screen.getByText('OpenAction')).toBeDefined();
    expect(screen.getByText('app.alert("hello")')).toBeDefined();
    expect(screen.getByText('Approved')).toBeDefined();
    expect(screen.getByText('0, 1, 2, 3')).toBeDefined();
  });
});
