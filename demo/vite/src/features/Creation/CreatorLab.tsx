import { useCallback, useState } from 'react';
import { DefaultToolbar, PDFDocumentView, useKeyboardShortcuts, useViewerSetup } from '@scaryterry/pdfium/react';
import { Button } from '../../components/Button';
import { DocPanel } from '../../components/DocPanel';
import { DownloadButton } from '../../components/DownloadButton';

import { ResponsiveSidebar } from '../../components/ResponsiveSidebar';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { usePDFium } from '../../hooks/usePDFium';

// ── Constants ───────────────────────────────────────────────────

const STANDARD_FONTS = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Symbol',
  'ZapfDingbats',
] as const;

const PAGE_PRESETS = [
  { label: 'US Letter', width: 612, height: 792 },
  { label: 'A4', width: 595, height: 842 },
  { label: 'A5', width: 420, height: 595 },
  { label: 'Business Card', width: 252, height: 144 },
] as const;

// ── Types ───────────────────────────────────────────────────────

interface TextObj {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  font: string;
  colour?: string;
}

interface RectObj {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  fillColour: string;
  strokeColour: string;
  strokeWidth: number;
}

interface LineObj {
  id: string;
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColour: string;
  strokeWidth: number;
}

interface EllipseObj {
  id: string;
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fillColour: string;
  strokeColour: string;
  strokeWidth: number;
}

type PageObj = TextObj | RectObj | LineObj | EllipseObj;

interface PageDef {
  id: string;
  width: number;
  height: number;
  objects: PageObj[];
}

// ── Helpers ─────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function hexToRgba(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
    a: 255,
  };
}

function objLabel(obj: PageObj): { badge: string; colour: string; detail: string } {
  switch (obj.type) {
    case 'text':
      return { badge: 'T', colour: 'text-blue-600', detail: `"${obj.text}" ${obj.font} ${obj.fontSize}pt` };
    case 'rect':
      return { badge: 'R', colour: 'text-green-600', detail: `${obj.w}x${obj.h} at (${obj.x},${obj.y})` };
    case 'line':
      return { badge: 'L', colour: 'text-orange-600', detail: `(${obj.x1},${obj.y1}) to (${obj.x2},${obj.y2})` };
    case 'ellipse':
      return { badge: 'E', colour: 'text-purple-600', detail: `${obj.rx * 2}x${obj.ry * 2} at (${obj.cx},${obj.cy})` };
  }
}

// ── Templates ───────────────────────────────────────────────────

function invoiceTemplate(): PageDef[] {
  const w = 595;
  const h = 842;
  const m = 50; // margin
  const r = w - m; // right margin
  const cw = r - m; // content width

  return [
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        // ── Top accent ──
        { id: uid(), type: 'rect', x: 0, y: h - 4, w, h: 4, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        // ── Header ──
        { id: uid(), type: 'text', text: 'ACME CORPORATION', x: m, y: h - 45, fontSize: 18, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'INVOICE', x: 445, y: h - 45, fontSize: 24, font: 'Helvetica-Bold' },

        // Company details (left)
        { id: uid(), type: 'text', text: '123 Business Avenue, Suite 100', x: m, y: h - 68, fontSize: 8, font: 'Helvetica' },
        { id: uid(), type: 'text', text: 'London, EC2A 4NE', x: m, y: h - 79, fontSize: 8, font: 'Helvetica' },
        { id: uid(), type: 'text', text: 'contact@acme.example.com', x: m, y: h - 90, fontSize: 8, font: 'Helvetica' },

        // Invoice meta (right)
        { id: uid(), type: 'text', text: 'Invoice No.', x: 400, y: h - 68, fontSize: 8, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'INV-2026-0042', x: 470, y: h - 68, fontSize: 8, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Date', x: 400, y: h - 80, fontSize: 8, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: '19 February 2026', x: 470, y: h - 80, fontSize: 8, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Due Date', x: 400, y: h - 92, fontSize: 8, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: '21 March 2026', x: 470, y: h - 92, fontSize: 8, font: 'Courier' },

        // ── Divider ──
        { id: uid(), type: 'rect', x: m, y: h - 108, w: cw, h: 0.5, fillColour: '#cbd5e1', strokeColour: '#cbd5e1', strokeWidth: 0 },

        // ── Bill To ──
        { id: uid(), type: 'text', text: 'BILL TO', x: m, y: h - 128, fontSize: 7, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Jane Smith', x: m, y: h - 143, fontSize: 11, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: '456 Client Road', x: m, y: h - 157, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: 'London, EC1A 1BB', x: m, y: h - 169, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: 'United Kingdom', x: m, y: h - 181, fontSize: 9, font: 'Helvetica' },

        // ── Table header ──
        { id: uid(), type: 'rect', x: m, y: h - 220, w: cw, h: 22, fillColour: '#f1f5f9', strokeColour: '#e2e8f0', strokeWidth: 1 },
        { id: uid(), type: 'text', text: 'DESCRIPTION', x: m + 10, y: h - 213, fontSize: 7, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'QTY', x: 340, y: h - 213, fontSize: 7, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'RATE', x: 400, y: h - 213, fontSize: 7, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'AMOUNT', x: 480, y: h - 213, fontSize: 7, font: 'Helvetica-Bold' },

        // ── Row 1 ──
        { id: uid(), type: 'text', text: 'PDF Integration Consulting', x: m + 10, y: h - 244, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '40 hrs', x: 340, y: h - 244, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '150.00', x: 400, y: h - 244, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '6,000.00', x: 480, y: h - 244, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'rect', x: m, y: h - 253, w: cw, h: 0.5, fillColour: '#f1f5f9', strokeColour: '#f1f5f9', strokeWidth: 0 },

        // ── Row 2 ──
        { id: uid(), type: 'text', text: 'WASM Module Licence (Annual)', x: m + 10, y: h - 271, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '1', x: 340, y: h - 271, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '2,500.00', x: 400, y: h - 271, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '2,500.00', x: 480, y: h - 271, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'rect', x: m, y: h - 280, w: cw, h: 0.5, fillColour: '#f1f5f9', strokeColour: '#f1f5f9', strokeWidth: 0 },

        // ── Row 3 ──
        { id: uid(), type: 'text', text: 'Custom Font Embedding Support', x: m + 10, y: h - 298, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '16 hrs', x: 340, y: h - 298, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '175.00', x: 400, y: h - 298, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '2,800.00', x: 480, y: h - 298, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'rect', x: m, y: h - 307, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },

        // ── Totals ──
        { id: uid(), type: 'text', text: 'Subtotal', x: 380, y: h - 330, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '11,300.00', x: 480, y: h - 330, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'VAT (0%)', x: 380, y: h - 345, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '0.00', x: 480, y: h - 345, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'rect', x: 380, y: h - 355, w: r - 380, h: 0.5, fillColour: '#cbd5e1', strokeColour: '#cbd5e1', strokeWidth: 0 },
        { id: uid(), type: 'rect', x: 370, y: h - 380, w: r - 360, h: 22, fillColour: '#f1f5f9', strokeColour: '#f1f5f9', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'TOTAL GBP', x: 380, y: h - 373, fontSize: 10, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: '11,300.00', x: 480, y: h - 373, fontSize: 10, font: 'Courier-Bold' },

        // ── Footer ──
        { id: uid(), type: 'rect', x: m, y: 50, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Payment Terms: Net 30 days', x: m, y: 34, fontSize: 7, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Bank: Barclays  |  Sort Code: 20-00-00  |  Account: 12345678  |  IBAN: GB82 BARC 2000 0012 3456 78', x: m, y: 20, fontSize: 7, font: 'Helvetica' },
        { id: uid(), type: 'rect', x: 0, y: 0, w, h: 4, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },
      ],
    },
  ];
}

function certificateTemplate(): PageDef[] {
  const w = 842;
  const h = 595; // Landscape A4
  const cx = w / 2; // centre x

  return [
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        // ── Borders ──
        { id: uid(), type: 'rect', x: 18, y: 18, w: w - 36, h: h - 36, fillColour: '#fffbeb', strokeColour: '#92400e', strokeWidth: 3 },
        { id: uid(), type: 'rect', x: 30, y: 30, w: w - 60, h: h - 60, fillColour: '#ffffff', strokeColour: '#b45309', strokeWidth: 0.5 },

        // ── Top ornament ──
        { id: uid(), type: 'rect', x: cx - 120, y: h - 100, w: 240, h: 1.5, fillColour: '#92400e', strokeColour: '#92400e', strokeWidth: 0 },
        { id: uid(), type: 'rect', x: cx - 3, y: h - 104, w: 6, h: 6, fillColour: '#b45309', strokeColour: '#b45309', strokeWidth: 0 },
        { id: uid(), type: 'rect', x: cx - 120, y: h - 106, w: 240, h: 1.5, fillColour: '#92400e', strokeColour: '#92400e', strokeWidth: 0 },

        // ── Title ──
        { id: uid(), type: 'text', text: 'CERTIFICATE', x: cx - 105, y: h - 148, fontSize: 36, font: 'Times-Bold' },
        { id: uid(), type: 'text', text: 'of Achievement', x: cx - 62, y: h - 175, fontSize: 16, font: 'Times-Italic' },

        // ── Rule ──
        { id: uid(), type: 'rect', x: cx - 80, y: h - 195, w: 160, h: 0.5, fillColour: '#b45309', strokeColour: '#b45309', strokeWidth: 0 },

        // ── Body ──
        { id: uid(), type: 'text', text: 'This is to certify that', x: cx - 73, y: h - 228, fontSize: 13, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Alexandra Johnson', x: cx - 115, y: h - 270, fontSize: 28, font: 'Times-BoldItalic' },

        // ── Underline below name ──
        { id: uid(), type: 'rect', x: cx - 130, y: h - 278, w: 260, h: 0.5, fillColour: '#d97706', strokeColour: '#d97706', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'has successfully completed the requirements for', x: cx - 145, y: h - 308, fontSize: 12, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Advanced PDF Document Engineering', x: cx - 125, y: h - 340, fontSize: 16, font: 'Times-Bold' },

        // ── Rule ──
        { id: uid(), type: 'rect', x: cx - 80, y: h - 360, w: 160, h: 0.5, fillColour: '#b45309', strokeColour: '#b45309', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'Awarded with Distinction on 19 February 2026', x: cx - 130, y: h - 385, fontSize: 10, font: 'Times-Italic' },

        // ── Signature blocks ──
        // Left: Date
        { id: uid(), type: 'rect', x: 120, y: 108, w: 160, h: 0.5, fillColour: '#44403c', strokeColour: '#44403c', strokeWidth: 0 },
        { id: uid(), type: 'text', text: '19 February 2026', x: 148, y: 114, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Date', x: 185, y: 90, fontSize: 9, font: 'Times-Italic' },

        // Right: Signature
        { id: uid(), type: 'rect', x: 560, y: 108, w: 160, h: 0.5, fillColour: '#44403c', strokeColour: '#44403c', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Prof. R. Williams', x: 587, y: 114, fontSize: 10, font: 'Times-Italic' },
        { id: uid(), type: 'text', text: 'Director of Studies', x: 590, y: 90, fontSize: 9, font: 'Times-Italic' },
      ],
    },
  ];
}

function businessCardTemplate(): PageDef[] {
  const w = 252; // 3.5"
  const h = 144; // 2"

  return [
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        // ── Left accent ──
        { id: uid(), type: 'rect', x: 0, y: 0, w: 5, h, fillColour: '#1d4ed8', strokeColour: '#1d4ed8', strokeWidth: 0 },

        // ── Name block ──
        { id: uid(), type: 'text', text: 'Sarah Chen', x: 20, y: h - 32, fontSize: 14, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Senior Software Engineer', x: 20, y: h - 47, fontSize: 8, font: 'Helvetica' },

        // ── Divider ──
        { id: uid(), type: 'rect', x: 20, y: h - 58, w: 40, h: 1.5, fillColour: '#1d4ed8', strokeColour: '#1d4ed8', strokeWidth: 0 },

        // ── Contact ──
        { id: uid(), type: 'text', text: 'sarah@acme.example.com', x: 20, y: 50, fontSize: 7, font: 'Courier' },
        { id: uid(), type: 'text', text: '+44 20 7946 0958', x: 20, y: 38, fontSize: 7, font: 'Courier' },
        { id: uid(), type: 'text', text: 'acme.example.com', x: 20, y: 26, fontSize: 7, font: 'Courier' },

        // ── Company ──
        { id: uid(), type: 'text', text: 'ACME', x: w - 52, y: h - 28, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'CORP.', x: w - 46, y: h - 41, fontSize: 8, font: 'Helvetica' },
      ],
    },
  ];
}

function reportHeader(w: number, h: number, m: number, cw: number): PageObj[] {
  return [
    { id: uid(), type: 'rect', x: 0, y: h - 40, w, h: 40, fillColour: '#f8fafc', strokeColour: '#f8fafc', strokeWidth: 0 },
    { id: uid(), type: 'text', text: 'Q4 Technical Report', x: m, y: h - 27, fontSize: 8, font: 'Helvetica', colour: '#64748b' },
    { id: uid(), type: 'text', text: 'CONFIDENTIAL', x: w - 110, y: h - 27, fontSize: 7, font: 'Helvetica-Bold', colour: '#dc2626' },
    { id: uid(), type: 'rect', x: m, y: h - 44, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
  ];
}

function reportFooter(m: number, cw: number, cx: number, pageNum: number): PageObj[] {
  return [
    { id: uid(), type: 'rect', x: m, y: 40, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
    { id: uid(), type: 'text', text: String(pageNum), x: cx - 3, y: 22, fontSize: 8, font: 'Helvetica', colour: '#94a3b8' },
  ];
}

function reportTemplate(): PageDef[] {
  const w = 595;
  const h = 842;
  const m = 50;
  const cx = w / 2;
  const cw = w - 2 * m;

  return [
    // ═══════════════════════════════════════════
    // Page 1 — Cover
    // ═══════════════════════════════════════════
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        // Top/bottom bars
        { id: uid(), type: 'rect', x: 0, y: h - 5, w, h: 5, fillColour: '#1e293b', strokeColour: '#1e293b', strokeWidth: 0 },
        { id: uid(), type: 'rect', x: 0, y: 0, w, h: 5, fillColour: '#1e293b', strokeColour: '#1e293b', strokeWidth: 0 },
        // Left accent
        { id: uid(), type: 'rect', x: 0, y: 5, w: 6, h: h - 10, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        // Title block
        { id: uid(), type: 'text', text: 'Q4 Technical', x: m + 10, y: h - 260, fontSize: 36, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Report', x: m + 10, y: h - 300, fontSize: 36, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m + 10, y: h - 318, w: 80, h: 3, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'PDFium Integration & Performance Analysis', x: m + 10, y: h - 348, fontSize: 13, font: 'Helvetica', colour: '#475569' },
        { id: uid(), type: 'text', text: 'February 2026', x: m + 10, y: h - 368, fontSize: 11, font: 'Helvetica-Oblique', colour: '#64748b' },

        // Classification badge
        { id: uid(), type: 'rect', x: m + 10, y: h - 400, w: 80, h: 18, fillColour: '#fef2f2', strokeColour: '#fecaca', strokeWidth: 0.5 },
        { id: uid(), type: 'text', text: 'CONFIDENTIAL', x: m + 15, y: h - 395, fontSize: 7, font: 'Helvetica-Bold', colour: '#dc2626' },

        // Footer
        { id: uid(), type: 'rect', x: m, y: 55, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'ACME Corporation', x: m, y: 35, fontSize: 11, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Engineering Division', x: m, y: 20, fontSize: 9, font: 'Helvetica', colour: '#64748b' },
      ],
    },

    // ═══════════════════════════════════════════
    // Page 2 — Executive Summary & Metrics
    // ═══════════════════════════════════════════
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        ...reportHeader(w, h, m, cw),

        // Section 1
        { id: uid(), type: 'text', text: '1. Executive Summary', x: m, y: h - 80, fontSize: 16, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m, y: h - 86, w: 40, h: 2.5, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'The PDFium WASM integration achieved a 94% performance improvement over the previous PDF.js-based', x: m, y: h - 110, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'solution. Document rendering latency dropped from 340ms to 18ms for typical single-page renders at', x: m, y: h - 124, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: '150 DPI. This translates to a significantly improved perceived performance for end users, particularly', x: m, y: h - 138, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'when scrolling through large multi-page documents at high zoom levels on both desktop and mobile devices.', x: m, y: h - 152, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: 'This report covers the technical architecture, benchmark results, integration challenges encountered during', x: m, y: h - 172, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'the migration, and recommendations for broader deployment across the full product portfolio including the', x: m, y: h - 186, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'web application, mobile hybrid views, and server-side rendering pipelines used for document conversion.', x: m, y: h - 200, fontSize: 10, font: 'Times-Roman' },

        // Key metrics box
        { id: uid(), type: 'rect', x: m, y: h - 330, w: cw, h: 105, fillColour: '#f8fafc', strokeColour: '#e2e8f0', strokeWidth: 0.5 },
        { id: uid(), type: 'rect', x: m, y: h - 225, w: cw, h: 1, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'KEY METRICS', x: m + 12, y: h - 240, fontSize: 7, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Render (p50):   18ms                                WASM Binary:    3.8 MB', x: m + 12, y: h - 263, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Render (p99):   45ms                                Bundle Delta:   +1.2 MB', x: m + 12, y: h - 277, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Memory:         12.4 MB                             API Coverage:   96 functions', x: m + 12, y: h - 291, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Init Time:      280ms                               Test Coverage:  95.2%', x: m + 12, y: h - 305, fontSize: 9, font: 'Courier' },

        // Section 2
        { id: uid(), type: 'text', text: '2. Architecture Overview', x: m, y: h - 365, fontSize: 16, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m, y: h - 371, w: 40, h: 2.5, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'The system employs a dual-backend architecture with automatic environment detection at initialisation time.', x: m, y: h - 395, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Browser consumers use the WASM backend via a dedicated Web Worker for off-main-thread rendering, while', x: m, y: h - 409, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Node.js consumers can optionally use the native N-API addon for maximum throughput in batch processing', x: m, y: h - 423, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'and server-side rendering workloads. Both backends expose an identical typed API surface to consumers.', x: m, y: h - 437, fontSize: 10, font: 'Times-Roman' },

        // Architecture layers box
        { id: uid(), type: 'rect', x: m, y: h - 580, w: cw, h: 120, fillColour: '#f8fafc', strokeColour: '#e2e8f0', strokeWidth: 0.5 },
        { id: uid(), type: 'text', text: 'ARCHITECTURE LAYERS', x: m + 12, y: h - 475, fontSize: 7, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'PDFium               Main entry point: init(), openDocument(), createDocumentBuilder()', x: m + 12, y: h - 498, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'PDFiumDocument        Document operations: pages, bookmarks, metadata, save, import pages', x: m + 12, y: h - 512, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'PDFiumBackend         Abstraction layer over WebAssembly or native Node.js N-API addon', x: m + 12, y: h - 526, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'WASMMemoryManager     Heap management with alloc/free tracking, typed reads/writes', x: m + 12, y: h - 540, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'PDFiumWASM            Typed bindings to 96 C functions (_FPDF_*, _FPDFPage_*, etc.)', x: m + 12, y: h - 554, fontSize: 9, font: 'Courier' },

        // 2.1 subsection
        { id: uid(), type: 'text', text: '2.1 Resource Management', x: m, y: h - 600, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'All resources implement Symbol.dispose via base classes in src/core/disposable.ts, enabling the TC39 "using"', x: m, y: h - 620, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'syntax for deterministic cleanup. A FinalizationRegistry safety net warns in development mode and runs', x: m, y: h - 634, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'cleanup callbacks if explicit disposal is missed, preventing WASM memory leaks in production deployments.', x: m, y: h - 648, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: '2.2 WASM Memory', x: m, y: h - 678, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'The WASMMemoryManager provides alloc/free with full tracking, typed reads and writes, and struct wrappers', x: m, y: h - 698, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'for C-level data structures (FSRectF, FSMatrix, FSPointF). WASMAllocation is an RAII wrapper with "using"', x: m, y: h - 712, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'support and take() for ownership transfer. All handles are branded number types for compile-time safety.', x: m, y: h - 726, fontSize: 10, font: 'Times-Roman' },

        ...reportFooter(m, cw, cx, 2),
      ],
    },

    // ═══════════════════════════════════════════
    // Page 3 — Performance Benchmarks
    // ═══════════════════════════════════════════
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        ...reportHeader(w, h, m, cw),

        // Section 3
        { id: uid(), type: 'text', text: '3. Performance Benchmarks', x: m, y: h - 80, fontSize: 16, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m, y: h - 86, w: 40, h: 2.5, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'All benchmarks were conducted on a MacBook Pro M3 with 36 GB RAM running Node.js 22.4 and Chrome 131.', x: m, y: h - 110, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'The test corpus comprised 500 documents ranging from 1 to 200 pages with varied content types including', x: m, y: h - 124, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'scanned images, vector graphics, form fields, annotations, and complex font embedding scenarios.', x: m, y: h - 138, fontSize: 10, font: 'Times-Roman' },

        // Table header
        { id: uid(), type: 'rect', x: m, y: h - 178, w: cw, h: 22, fillColour: '#1e293b', strokeColour: '#1e293b', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'OPERATION', x: m + 10, y: h - 171, fontSize: 7, font: 'Helvetica-Bold', colour: '#ffffff' },
        { id: uid(), type: 'text', text: 'PDF.JS', x: 280, y: h - 171, fontSize: 7, font: 'Helvetica-Bold', colour: '#ffffff' },
        { id: uid(), type: 'text', text: 'PDFIUM WASM', x: 370, y: h - 171, fontSize: 7, font: 'Helvetica-Bold', colour: '#ffffff' },
        { id: uid(), type: 'text', text: 'IMPROVEMENT', x: 470, y: h - 171, fontSize: 7, font: 'Helvetica-Bold', colour: '#ffffff' },

        // Row 1
        { id: uid(), type: 'rect', x: m, y: h - 206, w: cw, h: 20, fillColour: '#f8fafc', strokeColour: '#f8fafc', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Single page render at 150 DPI', x: m + 10, y: h - 200, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '340ms', x: 280, y: h - 200, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '18ms', x: 370, y: h - 200, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '94.7%', x: 470, y: h - 200, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Row 2
        { id: uid(), type: 'text', text: 'Full text extraction (50-page document)', x: m + 10, y: h - 222, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '1,240ms', x: 280, y: h - 222, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '89ms', x: 370, y: h - 222, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '92.8%', x: 470, y: h - 222, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Row 3
        { id: uid(), type: 'rect', x: m, y: h - 250, w: cw, h: 20, fillColour: '#f8fafc', strokeColour: '#f8fafc', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Document open (10 MB encrypted)', x: m + 10, y: h - 244, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '580ms', x: 280, y: h - 244, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '45ms', x: 370, y: h - 244, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '92.2%', x: 470, y: h - 244, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Row 4
        { id: uid(), type: 'text', text: 'Recursive bookmark tree extraction', x: m + 10, y: h - 266, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '210ms', x: 280, y: h - 266, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '12ms', x: 370, y: h - 266, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '94.3%', x: 470, y: h - 266, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Row 5
        { id: uid(), type: 'rect', x: m, y: h - 294, w: cw, h: 20, fillColour: '#f8fafc', strokeColour: '#f8fafc', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Annotation parsing (highlight + link)', x: m + 10, y: h - 288, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '160ms', x: 280, y: h - 288, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '8ms', x: 370, y: h - 288, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '95.0%', x: 470, y: h - 288, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Row 6
        { id: uid(), type: 'text', text: 'Interactive form field enumeration', x: m + 10, y: h - 310, fontSize: 9, font: 'Helvetica' },
        { id: uid(), type: 'text', text: '95ms', x: 280, y: h - 310, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '5ms', x: 370, y: h - 310, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '94.7%', x: 470, y: h - 310, fontSize: 9, font: 'Courier-Bold', colour: '#16a34a' },

        // Divider
        { id: uid(), type: 'rect', x: m, y: h - 320, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },

        // Section 3.1
        { id: uid(), type: 'text', text: '3.1 Memory Profile', x: m, y: h - 355, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'The WASM module consumes a baseline of 3.8 MB for the binary and approximately 8.6 MB of heap during', x: m, y: h - 375, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'steady-state operation. Peak memory during concurrent 10-page renders reaches 24 MB, well within the', x: m, y: h - 389, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'allocated budget of 64 MB per worker thread. Garbage collection pauses remain under 2ms at all times.', x: m, y: h - 403, fontSize: 10, font: 'Times-Roman' },

        // Memory breakdown box
        { id: uid(), type: 'rect', x: m, y: h - 510, w: cw, h: 85, fillColour: '#f8fafc', strokeColour: '#e2e8f0', strokeWidth: 0.5 },
        { id: uid(), type: 'text', text: 'MEMORY BREAKDOWN', x: m + 12, y: h - 440, fontSize: 7, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'WASM Binary:          3.8 MB  (fixed, loaded once per worker lifetime)', x: m + 12, y: h - 460, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'WASM Heap (idle):     4.2 MB  (variable, grows with document complexity)', x: m + 12, y: h - 474, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Render Buffers:       4.4 MB  (per-render, released after bitmap transfer)', x: m + 12, y: h - 488, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Total Steady-State:  12.4 MB  (within 64 MB budget per worker)', x: m + 12, y: h - 502, fontSize: 9, font: 'Courier-Bold' },

        // Section 3.2
        { id: uid(), type: 'text', text: '3.2 Scalability', x: m, y: h - 545, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Rendering performance scales linearly with page count. The Web Worker architecture ensures the main thread', x: m, y: h - 565, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'remains responsive even during heavy 100+ page document operations. SharedArrayBuffer is not required;', x: m, y: h - 579, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'bitmap data is transferred via postMessage with Transferable ownership for zero-copy delivery to the canvas.', x: m, y: h - 593, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: 'Load testing with 50 concurrent users demonstrated consistent sub-50ms render times at the server side via', x: m, y: h - 618, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'the N-API backend. No memory leaks were detected over a 72-hour continuous test run, tracked via the', x: m, y: h - 632, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Disposable base class and FinalizationRegistry. Resource tracking confirmed 100% disposal compliance.', x: m, y: h - 646, fontSize: 10, font: 'Times-Roman' },

        ...reportFooter(m, cw, cx, 3),
      ],
    },

    // ═══════════════════════════════════════════
    // Page 4 — React Integration & Recommendations
    // ═══════════════════════════════════════════
    {
      id: uid(),
      width: w,
      height: h,
      objects: [
        ...reportHeader(w, h, m, cw),

        // Section 4
        { id: uid(), type: 'text', text: '4. React Integration', x: m, y: h - 80, fontSize: 16, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m, y: h - 86, w: 40, h: 2.5, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        { id: uid(), type: 'text', text: 'The React SDK provides a complete viewer implementation with virtualised scrolling, text selection overlay,', x: m, y: h - 110, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'annotation rendering, search highlighting with match navigation, and interactive form field support. All', x: m, y: h - 124, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'PDFium operations run off-main-thread via a dedicated Web Worker, keeping the UI thread free for smooth', x: m, y: h - 138, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'scrolling and interaction even when processing large documents with thousands of text extraction calls.', x: m, y: h - 152, fontSize: 10, font: 'Times-Roman' },

        // Hook categories box
        { id: uid(), type: 'rect', x: m, y: h - 305, w: cw, h: 130, fillColour: '#f8fafc', strokeColour: '#e2e8f0', strokeWidth: 0.5 },
        { id: uid(), type: 'text', text: 'REACT HOOKS (28 total)', x: m + 12, y: h - 190, fontSize: 7, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Data (14):       usePageInfo, useTextContent, useAnnotations, useBookmarks, useLinks,', x: m + 12, y: h - 213, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '                 useFormWidgets, usePageObjects, useStructureTree, useAttachments ...', x: m + 12, y: h - 227, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Interaction (6): usePageNavigation, useZoom, useFitZoom, useWheelZoom, useKeyboardShortcuts,', x: m + 12, y: h - 247, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: '                 useCharacterInspector, useVisiblePages', x: m + 12, y: h - 261, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Rendering (1):   useRenderPage (LRU bitmap cache, default 30 pages, configurable)', x: m + 12, y: h - 281, fontSize: 9, font: 'Courier' },
        { id: uid(), type: 'text', text: 'Forms (2):       useDocumentFormActions, usePageFormActions (bump revision on mutation)', x: m + 12, y: h - 295, fontSize: 9, font: 'Courier' },

        // Section 4.1
        { id: uid(), type: 'text', text: '4.1 State Management', x: m, y: h - 340, fontSize: 12, font: 'Helvetica-Bold' },
        { id: uid(), type: 'text', text: 'Two useSyncExternalStore-backed stores replace traditional React state for high-frequency data fetching:', x: m, y: h - 360, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'QueryStore provides heterogeneous caching with pending/success/error states, and LRURenderStore manages', x: m, y: h - 374, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'rendered bitmaps with LRU eviction. Cache invalidation is revision-based: mutations bump a global counter', x: m, y: h - 388, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'which produces new cache keys, causing cache misses that trigger fresh data fetches automatically.', x: m, y: h - 402, fontSize: 10, font: 'Times-Roman' },

        // Section 5
        { id: uid(), type: 'text', text: '5. Recommendations', x: m, y: h - 445, fontSize: 16, font: 'Helvetica-Bold' },
        { id: uid(), type: 'rect', x: m, y: h - 451, w: 40, h: 2.5, fillColour: '#2563eb', strokeColour: '#2563eb', strokeWidth: 0 },

        // Numbered recommendations
        { id: uid(), type: 'text', text: '1.', x: m, y: h - 477, fontSize: 10, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Deploy the WASM backend to production for all browser-facing products. The 94% latency improvement', x: m + 18, y: h - 477, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'directly impacts core user experience KPIs including time-to-first-page and scroll responsiveness.', x: m + 18, y: h - 491, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: '2.', x: m, y: h - 515, fontSize: 10, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Adopt the N-API backend for all server-side rendering pipelines and batch document conversion jobs.', x: m + 18, y: h - 515, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Testing shows 3x throughput over WASM for batch operations, with lower per-request memory overhead.', x: m + 18, y: h - 529, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: '3.', x: m, y: h - 553, fontSize: 10, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Enable progressive loading for documents exceeding 50 pages. The virtualised scroll container already', x: m + 18, y: h - 553, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'supports this pattern and the LRU render cache ensures previously-viewed pages remain immediately', x: m + 18, y: h - 567, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'available during back-navigation without triggering additional render cycles on the worker thread.', x: m + 18, y: h - 581, fontSize: 10, font: 'Times-Roman' },

        { id: uid(), type: 'text', text: '4.', x: m, y: h - 605, fontSize: 10, font: 'Helvetica-Bold', colour: '#2563eb' },
        { id: uid(), type: 'text', text: 'Investigate custom font embedding for CJK document support. The current standard 14 fonts cover only', x: m + 18, y: h - 605, fontSize: 10, font: 'Times-Roman' },
        { id: uid(), type: 'text', text: 'Western languages; the builder API will need a loadCustomFont() method accepting TrueType/OpenType data.', x: m + 18, y: h - 619, fontSize: 10, font: 'Times-Roman' },

        // Closing statement
        { id: uid(), type: 'rect', x: m, y: h - 655, w: cw, h: 0.5, fillColour: '#e2e8f0', strokeColour: '#e2e8f0', strokeWidth: 0 },
        { id: uid(), type: 'text', text: 'Prepared by the Engineering Division, ACME Corporation. Distribution restricted to authorised personnel.', x: m, y: h - 675, fontSize: 9, font: 'Times-Italic', colour: '#64748b' },
        { id: uid(), type: 'text', text: 'For enquiries regarding this report or the PDFium integration project, contact eng@acme.example.com.', x: m, y: h - 689, fontSize: 9, font: 'Times-Italic', colour: '#64748b' },

        ...reportFooter(m, cw, cx, 4),
      ],
    },
  ];
}

const TEMPLATES = [
  { label: 'Invoice', description: 'Professional invoice with line items', build: invoiceTemplate },
  { label: 'Certificate', description: 'Landscape achievement certificate', build: certificateTemplate },
  { label: 'Business Card', description: 'Compact card with accent bar', build: businessCardTemplate },
  { label: 'Report', description: '4-page technical report with metrics', build: reportTemplate },
] as const;

// ── Component ───────────────────────────────────────────────────

export function CreatorLab() {
  const {
    instance: syncPdfium,
    document,
    loadDocument,
    isInitialising: isSyncInit,
    error: syncError,
  } = usePDFium();
  const viewer = useViewerSetup();

  // Keyboard shortcuts for zoom and page navigation
  const zoomReset = useCallback(() => viewer.zoom.setScale(1), [viewer.zoom.setScale]);
  useKeyboardShortcuts({
    nextPage: viewer.navigation.next,
    prevPage: viewer.navigation.prev,
    zoomIn: viewer.zoom.zoomIn,
    zoomOut: viewer.zoom.zoomOut,
    zoomReset,
  });

  const [pages, setPages] = useState<PageDef[]>([{ id: uid(), width: 595, height: 842, objects: [] }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Object input state (each type owns its own fields) ──
  const [addType, setAddType] = useState<'text' | 'rect' | 'line' | 'ellipse'>('text');

  // Text
  const [txtContent, setTxtContent] = useState('Hello PDF');
  const [txtX, setTxtX] = useState(40);
  const [txtY, setTxtY] = useState(700);
  const [txtSize, setTxtSize] = useState(24);
  const [txtFont, setTxtFont] = useState('Helvetica');
  const [txtColour, setTxtColour] = useState('#000000');

  // Rectangle
  const [rectX, setRectX] = useState(40);
  const [rectY, setRectY] = useState(600);
  const [rectW, setRectW] = useState(200);
  const [rectH, setRectH] = useState(100);
  const [rectFill, setRectFill] = useState('#3b82f6');
  const [rectStroke, setRectStroke] = useState('#1e40af');
  const [rectStrokeW, setRectStrokeW] = useState(1);

  // Line
  const [lineX1, setLineX1] = useState(40);
  const [lineY1, setLineY1] = useState(500);
  const [lineX2, setLineX2] = useState(240);
  const [lineY2, setLineY2] = useState(500);
  const [lineStroke, setLineStroke] = useState('#1e40af');
  const [lineStrokeW, setLineStrokeW] = useState(2);

  // Ellipse
  const [ellCX, setEllCX] = useState(200);
  const [ellCY, setEllCY] = useState(400);
  const [ellRX, setEllRX] = useState(80);
  const [ellRY, setEllRY] = useState(50);
  const [ellFill, setEllFill] = useState('#3b82f6');
  const [ellStroke, setEllStroke] = useState('#1e40af');
  const [ellStrokeW, setEllStrokeW] = useState(1);

  const activePage = pages[activePageIndex];

  // ── Page management ──
  const addPage = () => {
    setPages((prev) => [...prev, { id: uid(), width: 595, height: 842, objects: [] }]);
    setActivePageIndex(pages.length);
  };

  const setPageSize = (width: number, height: number) => {
    setPages((prev) => prev.map((p, i) => (i === activePageIndex ? { ...p, width, height } : p)));
  };

  // ── Object management ──
  const addObject = () => {
    if (!activePage) return;
    const id = uid();
    let obj: PageObj;
    switch (addType) {
      case 'text':
        obj = { id, type: 'text', text: txtContent, x: txtX, y: txtY, fontSize: txtSize, font: txtFont, colour: txtColour };
        break;
      case 'rect':
        obj = { id, type: 'rect', x: rectX, y: rectY, w: rectW, h: rectH, fillColour: rectFill, strokeColour: rectStroke, strokeWidth: rectStrokeW };
        break;
      case 'line':
        obj = { id, type: 'line', x1: lineX1, y1: lineY1, x2: lineX2, y2: lineY2, strokeColour: lineStroke, strokeWidth: lineStrokeW };
        break;
      case 'ellipse':
        obj = { id, type: 'ellipse', cx: ellCX, cy: ellCY, rx: ellRX, ry: ellRY, fillColour: ellFill, strokeColour: ellStroke, strokeWidth: ellStrokeW };
        break;
    }

    setPages((prev) =>
      prev.map((p, i) => (i === activePageIndex ? { ...p, objects: [...p.objects, obj] } : p)),
    );
  };

  const removeObject = (objId: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === activePageIndex ? { ...p, objects: p.objects.filter((o) => o.id !== objId) } : p)),
    );
  };

  // ── Templates ──
  const applyTemplate = (build: () => PageDef[]) => {
    setPages(build());
    setActivePageIndex(0);
  };

  // ── Generate PDF ──
  const generatePDF = async () => {
    if (!syncPdfium) return;
    setIsGenerating(true);
    try {
      await using builder = await syncPdfium.createDocumentBuilder();

      const fontNames = new Set<string>();
      for (const pg of pages) {
        for (const obj of pg.objects) {
          if (obj.type === 'text') fontNames.add(obj.font);
        }
      }
      const fonts = new Map<string, Awaited<ReturnType<typeof builder.loadStandardFont>>>();
      for (const name of fontNames) {
        fonts.set(name, await builder.loadStandardFont(name));
      }

      for (const pg of pages) {
        const page = await builder.addPage({ width: pg.width, height: pg.height });
        for (const obj of pg.objects) {
          switch (obj.type) {
            case 'text': {
              const font = fonts.get(obj.font);
              if (font) {
                await page.addText(obj.text, obj.x, obj.y, font, obj.fontSize, obj.colour ? hexToRgba(obj.colour) : undefined);
              }
              break;
            }
            case 'rect':
              await page.addRectangle(obj.x, obj.y, obj.w, obj.h, {
                fill: hexToRgba(obj.fillColour),
                stroke: hexToRgba(obj.strokeColour),
                strokeWidth: obj.strokeWidth,
              });
              break;
            case 'line':
              await page.addLine(obj.x1, obj.y1, obj.x2, obj.y2, {
                stroke: hexToRgba(obj.strokeColour),
                strokeWidth: obj.strokeWidth,
              });
              break;
            case 'ellipse':
              await page.addEllipse(obj.cx, obj.cy, obj.rx, obj.ry, {
                fill: hexToRgba(obj.fillColour),
                stroke: hexToRgba(obj.strokeColour),
                strokeWidth: obj.strokeWidth,
              });
              break;
          }
        }
      }

      const bytes = await builder.save();
      await loadDocument(bytes, 'Created Document');
      setHasGenerated(true);
      setCreatorError(null);
    } catch (err) {
      console.error(err);
      setCreatorError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalObjects = pages.reduce((sum, p) => sum + p.objects.length, 0);

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <ResponsiveSidebar
        side="left"
        breakpoint="md"
        label="Creator Controls"
        className="w-80 bg-gray-50 border-r flex flex-col overflow-hidden"
      >
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* Templates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyTemplate(tpl.build)}
                    className="text-left p-2 rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-xs font-semibold block">{tpl.label}</span>
                    <span className="text-[10px] text-gray-500">{tpl.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Page Setup */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pages ({pages.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                {pages.map((pg, i) => (
                  <button
                    key={pg.id}
                    type="button"
                    onClick={() => setActivePageIndex(i)}
                    className={`text-xs px-2 py-1 rounded border ${
                      i === activePageIndex
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Add page"
                  onClick={addPage}
                  className="text-xs px-2 py-1 rounded border border-dashed hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              {activePage && (
                <>
                  <div className="flex gap-1 flex-wrap">
                    {PAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPageSize(preset.width, preset.height)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          activePage.width === preset.width && activePage.height === preset.height
                            ? 'bg-gray-800 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {activePage.width} x {activePage.height} pt &middot; {activePage.objects.length} objects
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Add Object */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Add Object</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Type selector — tab-style row */}
              <div className="flex rounded-md border overflow-hidden">
                {([
                  { key: 'text', icon: 'T', label: 'Text' },
                  { key: 'rect', icon: 'R', label: 'Rect' },
                  { key: 'line', icon: 'L', label: 'Line' },
                  { key: 'ellipse', icon: 'E', label: 'Ellipse' },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAddType(key)}
                    aria-pressed={addType === key}
                    className={`flex-1 py-1.5 text-xs font-medium border-r last:border-r-0 ${
                      addType === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span aria-hidden="true" className="font-mono mr-1">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Text form ─────────────────────── */}
              {addType === 'text' && (
                <div className="space-y-2">
                  <label className="text-xs">
                    <span className="block text-gray-500 mb-0.5">Content</span>
                    <input
                      value={txtContent}
                      onChange={(e) => setTxtContent(e.target.value)}
                      className="border rounded w-full p-1 text-xs"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-gray-500 mb-0.5">Font</span>
                    <select
                      value={txtFont}
                      onChange={(e) => setTxtFont(e.target.value)}
                      className="border rounded w-full p-1 text-xs bg-white"
                    >
                      {STANDARD_FONTS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <label className="text-xs">
                      <span className="block text-gray-500 mb-0.5">X</span>
                      <input type="number" value={txtX} onChange={(e) => setTxtX(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                    </label>
                    <label className="text-xs">
                      <span className="block text-gray-500 mb-0.5">Y</span>
                      <input type="number" value={txtY} onChange={(e) => setTxtY(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                    </label>
                    <label className="text-xs">
                      <span className="block text-gray-500 mb-0.5">Size</span>
                      <input type="number" value={txtSize} onChange={(e) => setTxtSize(+e.target.value)} className="border rounded w-full p-1 text-xs" min={1} max={200} />
                    </label>
                    <label className="text-xs">
                      <span className="block text-gray-500 mb-0.5">Colour</span>
                      <input type="color" value={txtColour} onChange={(e) => setTxtColour(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                    </label>
                  </div>
                </div>
              )}

              {/* ── Rectangle form ────────────────── */}
              {addType === 'rect' && (
                <div className="space-y-2">
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Position & Size</legend>
                    <div className="grid grid-cols-4 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">X</span>
                        <input type="number" value={rectX} onChange={(e) => setRectX(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Y</span>
                        <input type="number" value={rectY} onChange={(e) => setRectY(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">W</span>
                        <input type="number" value={rectW} onChange={(e) => setRectW(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">H</span>
                        <input type="number" value={rectH} onChange={(e) => setRectH(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Style</legend>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Fill</span>
                        <input type="color" value={rectFill} onChange={(e) => setRectFill(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Stroke</span>
                        <input type="color" value={rectStroke} onChange={(e) => setRectStroke(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Width</span>
                        <input type="number" value={rectStrokeW} onChange={(e) => setRectStrokeW(+e.target.value)} className="border rounded w-full p-1 text-xs" min={0} max={20} />
                      </label>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ── Line form ─────────────────────── */}
              {addType === 'line' && (
                <div className="space-y-2">
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Start Point</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">X</span>
                        <input type="number" value={lineX1} onChange={(e) => setLineX1(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Y</span>
                        <input type="number" value={lineY1} onChange={(e) => setLineY1(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">End Point</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">X</span>
                        <input type="number" value={lineX2} onChange={(e) => setLineX2(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Y</span>
                        <input type="number" value={lineY2} onChange={(e) => setLineY2(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Style</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Colour</span>
                        <input type="color" value={lineStroke} onChange={(e) => setLineStroke(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Width</span>
                        <input type="number" value={lineStrokeW} onChange={(e) => setLineStrokeW(+e.target.value)} className="border rounded w-full p-1 text-xs" min={1} max={20} />
                      </label>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ── Ellipse form ──────────────────── */}
              {addType === 'ellipse' && (
                <div className="space-y-2">
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Centre</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">X</span>
                        <input type="number" value={ellCX} onChange={(e) => setEllCX(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Y</span>
                        <input type="number" value={ellCY} onChange={(e) => setEllCY(+e.target.value)} className="border rounded w-full p-1 text-xs" />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Radii</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">RX</span>
                        <input type="number" value={ellRX} onChange={(e) => setEllRX(+e.target.value)} className="border rounded w-full p-1 text-xs" min={1} />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">RY</span>
                        <input type="number" value={ellRY} onChange={(e) => setEllRY(+e.target.value)} className="border rounded w-full p-1 text-xs" min={1} />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1">
                    <legend className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Style</legend>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Fill</span>
                        <input type="color" value={ellFill} onChange={(e) => setEllFill(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Stroke</span>
                        <input type="color" value={ellStroke} onChange={(e) => setEllStroke(e.target.value)} className="w-full h-[26px] cursor-pointer rounded border" />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Width</span>
                        <input type="number" value={ellStrokeW} onChange={(e) => setEllStrokeW(+e.target.value)} className="border rounded w-full p-1 text-xs" min={0} max={20} />
                      </label>
                    </div>
                  </fieldset>
                </div>
              )}

              <Button onClick={addObject} className="w-full text-xs" size="sm">
                Add {addType === 'text' ? 'Text' : addType === 'rect' ? 'Rectangle' : addType === 'line' ? 'Line' : 'Ellipse'} to Page {activePageIndex + 1}
              </Button>
            </CardContent>
          </Card>

          {/* Object List */}
          {activePage && activePage.objects.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Objects on Page {activePageIndex + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-48 overflow-y-auto">
                {activePage.objects.map((obj) => (
                  <div
                    key={obj.id}
                    className="text-[11px] p-1.5 bg-gray-50 border rounded flex justify-between items-center gap-2"
                  >
                    <span className="truncate">
                      <span className={`font-mono ${objLabel(obj).colour}`}>{objLabel(obj).badge}</span>{' '}
                      <span className="text-gray-400">{objLabel(obj).detail}</span>
                    </span>
                    <button
                      onClick={() => removeObject(obj.id)}
                      className="text-red-400 hover:text-red-600 shrink-0 font-bold"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {syncError && (
            <Alert variant="destructive">
              <AlertDescription>{syncError.message}</AlertDescription>
            </Alert>
          )}
          {creatorError && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{creatorError}</span>
                <button
                  onClick={() => setCreatorError(null)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  &times;
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {isSyncInit && (
            <p className="text-xs text-gray-500 animate-pulse">Initialising PDFium...</p>
          )}

          <Button
            onClick={generatePDF}
            variant="primary"
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-xs"
            disabled={!syncPdfium || isGenerating || totalObjects === 0}
          >
            {isGenerating ? 'Generating...' : `Generate & Preview (${totalObjects} objects)`}
          </Button>

          {hasGenerated && document && <DownloadButton document={document} filename="created.pdf" />}
        </div>
      </ResponsiveSidebar>

      {/* ── Centre: Viewer ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {hasGenerated ? (
          <>
            <DefaultToolbar viewer={viewer}>
              {document && <DownloadButton document={document} filename="created.pdf" />}
            </DefaultToolbar>
            <PDFDocumentView
              containerRef={viewer.container.ref}
              scale={viewer.zoom.scale}
              scrollMode={viewer.scroll.scrollMode}
              currentPageIndex={viewer.navigation.pageIndex}
              onCurrentPageChange={viewer.navigation.setPageIndex}
              className="flex-1"
              classNames={{ page: 'shadow-xl' }}
            />
          </>
        ) : (
          <div className="flex-1 bg-gray-200 flex flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">Preview will appear here</p>
            <p className="text-xs text-gray-400">
              Choose a template or add objects, then Generate & Preview
            </p>
          </div>
        )}
      </div>

      {/* ── Right Sidebar: Documentation ──────────────────────────── */}
      <ResponsiveSidebar
        side="right"
        breakpoint="lg"
        label="Documentation"
        className="w-72 bg-white border-l overflow-y-auto p-3"
      >
        <DocPanel
          title="Document Creator"
          apis={[
            'createDocumentBuilder()',
            'addPage()',
            'addText()',
            'addRectangle()',
            'addLine()',
            'addEllipse()',
            'loadStandardFont()',
            'save()',
          ]}
          snippet={[
            'await using builder = await pdfium.createDocumentBuilder();',
            "const font = await builder.loadStandardFont('Helvetica-Bold');",
            'const page = await builder.addPage({ width: 595, height: 842 });',
            '',
            "await page.addText('Hello', 40, 700, font, 24,",
            '                   { r: 30, g: 64, b: 175, a: 255 });',
            'await page.addRectangle(40, 600, 200, 80, {',
            '      fill: { r: 59, g: 130, b: 246, a: 255 },',
            '    });',
            'await page.addLine(40, 590, 240, 590, {',
            '      stroke: { r: 0, g: 0, b: 0, a: 255 },',
            '      strokeWidth: 1,',
            '    });',
            'await page.addEllipse(140, 500, 60, 40, {',
            '      fill: { r: 220, g: 38, b: 38, a: 128 },',
            '    });',
            '',
            'const bytes = await builder.save();',
          ].join('\n')}
          description="Create PDF documents from scratch using the builder API. Supports multiple pages, all 14 standard PDF fonts with colour, rectangles, lines, and ellipses with fill/stroke styles. Use templates to see complete examples."
        />
      </ResponsiveSidebar>
    </div>
  );
}
