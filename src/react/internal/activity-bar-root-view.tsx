import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import type { PanelEntry } from '../components/panels/types.js';
import { renderActivityBarIcon } from './activity-bar-icons.js';
import { buildActivityBarItems, resolveActivityBarFocusTarget } from './activity-bar-model.js';
import { ActivityBarView } from './activity-bar-view.js';

interface ActivityBarProps {
  panels: readonly PanelEntry[];
  activePanel: string | null;
  onTogglePanel: (id: string) => void;
  panelContainerId?: string | undefined;
  lastFocusedButtonRef?: RefObject<HTMLButtonElement | null> | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function ActivityBarRootView({
  panels,
  activePanel,
  onTogglePanel,
  panelContainerId,
  lastFocusedButtonRef,
  className,
  style,
}: ActivityBarProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const items = useMemo(() => buildActivityBarItems(panels, activePanel), [panels, activePanel]);

  const focusButton = useCallback((index: number) => {
    buttonsRef.current[index]?.focus();
  }, []);

  const handleButtonKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const nextIndex = resolveActivityBarFocusTarget(event.key, index, items.length);
      if (nextIndex === null) return;
      event.preventDefault();
      focusButton(nextIndex);
    },
    [focusButton, items.length],
  );

  const handleButtonClick = useCallback(
    (index: number, id: string) => {
      if (lastFocusedButtonRef) {
        lastFocusedButtonRef.current = buttonsRef.current[index] ?? null;
      }
      onTogglePanel(id);
    },
    [lastFocusedButtonRef, onTogglePanel],
  );

  return (
    <ActivityBarView
      items={items}
      panelContainerId={panelContainerId}
      className={className}
      style={style}
      onButtonRef={(index, element) => {
        buttonsRef.current[index] = element;
      }}
      onButtonClick={handleButtonClick}
      onButtonKeyDown={handleButtonKeyDown}
      renderIcon={(item) => renderActivityBarIcon(item.entry)}
    />
  );
}

export { ActivityBarRootView };
export type { ActivityBarProps };
