export interface PageManagementActions {
  deletePage(pageIndex: number, width: number, height: number): Promise<void>;
  insertBlankPage(pageIndex: number, width?: number, height?: number): Promise<void>;
  movePage(pageIndex: number, destPageIndex: number): Promise<void>;
}
