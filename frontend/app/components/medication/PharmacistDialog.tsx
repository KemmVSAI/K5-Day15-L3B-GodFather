import {
  IconAlertTriangle,
  IconCheck,
  IconClipboard,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildPharmacistText } from "@/lib/medication-ui";
import type { MedicationMeta } from "@/lib/medication-api";

export function PharmacistDialog({
  meta,
  open,
  onOpenChange,
}: {
  meta: MedicationMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const text = meta !== null ? buildPharmacistText(meta) : "";

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (!copied) throw new Error("copy failed");
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 5000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setCopyState("idle");
      }}
    >
      <DialogContent className="pharmacist-dialog">
        <DialogHeader>
          <DialogTitle>Chuẩn bị thông tin cho dược sĩ</DialogTitle>
          <DialogDescription>
            Kiểm tra lại nội dung rồi copy để gửi hoặc mang theo khi đến nhà
            thuốc/cơ sở y tế. Không có thông tin nào được tự gửi.
          </DialogDescription>
        </DialogHeader>
        {meta ? (
          <>
            {meta.handoff && (
              <p className="draft-status">
                <IconInfoCircle aria-hidden="true" size={18} />
                Phiếu {meta.handoff.draft_id} · Chưa gửi
              </p>
            )}
            <label className="copy-label" htmlFor="pharmacist-copy">
              Nội dung trao đổi
            </label>
            <textarea
              id="pharmacist-copy"
              className="pharmacist-copy"
              value={text}
              readOnly
              rows={15}
              onFocus={(event) => event.currentTarget.select()}
            />
            <DialogFooter className="dialog-actions">
              <button className="secondary-button" onClick={() => onOpenChange(false)}>
                <IconX aria-hidden="true" size={18} /> Đóng
              </button>
              <button className="primary-button" onClick={copy}>
                {copyState === "copied" ? (
                  <IconCheck aria-hidden="true" size={18} />
                ) : (
                  <IconClipboard aria-hidden="true" size={18} />
                )}
                {copyState === "copied" ? "Đã copy" : "Copy thông tin"}
              </button>
            </DialogFooter>
            <div className="copy-feedback" aria-live="polite">
              {copyState === "error" && (
                <p className="inline-error" role="alert">
                  <IconAlertTriangle aria-hidden="true" size={17} />
                  Không thể copy tự động. Hãy bấm vào nội dung, chọn toàn bộ và copy thủ công.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <IconInfoCircle aria-hidden="true" size={28} />
            <strong>Chưa có kết quả để chuẩn bị phiếu</strong>
            <p>Hãy kiểm tra danh sách thuốc trước khi copy thông tin.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
