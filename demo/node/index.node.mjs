import { PDFium } from '@scaryterry/pdfium';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  using pdfium = await PDFium.init();
  console.log('=> library initialised');

  const pdf = await readFile(join(__dirname, 'sample.pdf'));
  using document = await pdfium.openDocument(pdf);
  console.log('=> document loaded');
  console.log(`===> number of pages: ${document.pageCount}`);

  {
    using page = document.getPage(0);
    console.log('=> page loaded');

    const { width, height } = page.size;
    console.log(`===> page size: ${width} x ${height}`);

    const text = page.getText();
    console.log(`===> text length: ${text.length} characters`);
  }

  console.log('=> done');
}

main();
