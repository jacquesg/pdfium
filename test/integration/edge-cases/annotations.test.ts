import { AnnotationType } from '../../../src/core/types.js';
import { describe, expect, test } from '../../utils/fixtures.js';

describe('Annotation Edge Cases', () => {
  test('should return null link from non-link annotation', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    using annot = page.createAnnotation(AnnotationType.Text);
    expect(annot).not.toBeNull();
    if (annot) {
      expect(annot.getLink()).toBeNull();
    }
  });
});
