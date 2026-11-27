import { useState } from "react";
import { signOut } from "@agent-native/core/client";
import { IconArrowRight, IconCalendarTime, IconChevronDown, IconCircleCheck, IconClipboardHeart, IconClockHour4, IconHeartHandshake, IconInfoCircle, IconLeaf, IconLock, IconLogout, IconMoon, IconPill, IconPlus, IconShieldCheck, IconSparkles, IconSun, IconSunHigh, IconTrash, IconAlertTriangle } from "@tabler/icons-react";

type Medication = { name: string; dose: string; frequency: string; timing: string; notes: string };
type Case = { label: string; short: string; tone: "green" | "yellow" | "red" | "neutral"; title: string; description: string; medications: Medication[]; alert: string; recommendation: string };
const cases: Case[] = [
  { label: "Ca 1 — An toàn", short: "An toàn", tone: "green", title: "Không phát hiện cảnh báo đáng kể", description: "Ví dụ minh họa về một danh sách không có cảnh báo nổi bật.", alert: "Không có tương tác đáng kể trong tình huống mẫu này.", recommendation: "Tiếp tục tham khảo ý kiến chuyên gia y tế về lịch dùng thuốc.", medications: [
    { name: "Vitamin C", dose: "500 mg", frequency: "1 lần / ngày", timing: "Buổi sáng", notes: "Sau ăn sáng" },
    { name: "Canxi", dose: "500 mg", frequency: "1 lần / ngày", timing: "Buổi trưa", notes: "Sau ăn trưa" },
    { name: "Vitamin D", dose: "1000 IU", frequency: "1 lần / ngày", timing: "Buổi tối", notes: "Sau ăn tối" },
  ] },
  { label: "Ca 2 — Cần lưu ý", short: "Cần lưu ý", tone: "yellow", title: "Có thông tin cần lưu ý", description: "Ví dụ minh họa về một tình huống cần trao đổi thêm với dược sĩ.", alert: "Đây là nội dung cảnh báo minh họa, không phải kết quả kiểm tra tương tác.", recommendation: "Hãy mang danh sách thuốc đến hỏi bác sĩ hoặc dược sĩ.", medications: [
    { name: "Thuốc mẫu A", dose: "1 viên", frequency: "1 lần / ngày", timing: "Buổi sáng", notes: "Sau ăn" },
    { name: "Thuốc mẫu B", dose: "1 viên", frequency: "1 lần / ngày", timing: "Buổi tối", notes: "Theo chỉ định" },
  ] },
  { label: "Ca 3 — Cảnh báo nghiêm trọng", short: "Nghiêm trọng", tone: "red", title: "Ví dụ cảnh báo nghiêm trọng", description: "Tình huống mẫu này minh họa cách hiển thị cảnh báo mức độ cao.", alert: "Đây là cảnh báo giả lập để minh họa giao diện, không phải đánh giá y khoa.", recommendation: "Liên hệ bác sĩ hoặc dược sĩ để được tư vấn phù hợp.", medications: [
    { name: "Thuốc mẫu C", dose: "1 viên", frequency: "1 lần / ngày", timing: "Buổi sáng", notes: "Theo chỉ định" },
    { name: "Thuốc mẫu D", dose: "1 viên", frequency: "1 lần / ngày", timing: "Buổi tối", notes: "Theo chỉ định" },
  ] },
  { label: "Ca 4 — Ngoài thẩm quyền", short: "Ngoài thẩm quyền", tone: "neutral", title: "Cần tư vấn chuyên môn", description: "Một số tình huống cần được đánh giá trực tiếp bởi chuyên gia y tế.", alert: "Tình huống này nằm ngoài phạm vi của bản minh họa.", recommendation: "Vui lòng liên hệ bác sĩ hoặc dược sĩ để được hỗ trợ.", medications: [
    { name: "Thuốc mẫu E", dose: "Theo đơn", frequency: "Theo chỉ định", timing: "Buổi sáng", notes: "Hỏi bác sĩ" },
  ] },
];
const emptyMedication = (): Medication => ({ name: "", dose: "", frequency: "1 lần / ngày", timing: "Buổi sáng", notes: "" });
const periods = [
  { label: "Buổi sáng", time: "07:00 – 09:00", icon: IconSun },
  { label: "Buổi trưa", time: "11:00 – 13:00", icon: IconSunHigh },
  { label: "Buổi tối", time: "18:00 – 20:00", icon: IconSun },
  { label: "Trước khi ngủ", time: "21:00 – 22:00", icon: IconMoon },
];

export function meta() { return [{ title: "Thuốc Nhà — Chăm sóc lịch thuốc cho cha mẹ" }, { name: "description", content: "Sắp xếp lịch thuốc cho người thân một cách dễ dàng hơn." }]; }

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return <div className="section-heading"><span className="section-number">{number}</span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>;
}

export default function HomeRoute() {
  const [medications, setMedications] = useState<Medication[]>(cases[0]!.medications.map(m => ({...m})));
  const [selectedCase, setSelectedCase] = useState<number | null>(0);
  const [resultCase, setResultCase] = useState<number | null>(0);
  const [error, setError] = useState("");
  const [consultOpen, setConsultOpen] = useState(false);
  const update = (index: number, key: keyof Medication, value: string) => { setMedications(current => current.map((m, i) => i === index ? { ...m, [key]: value } : m)); setSelectedCase(null); setResultCase(null); setError(""); };
  const chooseCase = (index: number) => { setMedications(cases[index]!.medications.map(m => ({...m}))); setSelectedCase(index); setResultCase(index); setError(""); };
  const check = () => { if (!medications.length || medications.some(m => !m.name.trim())) { setError("Vui lòng thêm tên cho mỗi loại thuốc trước khi tiếp tục."); return; } if (selectedCase === null) { setError("Bản dùng thử chưa hỗ trợ kiểm tra thuốc tự nhập. Hãy chọn một ca mẫu để xem giao diện kết quả và hỏi chuyên gia y tế về thuốc của bạn."); return; } setError(""); setResultCase(selectedCase); document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const result = resultCase === null ? null : cases[resultCase];
  return <div className="app-page">
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="/"><span className="brand-icon"><IconLeaf size={22} stroke={1.8}/></span><span><strong>Thuốc Nhà<span className="brand-dot">.</span></strong><small>Chăm sóc lịch thuốc cho cha mẹ</small></span></a><div className="header-right"><span className="header-note"><IconShieldCheck size={17}/> Đồng hành cùng gia đình bạn</span><button className="logout" onClick={() => signOut()} title="Đăng xuất" aria-label="Đăng xuất"><IconLogout size={19}/></button></div></div></header>
    <main className="main-wrap">
      <div className="intro"><div><div className="eyebrow"><span></span> CHĂM SÓC SỨC KHỎE GIA ĐÌNH</div><h1>An tâm chăm sóc,<br/><em>trọn vẹn yêu thương.</em></h1><p>Một nơi đơn giản để theo dõi thuốc và sắp xếp lịch uống cho người thân của bạn.</p></div><div className="intro-illustration"><span className="illustration-halo"><IconClipboardHeart size={58} stroke={1.1}/></span><span className="illustration-plus">✳</span><span className="illustration-pill"><IconPill size={21}/></span></div></div>
      <div className="disclaimer"><IconInfoCircle size={20}/><p><strong>Lưu ý quan trọng</strong><span>Kết quả chỉ mang tính chất tham khảo hỗ trợ sắp xếp lịch uống, không thay thế chỉ định của bác sĩ hoặc dược sĩ.</span></p></div>
      <div className="content-grid"><div className="main-column">
        <section className="panel medication-panel"><div className="panel-top"><SectionHeading number="01" title="Danh sách thuốc đang sử dụng" subtitle="Thêm các loại thuốc người thân của bạn đang dùng."/><span className="count-pill">{medications.length} loại thuốc</span></div>
          <div className="demo-box"><div className="demo-top"><div><IconSparkles size={17}/><strong>Khám phá với dữ liệu mẫu</strong></div><span>Chọn một tình huống để dùng thử</span></div><div className="preset-list">{cases.map((item, i) => <button key={item.label} className={`preset ${selectedCase === i ? "selected" : ""}`} onClick={() => chooseCase(i)}><span className={`preset-dot ${item.tone}`}></span>{item.label}</button>)}</div></div>
          <div className="medication-list">{medications.length ? medications.map((medication, index) => <div className="med-row" key={index}><div className="row-top"><div className="row-name"><span className="pill-icon"><IconPill size={17}/></span><strong>Thuốc {String(index + 1).padStart(2, "0")}</strong></div><button className="icon-button" aria-label={`Xóa thuốc ${index + 1}`} onClick={() => { setMedications(medications.filter((_, i) => i !== index)); setSelectedCase(null); setResultCase(null); }}><IconTrash size={17}/></button></div><div className="fields"><label className="field name-field">Tên thuốc<input value={medication.name} placeholder="Nhập tên thuốc" onChange={e => update(index, "name", e.target.value)}/></label><label className="field">Liều dùng<input value={medication.dose} placeholder="VD: 1 viên" onChange={e => update(index, "dose", e.target.value)}/></label><label className="field">Tần suất<input value={medication.frequency} placeholder="VD: 1 lần / ngày" onChange={e => update(index, "frequency", e.target.value)}/></label><label className="field">Thời điểm<select value={medication.timing} onChange={e => update(index, "timing", e.target.value)}>{periods.map(p => <option key={p.label}>{p.label}</option>)}</select></label><label className="field notes-field">Ghi chú<input value={medication.notes} placeholder="VD: Sau ăn" onChange={e => update(index, "notes", e.target.value)}/></label></div></div>) : <div className="empty-state"><IconPill size={25}/><strong>Danh sách thuốc đang trống</strong><span>Thêm thuốc hoặc chọn một ca mẫu để bắt đầu.</span></div>}</div>
          <div className="list-actions"><button className="add-button" onClick={() => { setMedications([...medications, emptyMedication()]); setSelectedCase(null); setResultCase(null); }}><IconPlus size={17}/> Thêm thuốc</button><button className="clear-button" onClick={() => { setMedications([]); setSelectedCase(null); setResultCase(null); setError(""); }}><IconTrash size={16}/> Xóa danh sách</button></div>
          {error && <div className="error-message" role="alert"><IconAlertTriangle size={18}/>{error}</div>}
          <button className="primary-button check-button" onClick={check}><IconShieldCheck size={20}/> Kiểm tra tương tác thuốc <IconArrowRight className="button-arrow" size={19}/></button><p className="privacy-note"><IconLock size={14}/> Bản trình diễn: thông tin nhập vào chỉ lưu trong phiên này.</p>
        </section>
        <section className="results-section" id="results"><div className="results-title"><SectionHeading number="02" title="Kết quả kiểm tra" subtitle="Tổng quan để bạn dễ dàng theo dõi và trao đổi với chuyên gia."/><span className="sample-badge">DỮ LIỆU MẪU</span></div>{result ? <><div className={`risk-card ${result.tone}`}><span className="risk-icon">{result.tone === "green" ? <IconCircleCheck size={25}/> : <IconAlertTriangle size={25}/>}</span><div><div className="risk-label">TỔNG QUAN MẪU</div><h3>{result.title}</h3><p>{result.description} Đây không phải kết quả y khoa thực tế.</p></div><span className="risk-badge">{result.short}</span></div><div className="interaction-card"><div className="interaction-header"><div><span className="small-icon"><IconShieldCheck size={18}/></span><strong>Cảnh báo tương tác</strong></div><span>Minh họa</span></div><div className="interaction-content"><div className="interaction-drugs">{result.medications.slice(0, 2).map(m => <span key={m.name}>{m.name}</span>)}</div><p>{result.alert}</p><div className="recommendation"><strong>Gợi ý minh họa</strong><p>{result.recommendation}</p></div><details><summary>Xem chi tiết <IconChevronDown size={16}/></summary><p>Nội dung và mức độ hiển thị chỉ phục vụ trải nghiệm giao diện. Không dùng để quyết định thay đổi thuốc hoặc liều dùng.</p></details></div></div></> : <div className="empty-result"><IconShieldCheck size={28}/><strong>Chưa có kết quả mẫu</strong><p>Chọn một tình huống mẫu để xem cách kết quả được hiển thị.</p></div>}</section>
      </div><aside className="side-column"><section className="panel schedule-panel"><div className="side-heading"><div className="side-heading-icon"><IconCalendarTime size={21}/></div><div><h2>Lịch uống thuốc</h2><p>Sắp xếp một ngày nhẹ nhàng hơn</p></div></div><div className="schedule-label"><span>LỊCH TRÌNH TRONG NGÀY</span><span>Minh họa</span></div><div className="timeline">{periods.map(period => { const meds = medications.filter(m => m.timing === period.label && m.name.trim()); const PeriodIcon = period.icon; return <div className="timeline-item" key={period.label}><div className="timeline-icon"><PeriodIcon size={17}/></div><div className="timeline-content"><div className="timeline-head"><strong>{period.label}</strong><span>{period.time}</span></div>{meds.length ? meds.map((m, i) => <div className="schedule-med" key={i}><div><strong>{m.name}</strong><span>{m.dose || "Chưa có liều dùng"}</span></div><p><IconClockHour4 size={13}/> {m.notes || "Chưa có ghi chú"}</p></div>) : <p className="no-med">Không có thuốc</p>}</div></div> })}</div><p className="schedule-footnote">Khung giờ chỉ để minh họa, không phải chỉ định dùng thuốc.</p></section>
        <section className="pharmacist-card"><span className="pharmacist-icon"><IconHeartHandshake size={24}/></span><div className="pharmacist-eyebrow">LUÔN CÓ NGƯỜI ĐỒNG HÀNH</div><h2>Bạn cần thêm<br/>lời khuyên?</h2><p>Dược sĩ có thể giúp bạn hiểu rõ hơn về thuốc và lịch uống của người thân.</p><button onClick={() => setConsultOpen(!consultOpen)}>Hỏi Dược Sĩ Ngay <IconArrowRight size={18}/></button>{consultOpen && <div className="consult-message">Tính năng kết nối dược sĩ đang được phát triển. Vui lòng liên hệ cơ sở y tế hoặc nhà thuốc gần bạn để được tư vấn.</div>}</section><div className="side-note"><IconShieldCheck size={17}/><span>Chăm sóc cẩn thận, an tâm mỗi ngày.</span></div></aside></div>
      <footer><span>© Thuốc Nhà · Chăm sóc từ những điều nhỏ nhất</span><span>Được thiết kế cho gia đình Việt <span className="footer-heart">♥</span></span></footer>
    </main>
  </div>;
}
