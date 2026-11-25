import {
  AlertCircle,
  BookCopy,
  BookOpenCheck,
  BookPlus,
  ClipboardList,
  LayoutDashboard,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  overdueCount: number;
}

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'issue', label: 'Issue a Book', icon: BookPlus },
  { id: 'return', label: 'Return a Book', icon: RotateCcw },
  { id: 'records', label: 'All Records', icon: ClipboardList },
  { id: 'books', label: 'Book Management', icon: BookCopy },
  { id: 'students', label: 'Student Management', icon: Users },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  overdueCount,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col bg-[#0B1F3A] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white">
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-white truncate">
            Central Library
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium smooth-transition whitespace-nowrap ${
                active
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'records' && overdueCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 font-mono-tabular text-xs font-semibold text-red-200"
                  title={`${overdueCount} overdue book(s)`}
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {overdueCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-300/90 space-y-1">
        <p className="font-medium text-white">Fine Policy</p>
        <p className="font-mono-tabular text-slate-300">₹50 per extra day after due date</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed rail */}
      <aside className="hidden lg:block lg:w-[260px] lg:shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[260px] max-w-[85vw] h-full shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
