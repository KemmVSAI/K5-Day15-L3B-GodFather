import { useMemo, useState } from "react";
import { signOut } from "@agent-native/core/client";
import {
  IconAlertTriangle,
  IconCalendarTime,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClockHour4,
  IconCopy,
  IconHeartHandshake,
  IconInfoCircle,
  IconLeaf,
  IconLock,
  IconLogout,
  IconMoon,
  IconPill,
  IconPlus,
  IconShieldCheck,
  IconSun,
  IconSunHigh,
  IconTrash,
} from "@tabler/icons-react";
import {
  buildPharmacistDraftText,
  DRUG_CATALOG,
  evaluateMedications,
  findDrugRecord,
  type MedicationInput,
  type PeriodLabel,
} from "@/lib/med-engine";

type PresetCase = {
  id: string;
  label: string;
  tone: "green" | "yellow" | "red" | "neutral";
  medications: Array<Omit<MedicationInput, "id">>;
};

const PRESET_CASES: PresetCase[] = [
  {
    id: "safe",
    label: "Không tương tác",
    tone: "green",
    medications: [
      {
        name: "Glucophage",
        dose: "1 viên",
        frequency: "2 lần / ngày",
        timing: "Buổi sáng",
        notes: "Uống ngay sau ăn",
      },
      {
        name: "Cozaar",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi sáng",
        notes: "Uống cố định mỗi sáng",
      },
      {
        name: "Lipitor",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi tối",
        notes: "Uống cố định buổi tối",
      },
    ],
  },
  {
    id: "separate",
    label: "Cần tách giờ",
    tone: "yellow",
    medications: [
      {
        name: "Levothyrox",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi sáng",
        notes: "Trước ăn sáng 30–60 phút",
      },
      {
        name: "Canxi D3",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi sáng",
        notes: "Đang xếp trùng buổi sáng",
      },
      {
        name: "Glucophage",
        dose: "1 viên",
        frequency: "2 lần / ngày",
        timing: "Buổi tối",
        notes: "Uống ngay sau ăn",
      },
    ],
  },
  {
    id: "severe",
    label: "Cảnh báo nặng",
    tone: "red",
    medications: [
      {
        name: "Aspirin 81",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi sáng",
        notes: "Sau ăn sáng",
      },
      {
        name: "Coumadin",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi tối",
        notes: "Uống cố định buổi tối",
      },
      {
        name: "Lipitor",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi tối",
        notes: "Theo đơn điều trị",
      },
    ],
  },
  {
    id: "unknown",
    label: "Thuốc ngoài danh mục",
    tone: "neutral",
    medications: [
      {
        name: "Allopurinol",
        dose: "1 viên",
        frequency: "1 lần / ngày",
        timing: "Buổi sáng",
        notes: "Theo đơn bác sĩ",
      },
      {
        name: "Glucophage",
        dose: "1 viên",
        frequency: "2 lần / ngày",
        timing: "Buổi tối",
        notes: "Uống ngay sau ăn",
      },
    ],
  },
];

const PERIODS: Array<{ label: PeriodLabel; time: string; icon: typeof IconSun }> =
  [
    { label: "Buổi sáng", time: "07:00 – 09:00", icon: IconSun },
    { label: "Buổi trưa", time: "11:00 – 13:00", icon: IconSunHigh },
    { label: "Buổi tối", time: "18:00 – 20:00", icon: IconClockHour4 },
    { label: "Trước khi ngủ", time: "21:00 – 22:00", icon: IconMoon },
  ];

const QUICK_DRUGS = [
  "Glucophage",
  "Amlor",
  "Lipitor",
  "Levothyrox",
  "Canxi D3",
  "Coumadin",
  "Aspirin 81",
  "Panadol",
];

let nextId = 1;
const makeId = () => `med-${nextId++}`;

const withIds = (list: Array<Omit<MedicationInput, "id">>): MedicationInput[] =>
  list.map((m) => ({ ...m, id: makeId() }));

const emptyMedication = (name = ""): MedicationInput => {
  const match = name ? findDrugRecord(name) : null;
  return {
    id: makeId(),
    name,
    dose: "1 viên",
    frequency: "1 lần / ngày",
    timing: match?.recommendedTiming ?? "Buổi sáng",
    notes: match?.mealNote ?? "",
  };
};

export function meta() {
  return [
    { title: "Thuốc Nhà — Kiểm tra tương tác và xếp lịch uống thuốc" },
    {
      name: "description",
      content:
        "Hỗ trợ người con kiểm tra tương tác và soạn lịch uống thuốc nháp cho cha mẹ cao tuổi",
    },
  ];
}

export default function HomeRoute() {
  const [medications, setMedications] = useState<MedicationInput[]>(() =>
    withIds(PRESET_CASES[0]!.medications),
  );
  const [activePreset, setActivePreset] = useState<string | null>(
    PRESET_CASES[0]!.id,
  );
  const [checkedMeds, setCheckedMeds] = useState<MedicationInput[] | null>(() =>
    withIds(PRESET_CASES[0]!.medications),
  );
  const [error, setError] = useState("");
  const [consultOpen, setConsultOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => (checkedMeds ? evaluateMedications(checkedMeds) : null),
    [checkedMeds],
  );

  const updateMed = (
    id: string,
    key: keyof Omit<MedicationInput, "id">,
    value: string,
  ) => {
    setMedications((curr) =>
      curr.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, [key]: value };
        if (key === "name") {
          const matched = findDrugRecord(value);
          if (matched && !m.notes.trim()) {
            next.timing = matched.recommendedTiming;
            next.notes = matched.mealNote;
          }
        }
        return next;
      }),
    );
    setActivePreset(null);
    setError("");
  };

  const choosePreset = (preset: PresetCase) => {
    const next = withIds(preset.medications);
    setMedications(next);
    setCheckedMeds(next);
    setActivePreset(preset.id);
    setError("");
    setConsultOpen(false);
    setCopied(false);
  };

  const quickAddDrug = (drugName: string) => {
    setMedications((curr) => [...curr, emptyMedication(drugName)]);
    setActivePreset(null);
    setError("");
  };

  const runCheck = () => {
    const valid = medications.filter((m) => m.name.trim());
    if (!valid.length || medications.some((m) => !m.name.trim())) {
      setError("Vui lòng điền tên cho từng dòng thuốc hoặc xóa dòng trống trước khi kiểm tra");
      return;
    }
    setError("");
    setCheckedMeds(medications.map((m) => ({ ...m })));
    setCopied(false);
    document
      .getElementById("results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyTimeSeparation = () => {
    const updated = medications.map((m) => {
      const rec = findDrugRecord(m.name);
      if (!rec) return m;
      if (rec.genericName === "Calcium + Vitamin D3") {
        return {
          ...m,
          timing: "Buổi trưa" as PeriodLabel,
          notes: "Sau ăn trưa, cách Levothyroxine ≥ 4 giờ",
        };
      }
      if (rec.genericName === "Omeprazole") {
        return {
          ...m,
          timing: "Buổi tối" as PeriodLabel,
          notes: "Trước ăn tối 30 phút để tách Levothyroxine",
        };
      }
      if (rec.genericName === "Levothyroxine") {
        return {
          ...m,
          timing: "Buổi sáng" as PeriodLabel,
          notes: "Sáng sớm lúc đói trước ăn 30–60 phút",
        };
      }
      return m;
    });
    setMedications(updated);
    setCheckedMeds(updated);
  };

  const draftText = useMemo(
    () => (result ? buildPharmacistDraftText(medications, result) : ""),
    [medications, result],
  );

  const copyDraft = async () => {
    if (!draftText) return;
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const activeScheduleMeds = checkedMeds ?? medications;

  return (
    <div className="app-page">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/">
            <span className="brand-icon" aria-hidden="true">
              <IconLeaf size={18} stroke={1.5} />
            </span>
            <span>
              <strong>Thuốc Nhà</strong>
              <small>Kiểm tra tương tác và lịch uống thuốc</small>
            </span>
          </a>
          <div className="header-right">
            <span className="header-note">
              <IconShieldCheck size={16} stroke={1.5} />
              Lịch nháp tham khảo · người dùng xác nhận
            </span>
            <button
              className="logout"
              onClick={() => signOut()}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <IconLogout size={18} stroke={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-wrap">
        <div className="intro">
          <h1>Kiểm tra tương tác và xếp lịch uống thuốc cho cha mẹ</h1>
          <p>
            Nhập danh sách thuốc đang dùng hoặc chọn ca mẫu để rà soát cặp tương
            tác, tách giờ uống hợp lý và chuẩn bị phiếu hỏi dược sĩ khi cần.
          </p>
        </div>

        <div className="disclaimer">
          <IconInfoCircle size={18} stroke={1.5} />
          <p>
            <strong>Lưu ý an toàn</strong>
            <span>
              Kết quả chỉ là lịch nháp hỗ trợ đối chiếu trên 18 hoạt chất phổ
              biến, không thay thế chỉ định của bác sĩ hoặc dược sĩ.
            </span>
          </p>
        </div>

        <div className="content-grid">
          <div className="main-column">
            <section className="panel medication-panel">
              <div className="panel-top">
                <div className="section-heading">
                  <div>
                    <h2>Danh sách thuốc đang sử dụng</h2>
                    <p>
                      Nhập tên trên vỏ hộp hoặc chọn nhanh từ tình huống mẫu
                    </p>
                  </div>
                </div>
                <span className="count-pill">{medications.length} loại</span>
              </div>

              <div className="demo-box">
                <div className="demo-top">
                  <strong>Tình huống mẫu</strong>
                  <span>Bấm để nạp nhanh danh sách thuốc</span>
                </div>
                <div className="preset-list">
                  {PRESET_CASES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`preset ${activePreset === item.id ? "selected" : ""}`}
                      onClick={() => choosePreset(item)}
                    >
                      <span className={`preset-dot ${item.tone}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-add">
                <span>Thêm nhanh:</span>
                <div className="quick-add-list">
                  {QUICK_DRUGS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="quick-chip"
                      onClick={() => quickAddDrug(name)}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              <datalist id="drug-suggestions">
                {Array.from(
                  new Set(
                    DRUG_CATALOG.flatMap((d) => [d.genericName, ...d.aliases]),
                  ),
                ).map((alias) => (
                  <option key={alias} value={alias} />
                ))}
              </datalist>

              <div className="medication-list">
                {medications.length ? (
                  medications.map((medication, index) => {
                    const matched = findDrugRecord(medication.name);
                    return (
                      <div className="med-row" key={medication.id}>
                        <div className="row-top">
                          <div className="row-name">
                            <span className="pill-icon" aria-hidden="true">
                              <IconPill size={16} stroke={1.5} />
                            </span>
                            <strong>
                              Thuốc {String(index + 1).padStart(2, "0")}
                            </strong>
                            {matched ? (
                              <span className="match-tag">
                                {matched.genericName} ({matched.drugClass})
                              </span>
                            ) : medication.name.trim() ? (
                              <span className="match-tag unknown">
                                Ngoài 18 thuốc mẫu
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Xóa thuốc ${index + 1}`}
                            onClick={() => {
                              setMedications((curr) =>
                                curr.filter((m) => m.id !== medication.id),
                              );
                              setActivePreset(null);
                            }}
                          >
                            <IconTrash size={16} stroke={1.5} />
                          </button>
                        </div>

                        <div className="fields">
                          <label className="field name-field">
                            Tên thuốc
                            <input
                              list="drug-suggestions"
                              value={medication.name}
                              placeholder="VD: Glucophage, Amlor…"
                              onChange={(e) =>
                                updateMed(medication.id, "name", e.target.value)
                              }
                            />
                          </label>
                          <label className="field">
                            Liều dùng
                            <input
                              value={medication.dose}
                              placeholder="1 viên"
                              onChange={(e) =>
                                updateMed(medication.id, "dose", e.target.value)
                              }
                            />
                          </label>
                          <label className="field">
                            Tần suất
                            <input
                              value={medication.frequency}
                              placeholder="1 lần / ngày"
                              onChange={(e) =>
                                updateMed(
                                  medication.id,
                                  "frequency",
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            Thời điểm
                            <select
                              value={medication.timing}
                              onChange={(e) =>
                                updateMed(
                                  medication.id,
                                  "timing",
                                  e.target.value as PeriodLabel,
                                )
                              }
                            >
                              {PERIODS.map((p) => (
                                <option key={p.label} value={p.label}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field notes-field">
                            Ghi chú
                            <input
                              value={medication.notes}
                              placeholder="Sau ăn"
                              onChange={(e) =>
                                updateMed(
                                  medication.id,
                                  "notes",
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <IconPill size={20} stroke={1.5} />
                    <strong>Danh sách thuốc đang trống</strong>
                    <span>
                      Thêm thuốc mới hoặc chọn một tình huống mẫu ở trên
                    </span>
                  </div>
                )}
              </div>

              <div className="list-actions">
                <button
                  type="button"
                  className="add-button"
                  onClick={() => {
                    setMedications((curr) => [...curr, emptyMedication()]);
                    setActivePreset(null);
                  }}
                >
                  <IconPlus size={16} stroke={1.5} />
                  Thêm dòng thuốc
                </button>
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => {
                    setMedications([]);
                    setCheckedMeds(null);
                    setActivePreset(null);
                    setError("");
                  }}
                >
                  <IconTrash size={16} stroke={1.5} />
                  Xóa danh sách
                </button>
              </div>

              {error && (
                <div className="error-message" role="alert">
                  <IconAlertTriangle size={16} stroke={1.5} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                className="primary-button check-button"
                onClick={runCheck}
              >
                <IconShieldCheck size={18} stroke={1.5} />
                <span>Kiểm tra tương tác thuốc</span>
              </button>
              <p className="privacy-note">
                <IconLock size={14} stroke={1.5} />
                Dữ liệu nhập chỉ giữ trong phiên làm việc hiện tại
              </p>
            </section>

            <section
              className="results-section"
              id="results"
              aria-live="polite"
            >
              <div className="results-title">
                <div className="section-heading">
                  <div>
                    <h2>Kết quả kiểm tra</h2>
                    <p>Đối chiếu trực tiếp trên 18 hoạt chất và 12 cặp tương tác</p>
                  </div>
                </div>
                <span className="sample-badge">Bản chạy thử</span>
              </div>

              {result ? (
                <>
                  <div className={`risk-card ${result.tone}`}>
                    <span className="risk-icon" aria-hidden="true">
                      {result.tone === "green" ? (
                        <IconCircleCheck size={18} stroke={1.5} />
                      ) : (
                        <IconAlertTriangle size={18} stroke={1.5} />
                      )}
                    </span>
                    <div className="risk-body">
                      <div className="risk-label">Đánh giá tổng quan</div>
                      <h3>{result.title}</h3>
                      <p>{result.description}</p>
                      {result.canApplySeparation && !result.hasSevere && (
                        <button
                          type="button"
                          className="separate-action"
                          onClick={applyTimeSeparation}
                        >
                          Tự động tách giờ uống (sáng sớm / trưa)
                        </button>
                      )}
                    </div>
                    <span className="risk-badge">{result.badge}</span>
                  </div>

                  {result.interactions.length > 0 && (
                    <div className="interaction-list">
                      {result.interactions.map((item) => (
                        <div className="interaction-card" key={item.code}>
                          <div className="interaction-header">
                            <div>
                              <span className="small-icon" aria-hidden="true">
                                <IconShieldCheck size={16} stroke={1.5} />
                              </span>
                              <strong>
                                {item.drugA} + {item.drugB}
                              </strong>
                            </div>
                            <span className={`sev-tag ${item.severity}`}>
                              {item.severity === "nang"
                                ? "Mức nặng"
                                : item.severity === "trung_binh"
                                  ? "Trung bình"
                                  : "Mức nhẹ"}
                            </span>
                          </div>
                          <div className="interaction-content">
                            <p>{item.summary}</p>
                            <div className="recommendation">
                              <strong>Hướng xử trí đề nghị</strong>
                              <p>{item.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <details className="scope-details">
                    <summary>
                      Phạm vi tra cứu dữ liệu
                      <IconChevronDown size={16} stroke={1.5} />
                    </summary>
                    <p>
                      Hệ thống đối chiếu theo bảng 18 hoạt chất phổ biến và 12
                      cặp tương tác trong bộ dữ liệu mẫu. Với thuốc ngoài danh
                      mục, hệ thống dừng suy đoán và tạo phiếu nháp chuyển dược
                      sĩ.
                    </p>
                  </details>
                </>
              ) : (
                <div className="empty-result">
                  <IconShieldCheck size={20} stroke={1.5} />
                  <strong>Chưa có kết quả kiểm tra</strong>
                  <p>
                    Bấm Kiểm tra tương tác thuốc để xem đánh giá và lịch uống
                    nháp
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="side-column">
            <section className="panel schedule-panel">
              <div className="side-heading">
                <div className="side-heading-icon" aria-hidden="true">
                  <IconCalendarTime size={18} stroke={1.5} />
                </div>
                <div>
                  <h2>Lịch uống thuốc nháp</h2>
                  <p>Phân bổ theo 4 cữ trong ngày</p>
                </div>
              </div>

              {result?.hasSevere ? (
                <div className="held-schedule">
                  <IconAlertTriangle size={18} stroke={1.5} />
                  <div>
                    <strong>Tạm giữ lịch uống 3 buổi</strong>
                    <p>
                      Đơn thuốc có cặp tương tác mức nặng. Vui lòng hỏi bác sĩ
                      hoặc dược sĩ trước khi xếp cữ uống cho cha mẹ.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="schedule-label">
                    <span>Lịch trình đề nghị</span>
                    <span>Chờ xác nhận</span>
                  </div>

                  <div className="timeline">
                    {PERIODS.map((period) => {
                      const meds = activeScheduleMeds.filter(
                        (m) => m.timing === period.label && m.name.trim(),
                      );
                      const PeriodIcon = period.icon;
                      return (
                        <div className="timeline-item" key={period.label}>
                          <div className="timeline-icon" aria-hidden="true">
                            <PeriodIcon size={16} stroke={1.5} />
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-head">
                              <strong>{period.label}</strong>
                              <span>{period.time}</span>
                            </div>
                            {meds.length ? (
                              meds.map((m) => (
                                <div className="schedule-med" key={m.id}>
                                  <div>
                                    <strong>{m.name}</strong>
                                    <span>{m.dose || "Chưa rõ liều"}</span>
                                  </div>
                                  <p>
                                    <IconClockHour4 size={14} stroke={1.5} />
                                    {m.notes || "Chưa có ghi chú"}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="no-med">Không có thuốc</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="schedule-footnote">
                Người con kiểm tra lại với đơn bác sĩ trước khi cho cha mẹ dùng
              </p>
            </section>

            <section className="panel pharmacist-card">
              <div className="pharmacist-head">
                <span className="pharmacist-icon" aria-hidden="true">
                  <IconHeartHandshake size={18} stroke={1.5} />
                </span>
                <div>
                  <span className="pharmacist-eyebrow">Chuyển chuyên môn</span>
                  <h2>Hỏi dược sĩ</h2>
                </div>
              </div>
              <p>
                {result?.needsPharmacist
                  ? "Ca này có điểm cần xác nhận chuyên môn. Tạo phiếu nháp dưới đây để gửi hỏi dược sĩ."
                  : "Có thể tạo nhanh bản tóm tắt đơn thuốc để hỏi thêm dược sĩ nếu cần."}
              </p>
              <button
                type="button"
                className="pharmacist-btn"
                onClick={() => setConsultOpen(!consultOpen)}
              >
                {consultOpen
                  ? "Ẩn phiếu nháp hỏi dược sĩ"
                  : "Xem phiếu nháp hỏi dược sĩ"}
              </button>
              {consultOpen && (
                <div className="consult-box">
                  <pre className="consult-preview">{draftText}</pre>
                  <button
                    type="button"
                    className="copy-draft-btn"
                    onClick={copyDraft}
                  >
                    {copied ? (
                      <>
                        <IconCheck size={15} stroke={1.5} />
                        Đã sao chép nội dung
                      </>
                    ) : (
                      <>
                        <IconCopy size={15} stroke={1.5} />
                        Sao chép gửi dược sĩ
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>

            <div className="side-note">
              <IconShieldCheck size={16} stroke={1.5} />
              <span>Không tự động gửi thông tin khi chưa xác nhận</span>
            </div>
          </aside>
        </div>

        <footer>
          <span>Thuốc Nhà — Hỗ trợ sắp thuốc cho gia đình</span>
          <span>Bản chạy thử giao diện · Track B2</span>
        </footer>
      </main>
    </div>
  );
}
