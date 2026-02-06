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
            { label: 'Backends & Environments', slug: 'concepts/environments' },
            { label: 'Native vs WASM', slug: 'concepts/backends' },
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
              label: 'Forms & Manipulation',
              items: [
                { label: 'Interactive Forms', slug: 'guides/forms' },
                { label: 'Merging & Layouts', slug: 'guides/merging-layouts' },
              ],
            },
            {
              label: 'Advanced',
              items: [
                { label: 'Advanced Rendering', slug: 'guides/advanced-rendering' },
                { label: 'Worker Mode', slug: 'guides/worker-mode' },
                { label: 'Digital Signatures & JS', slug: 'guides/advanced-features' },
                { label: 'Security', slug: 'guides/security' },
              ],
            },
            {
              label: 'Troubleshooting',
              items: [
                { label: 'Common Issues', slug: 'guides/troubleshooting' },
                { label: 'Native Backend', slug: 'guides/native-troubleshooting' },
              ],
            },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Overview', slug: 'api' },
            {
              label: 'Classes',
              autogenerate: { directory: 'api/classes' },
            },
            {
              label: 'Interfaces',
              autogenerate: { directory: 'api/interfaces' },
            },
            {
              label: 'Enums',
              autogenerate: { directory: 'api/enumerations' },
            },
            {
              label: 'Types',
              autogenerate: { directory: 'api/type-aliases' },
            },
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
