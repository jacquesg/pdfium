import type { NavItem } from '../components/Sidebar';

export type SampleCategory = 'general' | 'annotations' | 'forms' | 'structure' | 'graphics' | 'security' | 'advanced';

export interface SamplePdf {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: SampleCategory;
  suggestedLabs: NavItem[];
  password?: string;
}

export interface CategoryInfo {
  id: SampleCategory;
  label: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'general', label: 'General' },
  { id: 'annotations', label: 'Annotations' },
  { id: 'forms', label: 'Forms' },
  { id: 'structure', label: 'Structure' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'security', label: 'Security' },
  { id: 'advanced', label: 'Advanced' },
];

export const SAMPLE_PDFS: SamplePdf[] = [
  // General
  {
    id: 'sample',
    name: 'Sample Document',
    filename: 'sample.pdf',
    description: 'Multi-page general purpose document',
    category: 'general',
    suggestedLabs: ['viewer', 'render'],
  },
  {
    id: 'reference',
    name: 'Reference (Multi-page)',
    filename: 'reference.pdf',
    description: 'Larger reference document with varied content',
    category: 'general',
    suggestedLabs: ['viewer', 'render'],
  },

  // Annotations
  {
    id: 'annots',
    name: 'Mixed Annotations',
    filename: 'annots.pdf',
    description: 'Highlights, ink, lines, polygons',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'ink-annot',
    name: 'Ink Strokes',
    filename: 'ink_annot.pdf',
    description: 'Freehand ink annotations',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'line-annot',
    name: 'Line Annotations',
    filename: 'line_annot.pdf',
    description: 'Straight line markup',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'polygon-annot',
    name: 'Polygon Annotations',
    filename: 'polygon_annot.pdf',
    description: 'Polygon shape annotations',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'highlight-long',
    name: 'Long Highlights',
    filename: 'annotation_highlight_long_content.pdf',
    description: 'Extended highlight annotations',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'ink-multiple',
    name: 'Multiple Ink Strokes',
    filename: 'annotation_ink_multiple.pdf',
    description: 'Multiple freehand ink paths',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'annot-javascript',
    name: 'JavaScript Actions',
    filename: 'annot_javascript.pdf',
    description: 'Annotations with JavaScript triggers',
    category: 'annotations',
    suggestedLabs: ['viewer'],
  },

  // Forms
  {
    id: 'text-form',
    name: 'Text Fields',
    filename: 'text_form.pdf',
    description: 'Text input form fields',
    category: 'forms',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'combobox-form',
    name: 'ComboBox',
    filename: 'combobox_form.pdf',
    description: 'Dropdown combo box fields',
    category: 'forms',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'listbox-form',
    name: 'ListBox',
    filename: 'listbox_form.pdf',
    description: 'List selection fields',
    category: 'forms',
    suggestedLabs: ['viewer'],
  },

  // Structure
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    filename: 'bookmarks.pdf',
    description: 'Document outline / bookmarks',
    category: 'structure',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'named-dests',
    name: 'Named Destinations',
    filename: 'named_dests.pdf',
    description: 'Named destination links',
    category: 'structure',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'tagged-table',
    name: 'Tagged Table',
    filename: 'tagged_table.pdf',
    description: 'Accessible tagged table structure',
    category: 'structure',
    suggestedLabs: ['viewer'],
  },
  {
    id: 'weblinks',
    name: 'Web Links',
    filename: 'weblinks.pdf',
    description: 'Embedded hyperlinks',
    category: 'structure',
    suggestedLabs: ['viewer'],
  },

  // Graphics
  {
    id: 'clip-path',
    name: 'Clipping Paths',
    filename: 'clip_path.pdf',
    description: 'Path clipping operations',
    category: 'graphics',
    suggestedLabs: ['viewer', 'render'],
  },
  {
    id: 'dashed-lines',
    name: 'Dashed Lines',
    filename: 'dashed_lines.pdf',
    description: 'Dashed stroke patterns',
    category: 'graphics',
    suggestedLabs: ['viewer', 'render'],
  },
  {
    id: 'graphics-states',
    name: 'Transparency & States',
    filename: 'multiple_graphics_states.pdf',
    description: 'Transparency and graphics state stacking',
    category: 'graphics',
    suggestedLabs: ['viewer', 'render'],
  },

  // Security
  {
    id: 'protected',
    name: 'Password Protected',
    filename: 'protected.pdf',
    description: 'Requires password: 12345678',
    category: 'security',
    suggestedLabs: ['security', 'viewer'],
    password: '12345678',
  },
  {
    id: 'signature-reason',
    name: 'Digital Signatures',
    filename: 'signature_reason.pdf',
    description: 'Signed with reason field',
    category: 'security',
    suggestedLabs: ['security', 'viewer'],
  },

  // Advanced
  {
    id: 'linearized',
    name: 'Linearised (Progressive)',
    filename: 'linearized.pdf',
    description: 'Optimised for progressive web loading',
    category: 'advanced',
    suggestedLabs: ['viewer'],
  },
];

/** Get samples grouped by category, preserving category order */
export function getSamplesByCategory(): Array<{ category: CategoryInfo; samples: SamplePdf[] }> {
  return CATEGORIES.map((category) => ({
    category,
    samples: SAMPLE_PDFS.filter((s) => s.category === category.id),
  })).filter((group) => group.samples.length > 0);
}

/** Get one representative sample per category (first in each group) */
export function getRepresentativeSamples(): SamplePdf[] {
  return CATEGORIES.map((cat) => SAMPLE_PDFS.find((s) => s.category === cat.id)).filter(
    (s): s is SamplePdf => s !== undefined,
  );
}
