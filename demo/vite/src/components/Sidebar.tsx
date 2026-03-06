import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus,
  LayoutGrid,
  type LucideIcon,
  Menu,
  Monitor,
  PenTool,
  Shield,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export type NavItem = 'viewer' | 'editor' | 'creator' | 'mixer' | 'render' | 'security';

interface NavEntry {
  id: NavItem;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavEntry[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Document',
    items: [
      { id: 'viewer', label: 'Viewer', icon: Eye },
      { id: 'editor', label: 'Editor', icon: PenTool },
      { id: 'security', label: 'Security', icon: Shield },
    ],
  },
  {
    title: 'Create & Transform',
    items: [
      { id: 'creator', label: 'Document Creator', icon: FilePlus },
      { id: 'mixer', label: 'Page Mixer', icon: LayoutGrid },
      { id: 'render', label: 'Rendering Options', icon: Monitor },
    ],
  },
];

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarProps {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const sidebarContent = (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      {/* Header */}
      <div className={cn('flex items-center border-b border-gray-200 dark:border-gray-700 h-14 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">PDFium Playground</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden shrink-0"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-2">
        <TooltipProvider delayDuration={0}>
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group.title}>
              {groupIdx > 0 && <Separator className="my-2" />}
              {!collapsed && (
                <div className="px-3 py-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{group.title}</span>
                </div>
              )}
              {group.items.map((item) => {
                const isActive = activeItem === item.id;
                const Icon = item.icon;

                const button = (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-md text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-2 py-2 mx-1' : 'px-3 py-2 mx-1',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>
          ))}
        </TooltipProvider>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative w-60 h-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200 overflow-hidden',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export { NAV_GROUPS };
