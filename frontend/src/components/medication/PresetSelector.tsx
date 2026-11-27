import {
  IconAlertTriangle,
  IconClock,
  IconCopyCheck,
  IconHelpCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { PRESET_SCENARIOS, type PresetIconKey, type PresetScenario } from '@/mocks/demoSessions';
import { cn } from '@/utils/cn';

const PRESET_ICONS: Record<PresetIconKey, typeof IconClock> = {
  schedule: IconClock,
  severe: IconAlertTriangle,
  duplicate: IconCopyCheck,
  unknown: IconHelpCircle,
};

interface PresetSelectorProps {
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  onReset: () => void;
}

export function PresetSelector({ activePresetId, onSelectPreset, onReset }: PresetSelectorProps) {
  return (
    <section aria-labelledby="presets-heading" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="presets-heading" className="text-xs font-medium text-[#475569]">
          Tình huống mẫu
        </h2>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] sm:min-h-0 sm:h-8"
        >
          <IconRefresh size={14} stroke={1.6} aria-hidden="true" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Compact single-row grid on desktop so primary workspace CTA stays above the fold */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PRESET_SCENARIOS.map((preset) => {
          const Icon = PRESET_ICONS[preset.iconKey];
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectPreset(preset)}
              className={cn(
                'flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                isSelected
                  ? 'border-[#0F766E] bg-[#F0FDFA]'
                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  isSelected ? 'bg-[#0F766E] text-white' : 'bg-[#F1F5F9] text-[#475569]',
                )}
              >
                <Icon size={15} stroke={1.6} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-xs font-medium text-[#0F172A] sm:text-sm">
                  {preset.title}
                </span>
                <span className="block truncate text-xs text-[#64748B]">{preset.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
