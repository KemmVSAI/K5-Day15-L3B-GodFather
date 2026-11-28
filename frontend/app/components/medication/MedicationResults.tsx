import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClockHour4,
  IconInfoCircle,
  IconPill,
  IconQuestionMark,
  IconShieldCheck,
  IconSun,
  IconSunHigh,
} from "@tabler/icons-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  canShowSchedule,
  periodLabels,
  riskSummary,
} from "@/lib/medication-ui";
import type {
  Interaction,
  MedicationMeta,
  ScheduleEntry,
} from "@/lib/medication-api";

export const severityLabels: Record<Interaction["severity"], string> = {
  nang: "Mức nặng",
  trung_binh: "Mức trung bình",
  nhe: "Mức nhẹ",
};

export function RiskSummaryCard({ meta }: { meta: MedicationMeta }) {
  const risk = riskSummary(meta);
  const Icon = risk.tone === "green" ? IconCircleCheck : IconAlertTriangle;
  return (
    <section className={`risk-card ${risk.tone}`} aria-labelledby="risk-title">
      <span className="risk-icon"><Icon aria-hidden="true" size={26} /></span>
      <div className="risk-content">
        <span className="risk-label">TỔNG QUAN TỪ BACKEND</span>
        <h3 id="risk-title">{risk.title}</h3>
        <p>{risk.description}</p>
      </div>
      <span className="risk-badge">{risk.label}</span>
    </section>
  );
}

export function InteractionResults({ meta }: { meta: MedicationMeta }) {
  if (meta.outcome === "emergency") {
    return (
      <section className="emergency-card" role="alert">
        <IconAlertTriangle aria-hidden="true" size={28} />
        <div>
          <h3>Cần hỗ trợ y tế ngay</h3>
          <p>Đã ghi nhận dấu hiệu nguy hiểm từ nội dung nhập. Gọi <strong>115</strong> hoặc đưa người bệnh đến cơ sở y tế gần nhất; mang theo thuốc/đơn đang dùng. Không chờ tư vấn online.</p>
          <details className="technical-details"><summary>Nội dung từ backend</summary><p>{meta.red_flags.join("; ")}</p></details>
        </div>
      </section>
    );
  }

  return (
    <div className="result-stack">
      {meta.unknown_drugs.length > 0 && (
        <section className="unknown-card" aria-labelledby="unknown-title">
          <IconQuestionMark aria-hidden="true" size={24} />
          <div>
            <h3 id="unknown-title">Thuốc chưa có trong dữ liệu</h3>
            <ul>{meta.unknown_drugs.map((name) => <li key={name}>{name}</li>)}</ul>
            <p>Không suy diễn tương tác cho các thuốc này. Hãy hỏi dược sĩ và kiểm tra lại tên trên vỏ hộp.</p>
          </div>
        </section>
      )}

      {meta.fuzzy_matches.length > 0 && (
        <section className="fuzzy-card">
          <IconInfoCircle aria-hidden="true" size={21} />
          <div><strong>Cần xác nhận tên thuốc</strong><p>Một số tên được khớp gần đúng. Hãy đối chiếu vỏ hộp trước khi dùng kết quả.</p><ul>{meta.fuzzy_matches.map((match) => <li key={`${match.code}-${match.input}`}>{match.input} → {match.matched_generic} [{match.code}]</li>)}</ul></div>
        </section>
      )}

      {meta.guardrails?.refusals.map((refusal) => (
        <section className="guardrail-card" key={refusal.code}>
          <IconShieldCheck aria-hidden="true" size={22} />
          <div><strong>Yêu cầu ngoài phạm vi hỗ trợ</strong><p>Không hỗ trợ {refusal.scope}. {refusal.guidance}</p></div>
        </section>
      ))}

      <section className="interaction-section" aria-labelledby="interaction-title">
        <div className="subsection-heading">
          <div><span className="small-icon"><IconShieldCheck aria-hidden="true" size={20} /></span><h3 id="interaction-title">Các cặp tương tác</h3></div>
          <span>{meta.interactions.length} cặp ghi nhận</span>
        </div>
        {meta.interactions.length > 0 ? (
          <div className="interaction-list">
            {meta.interactions.map((interaction) => <InteractionCard interaction={interaction} key={interaction.code} />)}
          </div>
        ) : (
          <div className="no-interaction">
            <IconCircleCheck aria-hidden="true" size={23} />
            <div><strong>Chưa ghi nhận cặp tương tác trong dữ liệu</strong><p>Phạm vi kiểm tra chỉ gồm các thuốc đã nhận diện được. Không kết luận thay cho dược sĩ.</p></div>
          </div>
        )}
      </section>

      <section className="recognized-section" aria-labelledby="recognized-title">
        <div className="subsection-heading"><h3 id="recognized-title">Thuốc đã nhận diện</h3><span>{meta.drugs_found.length} loại</span></div>
        {meta.drugs_found.length > 0 ? (
          <ul className="recognized-list">
            {meta.drugs_found.map((drug) => (
              <li key={drug.code}>
                <span className="pill-icon"><IconPill aria-hidden="true" size={18} /></span>
                <div><strong>{drug.generic_name}</strong><span>{drug.drug_class}</span></div>
                <code>{drug.code}</code>
              </li>
            ))}
          </ul>
        ) : <p className="muted-copy">Chưa nhận diện được thuốc trong danh mục.</p>}
      </section>
      <details className="technical-details">
        <summary>Nguồn và phạm vi kiểm tra</summary>
        <p>{meta.note || "Kết quả được tổng hợp từ dữ liệu backend."}</p>
        <p>Nguồn thuốc: {meta.data_sources?.drugs || "Chưa có thông tin"} · Nguồn tương tác: {meta.data_sources?.interactions || "Chưa có thông tin"}.</p>
      </details>
    </div>
  );
}

function InteractionCard({ interaction }: { interaction: Interaction }) {
  return (
    <article className={`interaction-card ${interaction.severity}`}>
      <div className="interaction-card-top">
        <div className="interaction-drugs"><span>{interaction.drug_a}</span><span className="drug-plus">+</span><span>{interaction.drug_b}</span></div>
        <span className={`severity-badge ${interaction.severity}`}>{severityLabels[interaction.severity]}</span>
      </div>
      <p>{interaction.summary}</p>
      <div className="recommendation"><strong>Khuyến nghị trong dữ liệu</strong><p>{interaction.recommendation}</p></div>
      <div className="evidence-code">Mã căn cứ: {interaction.code}</div>
    </article>
  );
}

export function SchedulePanel({ meta }: { meta: MedicationMeta | null }) {
  const available = meta !== null && canShowSchedule(meta);
  const severe = meta !== null && meta.interactions.some((interaction) => interaction.severity === "nang");
  return (
    <section className="panel schedule-panel" aria-labelledby="schedule-title">
      <div className="side-heading">
        <div className="side-heading-icon"><IconClockHour4 aria-hidden="true" size={23} /></div>
        <div><h2 id="schedule-title">Lịch uống thuốc nháp</h2><p>Chỉ hiển thị khi backend có đủ căn cứ</p></div>
      </div>
      {meta === null ? (
        <div className="schedule-empty"><IconClockHour4 aria-hidden="true" size={28} /><strong>Chưa có lịch thuốc</strong><p>Kiểm tra danh sách để nhận lịch nháp từ backend nếu đủ dữ liệu.</p></div>
      ) : available ? (
        <>
          <div className="schedule-notice"><IconInfoCircle aria-hidden="true" size={18} /><p>Đây là <strong>lịch nháp</strong>, không phải đơn thuốc. Đối chiếu với đơn bác sĩ và xác nhận với dược sĩ trước khi dùng.</p></div>
          <div className="timeline">
            {periodLabels.map((period) => {
              const items = meta.schedule?.slots?.[period.key] || [];
              const PeriodIcon = period.key === "trua" ? IconSunHigh : IconSun;
              return <SchedulePeriod key={period.key} label={period.label} items={items} icon={<PeriodIcon aria-hidden="true" size={19} />} />;
            })}
          </div>
          {meta.schedule?.separation_notes && meta.schedule.separation_notes.length > 0 && (
            <details className="separation-details" open><summary>Căn cứ tách giờ</summary>{meta.schedule.separation_notes.map((note) => <p key={note}>{note}</p>)}</details>
          )}
        </>
      ) : (
        <div className={`schedule-empty ${severe ? "blocked" : ""}`}>
          {severe ? <IconAlertTriangle aria-hidden="true" size={28} /> : <IconQuestionMark aria-hidden="true" size={28} />}
          <strong>{severe ? "Không tự tạo lịch khi có tương tác nặng" : "Chưa đủ dữ liệu để tạo lịch"}</strong>
          <p>{severe ? "Hãy trao đổi với bác sĩ hoặc dược sĩ về toàn bộ danh sách. Không tự ý ngừng hoặc đổi thuốc." : "Thuốc ngoài dữ liệu hoặc thông tin còn thiếu cần được kiểm tra trước. Hệ thống không tự đoán lịch uống."}</p>
        </div>
      )}
    </section>
  );
}

function SchedulePeriod({ label, items, icon }: { label: string; items: ScheduleEntry[]; icon: React.ReactNode }) {
  return (
    <div className="timeline-item">
      <div className="timeline-icon">{icon}</div>
      <div className="timeline-content">
        <div className="timeline-head"><strong>{label}</strong><span>{items.length ? `${items.length} mục` : "—"}</span></div>
        {items.length ? items.map((item, index) => (
          <div className="schedule-med" key={`${item.code}-${index}`}>
            <strong>{item.generic_name}</strong>
            <span className="meal-label">{item.meal_label}</span>
            <p>{item.timing_note}</p>
          </div>
        )) : <p className="no-med">Không có thuốc được xếp ở buổi này</p>}
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="results-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Đang kiểm tra danh sách thuốc bằng backend…</span>
      <Skeleton className="skeleton-risk" />
      <div className="skeleton-grid"><Skeleton className="skeleton-interaction" /><Skeleton className="skeleton-interaction" /></div>
      <p>Đang tra danh mục và kiểm tra từng cặp thuốc…</p>
    </div>
  );
}

/** Kết quả đầy đủ: risk summary + các cặp tương tác + thuốc nhận diện. */
export function MedicationResults({ meta }: { meta: MedicationMeta }) {
  return (
    <div className="result-stack">
      <RiskSummaryCard meta={meta} />
      <InteractionResults meta={meta} />
    </div>
  );
}
