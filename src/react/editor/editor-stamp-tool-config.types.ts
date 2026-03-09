/**
 * Standard stamp annotation types recognised by PDF viewers.
 */
export type StampType =
  | 'Approved'
  | 'AsIs'
  | 'Confidential'
  | 'Departmental'
  | 'Draft'
  | 'Experimental'
  | 'Expired'
  | 'Final'
  | 'ForComment'
  | 'ForPublicRelease'
  | 'NotApproved'
  | 'NotForPublicRelease'
  | 'Sold'
  | 'TopSecret';

/**
 * Configuration for the stamp annotation tool.
 */
export interface StampToolConfig {
  readonly stampType: StampType;
}
