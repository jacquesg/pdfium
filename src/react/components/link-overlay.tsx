'use client';

import type { CSSProperties } from 'react';
import type { SerialisedLink } from '../../context/protocol.js';
import type { Rect, WebLink } from '../../core/types.js';
import { pdfRectToScreen } from '../coordinates.js';
import { VISUALLY_HIDDEN_STYLE } from '../internal/a11y.js';

interface LinkOverlayProps {
  links: SerialisedLink[];
  webLinks: WebLink[];
  width: number;
  height: number;
  originalHeight: number;
  scale: number;
  /** Called when a link navigates to a page within the document. */
  onNavigate?: ((pageIndex: number) => void) | undefined;
  style?: CSSProperties;
}

function LinkOverlay({ links, webLinks, width, height, originalHeight, scale, onNavigate, style }: LinkOverlayProps) {
  const ctx = { scale, originalHeight };

  return (
    <nav
      aria-label="Page links"
      style={{
        position: 'absolute',
        inset: 0,
        width,
        height,
        zIndex: 15,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Annotation links (GoTo, URI, etc.) */}
      {links.map((link) => {
        const screen = pdfRectToScreen(link.bounds, ctx);
        const uri = link.action?.uri;
        const dest = link.destination ?? (link.action?.type === 'GoTo' ? link.destination : undefined);

        const handleClick = () => {
          if (uri) {
            window.open(uri, '_blank', 'noopener,noreferrer');
          } else if (dest) {
            onNavigate?.(dest.pageIndex);
          }
        };

        const title = uri ?? (dest ? `Go to page ${dest.pageIndex + 1}` : 'Link');

        return (
          <a
            key={`link-${link.index}`}
            href={uri ?? '#'}
            title={title}
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            style={{
              position: 'absolute',
              left: screen.x,
              top: screen.y,
              width: screen.width,
              height: screen.height,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            aria-label={title}
          >
            <span style={VISUALLY_HIDDEN_STYLE}>{title}</span>
          </a>
        );
      })}

      {/* Auto-detected web links */}
      {webLinks.map((wl) =>
        wl.rects.map((rect: Rect, ri: number) => {
          const screen = pdfRectToScreen(rect, ctx);
          return (
            <a
              key={`web-${wl.index}-${ri}`}
              href={wl.url}
              target="_blank"
              rel="noopener noreferrer"
              title={wl.url}
              style={{
                position: 'absolute',
                left: screen.x,
                top: screen.y,
                width: screen.width,
                height: screen.height,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              aria-label={wl.url}
            >
              <span style={VISUALLY_HIDDEN_STYLE}>{wl.url}</span>
            </a>
          );
        }),
      )}
    </nav>
  );
}

export { LinkOverlay };
export type { LinkOverlayProps };
