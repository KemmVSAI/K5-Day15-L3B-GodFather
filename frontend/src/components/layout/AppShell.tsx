import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router';
import {
  IconMenu2,
  IconPill,
  IconTerminal2,
  IconX,
} from '@tabler/icons-react';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { cn } from '@/utils/cn';

const HEADER_NAV_ITEMS = [
  { to: '/', label: 'Tổng quan' },
  { to: '/checker', label: 'Kiểm tra thuốc' },
  { to: '/schedule', label: 'Lịch thuốc nháp' },
  { to: '/history', label: 'Lịch sử' },
  { to: '/evaluation', label: 'Đánh giá' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { technicalMode, toggleTechnicalMode } = useTechnicalMode();

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FA] text-[#0F172A]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#0F766E] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Chuyển đến nội dung chính
      </a>

      {/* Thin Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu điều hướng"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9] md:hidden"
            >
              <IconMenu2 size={18} stroke={1.6} aria-hidden="true" />
            </button>

            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-white">
                <IconPill size={18} stroke={1.6} aria-hidden="true" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-medium tracking-tight text-[#0F172A]">FamilyMed</span>
                <span className="hidden text-xs text-[#64748B] lg:inline">Sắp thuốc an toàn</span>
              </div>
            </NavLink>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
              {HEADER_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                      isActive
                        ? 'bg-[#F0FDFA] text-[#0F766E]'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              role="switch"
              aria-checked={technicalMode}
              onClick={toggleTechnicalMode}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                technicalMode
                  ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]'
                  : 'border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
              )}
            >
              <IconTerminal2 size={15} stroke={1.6} aria-hidden="true" />
              <span>Chế độ kỹ thuật</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <div
            className="fixed inset-0 bg-[#0F172A]/40 transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col overscroll-contain border-r border-[#E2E8F0] bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <span className="text-sm font-medium text-[#0F172A]">FamilyMed</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
              >
                <IconX size={18} stroke={1.6} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Điều hướng di động" className="mt-4 space-y-1">
              {HEADER_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#F0FDFA] text-[#0F766E]'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <main id="main-content" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-[#64748B] sm:px-6 lg:px-8">
          <span>FamilyMed · Dữ liệu mẫu thử nghiệm (18 hoạt chất · 12 cặp tương tác)</span>
          <span>Không thay thế chẩn đoán hay chỉ định của bác sĩ và dược sĩ</span>
        </div>
      </footer>
    </div>
  );
}
