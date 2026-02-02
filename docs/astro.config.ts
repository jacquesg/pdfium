import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://jacquesg.github.io',
  base: '/pdfium',
  integrations: [
    starlight({
      title: '@scaryterry/pdfium',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/jacquesg/pdfium' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Installation', slug: 'installation' },
            { label: 'Quick Start', slug: 'quick-start' },
            { label: 'TypeScript Setup', slug: 'typescript-setup' },
            { label: 'Upgrade Guide', slug: 'upgrade-guide' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Architecture', slug: 'concepts/architecture' },
            { label: 'Resource Management', slug: 'concepts/resource-management' },
            { label: 'Document Lifecycle', slug: 'concepts/document-lifecycle' },
            { label: 'Coordinate Systems', slug: 'concepts/coordinates' },
            { label: 'Memory Management', slug: 'concepts/memory' },
            { label: 'Error Handling', slug: 'concepts/error-handling' },
            { label: 'Browser vs Node.js', slug: 'concepts/environments' },
            { label: 'Performance', slug: 'concepts/performance' },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Documents',
              items: [
                { label: 'Open Document', slug: 'guides/open-document' },
                { label: 'Save Document', slug: 'guides/save-document' },
                { label: 'Create Document', slug: 'guides/create-document' },
                { label: 'Progressive Loading', slug: 'guides/progressive-loading' },
              ],
            },
            {
              label: 'Pages',
              items: [
                { label: 'Render to Image', slug: 'guides/render-pdf' },
                { label: 'Page Properties', slug: 'guides/page-properties' },
                { label: 'Iterate Pages', slug: 'guides/iterate-pages' },
              ],
            },
            {
              label: 'Text',
              items: [
                { label: 'Extract Text', slug: 'guides/extract-text' },
                { label: 'Search Text', slug: 'guides/search-text' },
                { label: 'Character Positioning', slug: 'guides/character-positioning' },
              ],
            },
            {
              label: 'Objects & Structure',
              items: [
                { label: 'Page Objects', slug: 'guides/page-objects' },
                { label: 'Extract Images', slug: 'guides/extract-images' },
                { label: 'Annotations', slug: 'guides/annotations' },
                { label: 'Bookmarks', slug: 'guides/bookmarks' },
                { label: 'Attachments', slug: 'guides/attachments' },
              ],
            },
            {
              label: 'Building PDFs',
              items: [
                { label: 'Add Pages', slug: 'guides/add-pages' },
                { label: 'Add Text', slug: 'guides/add-text' },
                { label: 'Add Shapes', slug: 'guides/add-shapes' },
              ],
            },
            {
              label: 'Advanced',
              items: [
                { label: 'Worker Mode', slug: 'guides/worker-mode' },
              ],
            },
          ],
        },
        {
          label: 'API Reference',
          items: [
            {
              label: 'Classes',
              items: [
                { label: 'PDFium', slug: 'api/classes/pdfium' },
                { label: 'PDFiumDocument', slug: 'api/classes/pdfium-document' },
                { label: 'PDFiumPage', slug: 'api/classes/pdfium-page' },
                { label: 'PDFiumDocumentBuilder', slug: 'api/classes/pdfium-document-builder' },
                { label: 'PDFiumPageBuilder', slug: 'api/classes/pdfium-page-builder' },
                { label: 'ProgressivePDFLoader', slug: 'api/classes/progressive-pdf-loader' },
                { label: 'WorkerProxy', slug: 'api/classes/worker-proxy' },
              ],
            },
            {
              label: 'Enums',
              items: [
                { label: 'PageRotation', slug: 'api/enums/page-rotation' },
                { label: 'PageObjectType', slug: 'api/enums/page-object-type' },
                { label: 'AnnotationType', slug: 'api/enums/annotation-type' },
                { label: 'TextSearchFlags', slug: 'api/enums/text-search-flags' },
                { label: 'FontType', slug: 'api/enums/font-type' },
                { label: 'SaveFlags', slug: 'api/enums/save-flags' },
                { label: 'PDFiumErrorCode', slug: 'api/enums/pdfium-error-code' },
                { label: 'DocumentAvailability', slug: 'api/enums/document-availability' },
                { label: 'LinearisationStatus', slug: 'api/enums/linearisation-status' },
              ],
            },
            { label: 'Interfaces', slug: 'api/interfaces' },
            { label: 'Types', slug: 'api/types' },
          ],
        },
        {
          label: 'Errors',
          link: 'errors/',
        },
        {
          label: 'Examples',
          items: [
            { label: 'Node.js', slug: 'examples/nodejs' },
            { label: 'Browser', slug: 'examples/browser' },
            { label: 'Common Patterns', slug: 'examples/patterns' },
          ],
        },
      ],
    }),
  ],
});
