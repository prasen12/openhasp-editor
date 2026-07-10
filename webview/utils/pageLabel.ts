import { Page } from '../types';

export const OVERLAY_PAGE_ID = 0;

export function isOverlayPage(page: Page): boolean {
  return page.id === OVERLAY_PAGE_ID;
}

export function getPageLabel(page: Page): string {
  if (isOverlayPage(page)) return 'Page 0 (Overlay)';
  const title = page.comment || page.name;
  return title ? `Page ${page.id}: ${title}` : `Page ${page.id}`;
}

export function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => a.id - b.id);
}
