import { useEffect, useRef, useState } from "react";
import { signOut } from "@agent-native/core/client/hooks";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconClipboardHeart,
  IconEraser,
  IconHeartHandshake,
  IconInfoCircle,
  IconLeaf,
  IconLoader2,
  IconLock,
  IconLogout,
  IconPill,
  IconPlus,
  IconShieldCheck,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MedicationResults, ResultsSkeleton, SchedulePanel } from "@/components/medication/MedicationResults";
import { PharmacistDialog } from "@/components/medication/PharmacistDialog";
import {
  checkMedications,
  useBackendStatus,
  type MedicationAnalysis,
} from "@/lib/medication-api";
import { validateMedicationName } from "@/lib/medication-ui";

type Medication = { id: string; name: string; details: string };

// Presets only populate inputs. The user submits them to the real backend.
const cases = [
  { label: "Ca 1 — Theo dõi", tone: "green", names: ["Glucophage", "Amlodipine", "Lipitor", "Canxi D3"] },
  { label: "Ca 2 — Cần tách giờ", tone: "yellow", names: ["Levothyrox", "Canxi D3", "Glucophage"] },
  { label: "Ca 3 — Cảnh báo nặng", tone: "red", names: ["Coumadin", "Aspirin pH8", "Allopurinol"] },
  { label: "Ca 4 — Thuốc ngoài dữ liệu", tone: "neutral", names: ["Metformin", "Xarelto 15mg"] },
] as const;

let nextMedicationId = 0;
function emptyMedication(name = ""): Medication {
  nextMedicationId += 1;
  return { id: `medication-${nextMedicationId}`, name, details: "" };
}

export function meta() { return [{ title: "Thuốc Nhà — Kiểm tra tương tác cho cha mẹ" }, { name: "description", content: "Tra cứu tương tác từ dữ liệu demo và chuẩn bị thông tin trao đổi với dược sĩ khi sắp thuốc cho người thân." }]; }

function SectionHeading({ number, title, subtitle, id }: { number: string; title: string; subtitle?: string; id?: string }) {
  return <div className="section-heading"><span className="section-number" aria-hidden="true">{number}</span><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>;
}

export default function HomeRoute() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<MedicationAnalysis | null>(null);
  const [resultIsStale, setResultIsStale] = useState(false);
  const [resultError, setResultError] = useState("");
  const [consultOpen, setConsultOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const requestController = useRef<AbortController | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const backend = useBackendStatus();
  const meta = result?.meta ?? null;
  const inputSignature = medications.map(m => `${m.name.trim()} (${m.details.trim()})`).join(", ");

  useEffect(() => {
    setResultIsStale(Boolean(result));
  }, [inputSignature]); // Results belong to the exact submitted list, not its later edits.

  useEffect(() => () => {
    requestController.current?.abort();
    clearTimeout(toastTimer.current);
  }, []);

  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }

  function clearFieldError(id: string) {
    setFieldErrors(current => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  const update = (id: string, key: "name" | "details", value: string) => {
    setMedications(current => current.map(m => m.id === id ? { ...m, [key]: value } : m));
    setSelectedCase(null);
    setError("");
    if (key === "name") clearFieldError(id);
  };

  function validateField(medication: Medication) {
    if (!medication.name.trim()) return;
    const fieldError = validateMedicationName(medication.name);
    setFieldErrors(current => {
      const next = { ...current };
      if (fieldError) next[medication.id] = fieldError;
      else delete next[medication.id];
      return next;
    });
  }

  const removeMedication = (id: string) => {
    setMedications(current => current.filter(m => m.id !== id));
    clearFieldError(id);
    setSelectedCase(null);
    setError("");
    notify("Đã xóa thuốc. Hãy kiểm tra lại danh sách mới trước khi dùng kết quả.");
  };

  const chooseCase = (index: number) => {
    requestController.current?.abort();
    setChecking(false);
    setMedications(cases[index]!.names.map(name => emptyMedication(name)));
    setSelectedCase(index);
    setResult(null);
    setResultIsStale(false);
    setFieldErrors({});
    setError("");
    setResultError("");
    notify("Đã điền dữ liệu demo. Bấm “Kiểm tra tương tác” để gọi backend.");
  };

  const addMedication = () => {
    const medication = emptyMedication();
    setMedications(current => [...current, medication]);
    setSelectedCase(null);
    setError("");
    requestAnimationFrame(() => document.getElementById(`name-${medication.id}`)?.focus());
  };

  const clearAll = () => {
    requestController.current?.abort();
    setChecking(false);
    setMedications([]);
    setSelectedCase(null);
    setError("");
    setResult(null);
    setResultIsStale(false);
    setResultError("");
    setFieldErrors({});
    notify("Đã xóa danh sách trên màn hình.");
  };

  const buildCheckText = () => medications.map(m => `${m.name.trim()}${m.details.trim() ? ` (${m.details.trim()})` : ""}`).join(", ");

  const check = async () => {
    const nextErrors: Record<string, string> = {};
    for (const medication of medications) {
      const fieldError = validateMedicationName(medication.name);
      if (fieldError) nextErrors[medication.id] = fieldError;
    }
    setFieldErrors(nextErrors);
    if (!medications.length) setError("Danh sách đang trống. Hãy thêm ít nhất một loại thuốc hoặc chọn dữ liệu demo.");
    else if (Object.keys(nextErrors).length) setError("Vui lòng kiểm tra lại tên thuốc ở các dòng được đánh dấu.");
    else setError("");
    if (!medications.length || Object.keys(nextErrors).length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setChecking(true);
    setResultError("");
    try {
      const analysis = await checkMedications(inputSignature, controller.signal);
      if (controller.signal.aborted) return;
      setResult(analysis);
      setResultIsStale(false);
      if (analysis.meta.outcome === "emergency") setError("Cần hỗ trợ y tế ngay. Xem cảnh báo bên dưới.");
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      if (controller.signal.aborted) return;
      setResultError(e instanceof Error ? e.message : "Không kiểm tra được lần này. Danh sách vẫn được giữ nguyên; vui lòng thử lại.");
    } finally {
      if (requestController.current === controller) {
        setChecking(false);
        requestController.current = undefined;
      }
    }
  };

  async function logout() {
    try {
      await signOut();
    } catch {
      setError("Không thể đăng xuất lúc này. Vui lòng thử lại.");
    }
  }

  return <div className="app-page">
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="/"><span className="brand-icon"><IconLeaf size={22} stroke={1.8}/></span><span><strong>Thuốc Nhà<span className="brand-dot">.</span></strong><small>Chăm sóc lịch thuốc cho cha mẹ</small></span></a><div className="header-right"><span className="header-note"><IconShieldCheck size={17}/> Đồng hành cùng gia đình bạn</span><button className="logout" onClick={() => signOut()} title="Đăng xuất" aria-label="Đăng xuất"><IconLogout size={19}/></button></div></div></header>
    <main className="main-wrap">
      <div className="intro"><div><div className="eyebrow"><span></span> CHĂM SÓC SỨC KHỎE GIA ĐÌNH</div><h1>An tâm chăm sóc,<br/><em>trọn vẹn yêu thương.</em></h1><p>Một nơi đơn giản để kiểm tra tương tác và sắp xếp lịch uống cho người thân của bạn.</p></div><div className="intro-illustration"><span className="illustration-halo"><IconClipboardHeart size={58} stroke={1.1}/></span><span className="illustration-plus">✳</span><span className="illustration-pill"><IconPill size={21}/></span></div></div>
      <div className="disclaimer"><IconInfoCircle size={20}/><p><strong>Lưu ý quan trọng</strong><span>Kết quả chỉ mang tính chất tham khảo hỗ trợ sắp xếp lịch uống, không thay thế chỉ định của bác sĩ hoặc dược sĩ.</span></p></div>
      <div className="content-grid"><div className="main-column">
        <section className="panel medication-panel"><div className="panel-top"><SectionHeading number="01" title="Danh sách thuốc đang sử dụng" subtitle="Thêm các loại thuốc người thân của bạn đang dùng, theo tên trên vỏ hộp hoặc đơn."/><span className="count-pill">{medications.length} loại thuốc</span></div>
          <div className="demo-box"><div className="demo-top"><div><IconSparkles size={17}/><strong>Khám phá với tình huống mẫu</strong></div><span>Chọn một tình huống để điền nhanh danh sách</span></div><div className="preset-list">{cases.map((item, i) => <button key={item.label} type="button" className={`preset ${selectedCase === i ? "selected" : ""}`} onClick={() => chooseCase(i)}><span className={`preset-dot ${item.tone}`}></span>{item.label}</button>)}</div></div>
          <div className="medication-list">{medications.length ? medications.map((medication, index) => <div className="med-row" key={index}><div className="row-top"><div className="row-name"><span className="pill-icon"><IconPill size={17}/></span><strong>Thuốc {String(index + 1).padStart(2, "0")}</strong></div><button type="button" className="icon-button" aria-label={`Xóa thuốc ${index + 1}`} onClick={() => removeMedication(index)}><IconTrash size={17}/></button></div><div className="fields"><label className="field name-field">Tên thuốc<input value={medication.name} placeholder="Nhập tên thuốc" onChange={e => update(index, "name", e.target.value)}/></label><label className="field">Liều dùng<input value={medication.dose} placeholder="VD: 1 viên" onChange={e => update(index, "dose", e.target.value)}/></label><label className="field">Tần suất<input value={medication.frequency} placeholder="VD: 1 lần / ngày" onChange={e => update(index, "frequency", e.target.value)}/></label><label className="field">Thời điểm<select value={medication.timing} onChange={e => update(index, "timing", e.target.value)}>{periods.map(p => <option key={p.label}>{p.label}</option>)}</select></label><label className="field notes-field">Ghi chú<input value={medication.notes} placeholder="VD: Sau ăn" onChange={e => update(index, "notes", e.target.value)}/></label></div></div>) : <div className="empty-state"><IconPill size={25}/><strong>Danh sách thuốc đang trống</strong><span>Thêm thuốc hoặc chọn một tình huống mẫu để bắt đầu.</span></div>}</div>
          <div className="list-actions"><button type="button" className="add-button" onClick={addMedication}><IconPlus size={17}/> Thêm thuốc</button><button type="button" className="clear-button" onClick={clearAll}><IconTrash size={16}/> Xóa danh sách</button></div>
          {error && <div className="error-message" role="alert"><IconAlertTriangle size={18}/>{error}</div>}
          <button type="button" className="primary-button check-button" onClick={check} disabled={checking}>{checking ? "Đang kiểm tra…" : (<><IconShieldCheck size={20}/> Kiểm tra tương tác thuốc <IconArrowRight className="button-arrow" size={19}/></>)}</button><p className="privacy-note"><IconLock size={14}/> Bản trình diễn: thông tin nhập vào chỉ lưu trong phiên này.</p>
        </section>
        <section className="results-section" id="results"><div className="results-title"><SectionHeading number="02" title="Kết quả kiểm tra" subtitle="Tổng quan để bạn dễ dàng theo dõi và trao đổi với chuyên gia."/>{meta !== null ? <span className="sample-badge">TỪ BACKEND</span> : <span className="sample-badge">DỮ LIỆU MẪU</span>}</div>
          {checking ? <ResultsSkeleton /> : resultError ? (
            <div className="error-message" role="alert"><IconAlertTriangle size={18}/><div><p style={{margin:"0 0 6px"}}>{resultError}</p><button type="button" className="preset" onClick={check}>Thử lại</button></div></div>
          ) : meta !== null ? (
            <MedicationResults meta={meta} />
          ) : (
            <div className="empty-result"><IconShieldCheck size={28}/><strong>Chưa có kết quả kiểm tra</strong><p>Nhập danh sách thuốc rồi bấm "Kiểm tra tương tác thuốc" — kết quả sẽ được backend thật phân tích.</p></div>
          )}
        </section>
      </div><aside className="side-column">
        <SchedulePanel meta={meta} />
        <section className="pharmacist-card"><span className="pharmacist-icon"><IconHeartHandshake size={24}/></span><div className="pharmacist-eyebrow">LUÔN CÓ NGƯỜI ĐỒNG HÀNH</div><h2>Bạn cần thêm<br/>lời khuyên?</h2><p>Dược sĩ có thể giúp bạn hiểu rõ hơn về thuốc và lịch uống của người thân.</p><button type="button" onClick={() => setConsultOpen(true)}>Hỏi Dược Sĩ Ngay <IconArrowRight size={18}/></button></section>
        <div className="side-note"><IconShieldCheck size={17}/><span>Chăm sóc cẩn thận, an tâm mỗi ngày.</span></div></aside></div>
      <footer><span>© Thuốc Nhà · Chăm sóc từ những điều nhỏ nhất</span><span>Được thiết kế cho gia đình Việt <span className="footer-heart">♥</span></span></footer>
    </main>
    <PharmacistDialog meta={meta} open={consultOpen} onOpenChange={setConsultOpen} />
  </div>;
}


