/**
 * Integration tests for form field annotations using external PDFs
 * from the chromium/pdfium test corpus.
 */

import { FormFieldType } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('ComboBox Form Fields (combobox_form.pdf)', () => {
  test('should have widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);
    expect(page.annotationCount).toBeGreaterThan(0);
  });

  test('Combo_Editable has ComboBox type with options Foo/Bar/Qux', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Combo_Editable') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ComboBox);

        const options = annot.getFormFieldOptions();
        expect(options).toBeDefined();
        const labels = options!.map((opt) => opt.label);
        expect(labels).toContain('Foo');
        expect(labels).toContain('Bar');
        expect(labels).toContain('Qux');
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Combo1 has 26 options with value', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Combo1') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ComboBox);

        const options = annot.getFormFieldOptions();
        expect(options).toBeDefined();
        expect(options!.length).toBeGreaterThanOrEqual(26);

        const labels = options!.map((opt) => opt.label);
        expect(labels).toContain('Banana');

        const value = annot.getFormFieldValue();
        expect(value).toBeDefined();
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Combo_ReadOnly has read-only flags', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Combo_ReadOnly') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ComboBox);
        const flags = annot.getFormFieldFlags();
        expect(typeof flags).toBe('number');
        // ReadOnly flag is bit 0 (value 1)
        expect(flags & 1).toBe(1);
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('form control count and index accessible', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);

    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget()) {
        const controlCount = annot.getFormControlCount();
        expect(controlCount).toBeTypeOf('number');
        expect(controlCount).toBeGreaterThanOrEqual(0);

        const controlIndex = annot.getFormControlIndex();
        expect(controlIndex).toBeTypeOf('number');
        break;
      }
    }
  });
});

describe('ListBox Form Fields (listbox_form.pdf)', () => {
  test('should have widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/listbox_form.pdf');
    using page = doc.getPage(0);
    expect(page.annotationCount).toBeGreaterThan(0);
  });

  test('Listbox_SingleSelect has ListBox type with options', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/listbox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Listbox_SingleSelect') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ListBox);

        const options = annot.getFormFieldOptions();
        expect(options).toBeDefined();
        expect(options!.length).toBeGreaterThan(0);
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Listbox_MultiSelect has 26+ options', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/listbox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Listbox_MultiSelect') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ListBox);

        const options = annot.getFormFieldOptions();
        expect(options).toBeDefined();
        expect(options!.length).toBeGreaterThanOrEqual(26);
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Listbox_ReadOnly has read-only flags', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/listbox_form.pdf');
    using page = doc.getPage(0);

    let found = false;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldName() === 'Listbox_ReadOnly') {
        found = true;
        expect(annot.getFormFieldType()).toBe(FormFieldType.ListBox);
        const flags = annot.getFormFieldFlags();
        expect(flags & 1).toBe(1); // ReadOnly bit
        break;
      }
    }
    expect(found).toBe(true);
  });
});

describe('TextField Form Fields (text_form.pdf)', () => {
  test('should have widget annotations with TextField type', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/text_form.pdf');
    using page = doc.getPage(0);

    let textFieldCount = 0;
    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldType() === FormFieldType.TextField) {
        textFieldCount++;
        const name = annot.getFormFieldName();
        expect(name).toBeDefined();
        expect(name).toBeTypeOf('string');
      }
    }
    expect(textFieldCount).toBeGreaterThan(0);
  });

  test('text field values are strings or undefined', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/text_form.pdf');
    using page = doc.getPage(0);

    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget() && annot.getFormFieldType() === FormFieldType.TextField) {
        const value = annot.getFormFieldValue();
        expect(value === undefined || typeof value === 'string').toBe(true);
        break;
      }
    }
  });
});

describe('Widget Option Structure', () => {
  test('option indices are sequential', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/combobox_form.pdf');
    using page = doc.getPage(0);

    for (let i = 0; i < page.annotationCount; i++) {
      using annot = page.getAnnotation(i);
      if (annot.isWidget()) {
        const options = annot.getFormFieldOptions();
        if (options && options.length > 0) {
          options.forEach((opt, idx) => {
            expect(opt.index).toBe(idx);
            expect(typeof opt.label).toBe('string');
            expect(typeof opt.selected).toBe('boolean');
          });
        }
        break;
      }
    }
  });
});
