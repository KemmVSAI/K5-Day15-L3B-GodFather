import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('FamilyMed UI & UX remediation regression', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    window.localStorage.clear();
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  function renderAt(path: string) {
    window.history.pushState({}, '', path);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<App />);
    });
  }

  it('renders Two-Column /checker workspace, computes non-contradictory 3/3 amber banner, and marks old result + schedule as stale on edit', async () => {
    renderAt('/checker');
    expect(container.textContent).toContain('Kiểm tra tương tác và sắp xếp thuốc cho cha mẹ');
    expect(container.textContent).toContain('Tình huống mẫu');
    expect(container.textContent).toContain('Lịch nháp sẽ xuất hiện sau khi hoàn tất đối chiếu');
    expect(container.textContent).toContain('Kết quả đối chiếu sẽ xuất hiện tại đây');

    // Technical IDs hidden in default mode
    const presetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Đối chiếu thời điểm'),
    );
    expect(presetBtn).toBeDefined();
    act(() => {
      presetBtn?.click();
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Kiểm tra tương tác thuốc'),
    );
    await act(async () => {
      submitBtn?.click();
    });

    await vi.waitFor(
      () => {
        expect(container.textContent).toContain('Đã đối chiếu đủ danh mục — có tương tác mức trung bình cần lưu ý');
        expect(container.textContent).toContain('3/3 thuốc thuộc danh mục hỗ trợ');
        expect(container.textContent).toContain('Buổi trưa');
        expect(container.textContent).not.toContain('Interaction Found');
        expect(container.textContent).not.toContain('DRUG-15');
      },
      { timeout: 2500 },
    );

    // Edit strength on an existing medication -> previous result and schedule become stale!
    const strengthInput = container.querySelector('input[placeholder="500mg"]') as HTMLInputElement | null;
    expect(strengthInput).not.toBeNull();
    act(() => {
      setNativeInputValue(strengthInput!, '100mcg');
    });

    expect(container.textContent).toContain('Dữ liệu đã thay đổi');
    expect(container.textContent).toContain('Kiểm tra lại');
    expect(container.textContent).toContain('Kết quả lần kiểm tra trước');
    // Old schedule timeline must NOT remain active when stale
    expect(container.textContent).not.toContain('Buổi trưa');
  });

  it('does not overwrite manual medications silently in Quick Paste and focuses confirmation control on validation error', async () => {
    renderAt('/checker');
    const presetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Đối chiếu thời điểm'),
    );
    act(() => {
      presetBtn?.click();
    });

    // Switch to Quick Paste tab and analyze text while 3 meds already exist
    const pasteTab = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find((b) =>
      b.textContent?.includes('Dán nhanh'),
    );
    act(() => {
      pasteTab?.click();
    });

    const analyzeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Phân tích danh sách thuốc'),
    );
    await act(async () => {
      analyzeBtn?.click();
    });

    await vi.waitFor(
      () => {
        expect(container.textContent).toContain('Xem trước kết quả tách');
        expect(container.textContent).toContain('Thêm vào danh sách hiện tại');
        expect(container.textContent).toContain('Thay thế danh sách hiện tại');
        expect(container.textContent).toContain('Hủy');
      },
      { timeout: 2000 },
    );

    // Apply via "Thay thế danh sách hiện tại" -> results come back as suggested (unconfirmed)
    const replaceBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Thay thế danh sách hiện tại'),
    );
    act(() => {
      replaceBtn?.click();
    });

    // Trigger validation submit before confirming -> must focus the "Xác nhận" button, NOT the text input
    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Kiểm tra tương tác thuốc'),
    );
    await act(async () => {
      submitBtn?.click();
    });

    await vi.waitFor(
      () => {
        expect(document.activeElement?.id).toMatch(/^med-confirm-/);
      },
      { timeout: 1000 },
    );
  });

  it('reuses a historical session from /history into a new editable draft in /checker', async () => {
    renderAt('/history');
    expect(container.textContent).toContain('Lịch sử kiểm tra thuốc');
    expect(container.textContent).toContain('Dùng lại danh sách này');

    const reuseBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Dùng lại danh sách này'),
    );
    act(() => {
      reuseBtn?.click();
    });

    await vi.waitFor(
      () => {
        expect(window.location.pathname).toBe('/checker');
        expect(container.textContent).toContain('Đã tạo bản nháp mới từ phiên trước');
        expect(container.textContent).toContain('Kết quả đối chiếu sẽ xuất hiện tại đây');
      },
      { timeout: 1000 },
    );
  });

  it('renders severe blocked result DEMO-B09 with plain Vietnamese copy in default mode and reveals technical codes only when Technical Mode is ON', async () => {
    renderAt('/results/DEMO-B09');
    await vi.waitFor(
      () => {
        expect(container.textContent).toContain('Phát hiện tương tác nghiêm trọng — lịch thuốc hoàn chỉnh đã bị khóa.');
      },
      { timeout: 1500 },
    );
    expect(container.textContent).toContain('Báo cáo đối chiếu: Mẹ (68 tuổi)');
    expect(container.textContent).toContain('Dùng lại danh sách này');
    expect(container.textContent).not.toContain('Interaction Found');

    // Toggle header Technical Mode ON
    const techToggle = container.querySelector('button[role="switch"]') as HTMLButtonElement | null;
    expect(techToggle).not.toBeNull();
    act(() => {
      techToggle?.click();
    });
    expect(container.textContent).toContain('Chế độ kỹ thuật — Execution Trace');
    expect(container.textContent).toContain('GATE-BLOCK-SEVERE');
    expect(container.textContent).toContain('Interaction Found');
  });
});
