import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type SampleCategory, type SamplePdf, getSamplesByCategory } from '../data/samplePdfs';
import type { NavItem } from './Sidebar';
import { Button } from './ui/button';

interface SamplePickerProps {
  onSelect: (sample: SamplePdf) => void;
  currentFilename: string | null;
  activeNav?: NavItem;
}

const grouped = getSamplesByCategory();

export function SamplePicker({ onSelect, currentFilename, activeNav }: SamplePickerProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<SampleCategory>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggleCategory = useCallback((id: SampleCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (sample: SamplePdf) => {
      onSelect(sample);
      setOpen(false);
    },
    [onSelect],
  );

  // Auto-expand all categories when opening
  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setExpanded(new Set(grouped.map((g) => g.category.id)));
      }
      return !prev;
    });
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button variant="outline" size="sm" onClick={handleToggle} className="gap-1.5">
        Sample PDFs
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          {grouped.map(({ category, samples }) => (
            <div key={category.id}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50"
              >
                {expanded.has(category.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {category.label}
              </button>

              {expanded.has(category.id) &&
                samples.map((sample) => {
                  const isCurrent = currentFilename === sample.filename;
                  const isRecommended = activeNav != null && sample.suggestedLabs.includes(activeNav);

                  return (
                    <button
                      key={sample.id}
                      onClick={() => handleSelect(sample)}
                      className={`flex items-center justify-between w-full px-4 py-1.5 text-sm text-left transition-colors ${
                        isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCurrent && <span className="text-blue-600 shrink-0">&#10003;</span>}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{sample.name}</span>
                            {sample.password != null && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{sample.description}</div>
                        </div>
                      </div>
                      {isRecommended && !isCurrent && (
                        <span className="text-[10px] text-blue-500 bg-blue-50 rounded px-1.5 py-0.5 shrink-0 ml-2">
                          Rec
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
