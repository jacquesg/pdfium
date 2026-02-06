/**
 * Conversion maps between PDFium native numeric values and TypeScript string enums.
 *
 * PDFium's C API uses numeric constants. These maps translate between the native
 * numbers and our developer-friendly string enum values.
 *
 * @module internal/enum-maps
 * @internal
 */

import {
  ActionType,
  AnnotationAppearanceMode,
  AnnotationType,
  AttachmentValueType,
  DestinationFitType,
  DocMDPPermission,
  DocumentActionType,
  DocumentAvailability,
  DuplexMode,
  FlattenFlags,
  FlattenResult,
  FontType,
  FormFieldType,
  FormType,
  ImageColourSpace,
  ImageMarkedContentType,
  LinearisationStatus,
  LineCapStyle,
  LineJoinStyle,
  PageActionType,
  PageBoxType,
  PageMode,
  PageObjectMarkValueType,
  PageObjectType,
  PageRotation,
  PathFillMode,
  PathSegmentType,
  ProgressiveRenderStatus,
  SaveFlags,
  TextRenderMode,
} from '../core/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a native numeric value to its string enum equivalent.
 *
 * @param map - The mapping from native number to enum value
 * @param value - The native number from PDFium
 * @param fallback - Default value if the number is not in the map
 * @returns The corresponding string enum value
 */
export function fromNative<T>(map: ReadonlyMap<number, T>, value: number, fallback: T): T {
  return map.get(value) ?? fallback;
}

/**
 * Convert a string enum value to its native numeric equivalent.
 *
 * @param map - The mapping from enum value to native number
 * @param value - The string enum value
 * @returns The corresponding native number for PDFium, or 0 if not found
 */
export function toNative<T>(map: ReadonlyMap<T, number>, value: T): number {
  const result = map.get(value);
  if (result === undefined) {
    throw new Error(`toNative: unmapped value '${String(value)}'`);
  }
  return result;
}

/**
 * Cast a raw numeric value from PDFium to a branded bitflags enum type.
 *
 * PDFium returns bitflag fields as plain numbers. This function performs
 * a type-level cast with a zero-cost runtime identity. Use this instead of
 * bare `as T` assertions to centralise the cast and make it searchable.
 *
 * @param value - The raw numeric value from PDFium
 * @returns The same value typed as `T`
 */
export function toBitflags<T extends number>(value: number): T {
  return value as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bidirectional map builder
// ─────────────────────────────────────────────────────────────────────────────

function bimap<T>(entries: readonly [number, T][]): {
  fromNative: ReadonlyMap<number, T>;
  toNative: ReadonlyMap<T, number>;
} {
  return {
    fromNative: new Map(entries),
    toNative: new Map(entries.map(([k, v]) => [v, k])),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enum maps
// ─────────────────────────────────────────────────────────────────────────────

export const pageRotationMap = bimap([
  [0, PageRotation.None],
  [1, PageRotation.Clockwise90],
  [2, PageRotation.Rotate180],
  [3, PageRotation.CounterClockwise90],
]);

export const flattenResultMap = bimap([
  [0, FlattenResult.Fail],
  [1, FlattenResult.Success],
  [2, FlattenResult.NothingToDo],
]);

export const pathSegmentTypeMap = bimap([
  [-1, PathSegmentType.Unknown],
  [0, PathSegmentType.LineTo],
  [1, PathSegmentType.BezierTo],
  [2, PathSegmentType.MoveTo],
]);

export const pathFillModeMap = bimap([
  [0, PathFillMode.None],
  [1, PathFillMode.Alternate],
  [2, PathFillMode.Winding],
]);

export const pageBoxTypeMap = bimap([
  [0, PageBoxType.MediaBox],
  [1, PageBoxType.CropBox],
  [2, PageBoxType.BleedBox],
  [3, PageBoxType.TrimBox],
  [4, PageBoxType.ArtBox],
]);

export const pageObjectTypeMap = bimap([
  [0, PageObjectType.Unknown],
  [1, PageObjectType.Text],
  [2, PageObjectType.Path],
  [3, PageObjectType.Image],
  [4, PageObjectType.Shading],
  [5, PageObjectType.Form],
]);

export const annotationTypeMap = bimap([
  [0, AnnotationType.Unknown],
  [1, AnnotationType.Text],
  [2, AnnotationType.Link],
  [3, AnnotationType.FreeText],
  [4, AnnotationType.Line],
  [5, AnnotationType.Square],
  [6, AnnotationType.Circle],
  [7, AnnotationType.Polygon],
  [8, AnnotationType.Highlight],
  [9, AnnotationType.Underline],
  [10, AnnotationType.Squiggly],
  [11, AnnotationType.Strikeout],
  [13, AnnotationType.Stamp],
  [14, AnnotationType.Caret],
  [15, AnnotationType.Ink],
  [16, AnnotationType.Popup],
  [17, AnnotationType.FileAttachment],
  [18, AnnotationType.Sound],
  [20, AnnotationType.Widget],
  [21, AnnotationType.Screen],
  [22, AnnotationType.PrinterMark],
  [23, AnnotationType.TrapNet],
  [24, AnnotationType.Watermark],
  [25, AnnotationType.ThreeD],
  [26, AnnotationType.RichMedia],
  [27, AnnotationType.XFAWidget],
  [28, AnnotationType.Redact],
]);

export const progressiveRenderStatusMap = bimap([
  [0, ProgressiveRenderStatus.Ready],
  [1, ProgressiveRenderStatus.ToBeContinued],
  [2, ProgressiveRenderStatus.Done],
  [3, ProgressiveRenderStatus.Failed],
]);

export const textRenderModeMap = bimap([
  [0, TextRenderMode.Fill],
  [1, TextRenderMode.Stroke],
  [2, TextRenderMode.FillStroke],
  [3, TextRenderMode.Invisible],
  [4, TextRenderMode.FillClip],
  [5, TextRenderMode.StrokeClip],
  [6, TextRenderMode.FillStrokeClip],
  [7, TextRenderMode.Clip],
]);

export const pageObjectMarkValueTypeMap = bimap([
  [0, PageObjectMarkValueType.Int],
  [2, PageObjectMarkValueType.String],
  [3, PageObjectMarkValueType.Blob],
  [4, PageObjectMarkValueType.Name],
]);

export const pageModeMap = bimap([
  [0, PageMode.UseNone],
  [1, PageMode.UseOutlines],
  [2, PageMode.UseThumbs],
  [3, PageMode.FullScreen],
  [4, PageMode.UseOC],
  [5, PageMode.UseAttachments],
]);

export const duplexModeMap = bimap([
  [0, DuplexMode.Undefined],
  [1, DuplexMode.Simplex],
  [2, DuplexMode.DuplexFlipShortEdge],
  [3, DuplexMode.DuplexFlipLongEdge],
]);

export const actionTypeMap = bimap([
  [0, ActionType.Unsupported],
  [1, ActionType.GoTo],
  [2, ActionType.RemoteGoTo],
  [3, ActionType.URI],
  [4, ActionType.Launch],
  [5, ActionType.EmbeddedGoTo],
]);

export const destinationFitTypeMap = bimap([
  [0, DestinationFitType.Unknown],
  [1, DestinationFitType.XYZ],
  [2, DestinationFitType.Fit],
  [3, DestinationFitType.FitH],
  [4, DestinationFitType.FitV],
  [5, DestinationFitType.FitR],
  [6, DestinationFitType.FitB],
  [7, DestinationFitType.FitBH],
  [8, DestinationFitType.FitBV],
]);

export const formFieldTypeMap = bimap([
  [0, FormFieldType.Unknown],
  [1, FormFieldType.PushButton],
  [2, FormFieldType.CheckBox],
  [3, FormFieldType.RadioButton],
  [4, FormFieldType.ComboBox],
  [5, FormFieldType.ListBox],
  [6, FormFieldType.TextField],
  [7, FormFieldType.Signature],
]);

export const annotationAppearanceModeMap = bimap([
  [0, AnnotationAppearanceMode.Normal],
  [1, AnnotationAppearanceMode.Rollover],
  [2, AnnotationAppearanceMode.Down],
]);

export const imageColourSpaceMap = bimap([
  [0, ImageColourSpace.Unknown],
  [1, ImageColourSpace.DeviceGray],
  [2, ImageColourSpace.DeviceRGB],
  [3, ImageColourSpace.DeviceCMYK],
  [4, ImageColourSpace.CalGray],
  [5, ImageColourSpace.CalRGB],
  [6, ImageColourSpace.Lab],
  [7, ImageColourSpace.ICCBased],
  [8, ImageColourSpace.Separation],
  [9, ImageColourSpace.DeviceN],
  [10, ImageColourSpace.Indexed],
  [11, ImageColourSpace.Pattern],
]);

export const imageMarkedContentTypeMap = bimap([
  [0, ImageMarkedContentType.None],
  [1, ImageMarkedContentType.Artifact],
  [2, ImageMarkedContentType.Tagged],
]);

export const attachmentValueTypeMap = bimap([
  [0, AttachmentValueType.Unknown],
  [1, AttachmentValueType.Boolean],
  [2, AttachmentValueType.Number],
  [3, AttachmentValueType.String],
  [4, AttachmentValueType.Name],
  [5, AttachmentValueType.Array],
  [6, AttachmentValueType.Dictionary],
  [7, AttachmentValueType.Stream],
  [8, AttachmentValueType.Reference],
]);

export const documentAvailabilityMap = bimap([
  [-1, DocumentAvailability.DataError],
  [0, DocumentAvailability.DataNotAvailable],
  [1, DocumentAvailability.DataAvailable],
  [2, DocumentAvailability.LinearisationUnknown],
]);

export const linearisationStatusMap = bimap([
  [-1, LinearisationStatus.Unknown],
  [0, LinearisationStatus.NotLinearised],
  [1, LinearisationStatus.Linearised],
]);

export const formTypeMap = bimap([
  [0, FormType.None],
  [1, FormType.AcroForm],
  [2, FormType.XFAFull],
  [3, FormType.XFAForeground],
]);

export const docMDPPermissionMap = bimap([
  [0, DocMDPPermission.None],
  [1, DocMDPPermission.NoChanges],
  [2, DocMDPPermission.FillAndSign],
  [3, DocMDPPermission.FillSignAnnotate],
]);

export const lineCapStyleMap = bimap([
  [0, LineCapStyle.Butt],
  [1, LineCapStyle.Round],
  [2, LineCapStyle.Square],
]);

export const lineJoinStyleMap = bimap([
  [0, LineJoinStyle.Miter],
  [1, LineJoinStyle.Round],
  [2, LineJoinStyle.Bevel],
]);

export const documentActionTypeMap = bimap([
  [0, DocumentActionType.WillClose],
  [1, DocumentActionType.WillSave],
  [2, DocumentActionType.DidSave],
  [3, DocumentActionType.WillPrint],
  [4, DocumentActionType.DidPrint],
]);

export const pageActionTypeMap = bimap([
  [0, PageActionType.Open],
  [1, PageActionType.Close],
]);

export const flattenFlagsMap = bimap([
  [0, FlattenFlags.NormalDisplay],
  [1, FlattenFlags.Print],
]);

export const saveFlagsMap = bimap([
  [0, SaveFlags.None],
  [1, SaveFlags.Incremental],
  [2, SaveFlags.NoIncremental],
  [3, SaveFlags.RemoveSecurity],
]);

export const fontTypeMap = bimap([
  [1, FontType.Type1],
  [2, FontType.TrueType],
]);
