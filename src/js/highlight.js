// ════════════════════════════════════
// highlight.js — 드래그 하이라이트 · 메모
// 경로: src/js/highlight.js
// ════════════════════════════════════

import { showToast } from "./firebase.js";

// ── 상태 ───────────────────────────────────────
let currentBookId = null;
let highlights = {}; // { highlightId: { color, note, ... } }
let popupEl = null; // 색상 선택 팝업

const COLORS = [
  { id: "yellow", label: "노랑", bg: "rgba(234,197,44,0.45)" },
  { id: "green", label: "초록", bg: "rgba(100,184,100,0.45)" },
  { id: "pink", label: "분홍", bg: "rgba(220,100,150,0.45)" },
  { id: "blue", label: "파랑", bg: "rgba(80,150,220,0.45)" },
];

// ── 초기화 ─────────────────────────────────────
export function initHighlight({ bookId }) {
  currentBookId = bookId;

  // 저장된 하이라이트 불러와서 복원
  loadAndRestoreHighlights();

  // 드래그 종료 → 팝업 표시
  const reader = document.getElementById("reader");
  reader?.addEventListener("mouseup", onSelectionEnd);
  reader?.addEventListener("touchend", onSelectionEnd);

  // 팝업 외부 클릭 시 닫기
  document.addEventListener("mousedown", (e) => {
    if (popupEl && !popupEl.contains(e.target)) removePopup();
  });
}

// ── 드래그 종료 처리 ──────────────────────────
function onSelectionEnd() {
  // 약간의 딜레이 후 selection 확인 (touchend 대응)
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }
    showColorPopup(sel);
  }, 50);
}

// ── 색상 선택 팝업 표시 ───────────────────────
function showColorPopup(sel) {
  removePopup();

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  popupEl = document.createElement("div");
  popupEl.className = "highlight-popup";
  popupEl.style.cssText = `
    position: fixed;
    top: ${rect.top - 52}px;
    left: ${Math.max(8, rect.left + rect.width / 2 - 90)}px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border2);
    border-radius: 10px;
    padding: 8px 10px;
    z-index: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  `;

  // 색상 버튼들
  COLORS.forEach(({ id, label, bg }) => {
    const btn = document.createElement("button");
    btn.title = label;
    btn.style.cssText = `
      width: 22px; height: 22px;
      border-radius: 50%;
      background: ${bg};
      border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer;
      transition: transform 0.15s;
    `;
    btn.addEventListener(
      "mouseover",
      () => (btn.style.transform = "scale(1.2)"),
    );
    btn.addEventListener("mouseout", () => (btn.style.transform = "scale(1)"));
    btn.addEventListener("click", () => {
      applyHighlight(range, id, bg);
      removePopup();
      sel.removeAllRanges();
    });
    popupEl.appendChild(btn);
  });

  // 구분선
  const divider = document.createElement("div");
  divider.style.cssText =
    "width:1px;height:18px;background:var(--border2);margin:0 2px;";
  popupEl.appendChild(divider);

  // 메모 버튼
  const memoBtn = document.createElement("button");
  memoBtn.textContent = "📝";
  memoBtn.title = "메모 추가";
  memoBtn.style.cssText =
    "font-size:14px;cursor:pointer;background:none;border:none;padding:0 2px;";
  memoBtn.addEventListener("click", () => {
    showMemoInput(range);
    removePopup();
    sel.removeAllRanges();
  });
  popupEl.appendChild(memoBtn);

  document.body.appendChild(popupEl);
}

// ── 하이라이트 적용 ───────────────────────────
function applyHighlight(range, colorId, bg, note = "") {
  const highlightId = `hl-${Date.now()}`;

  try {
    const mark = document.createElement("mark");
    mark.className = `highlight highlight-${colorId}`;
    mark.dataset.id = highlightId;
    mark.dataset.colorId = colorId;
    mark.dataset.note = note;
    mark.style.background = bg;
    mark.title = note || "";

    range.surroundContents(mark);

    // 메모 클릭 이벤트
    mark.addEventListener("click", () => {
      if (mark.dataset.note) showToast(`📝 ${mark.dataset.note}`);
    });

    // 우클릭 → 삭제
    mark.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      removeHighlight(highlightId, mark);
    });

    // 저장
    const data = {
      highlightId,
      colorId,
      bg,
      note,
      text: mark.textContent,
      createdAt: Date.now(),
    };
    highlights[highlightId] = data;
    saveHighlightsToStorage();

    showToast("형광펜 추가됨 (우클릭으로 삭제)");
  } catch {
    // 복잡한 범위 (여러 엘리먼트 걸쳐있는 경우) 는 스킵
    showToast("이 위치에는 형광펜을 적용할 수 없어요");
  }
}

// ── 메모 입력 UI ──────────────────────────────
function showMemoInput(range) {
  const rect = range.getBoundingClientRect();

  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: fixed;
    top: ${rect.top - 100}px;
    left: ${Math.max(8, rect.left + rect.width / 2 - 120)}px;
    background: var(--bg-surface);
    border: 1px solid var(--border2);
    border-radius: 10px;
    padding: 10px;
    z-index: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 240px;
  `;

  const input = document.createElement("textarea");
  input.placeholder = "메모 입력...";
  input.style.cssText = `
    width: 100%;
    height: 60px;
    background: var(--bg-surface2);
    border: 1px solid var(--border2);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 6px 8px;
    resize: none;
    font-family: inherit;
    outline: none;
  `;

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:6px;justify-content:flex-end;";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "취소";
  cancelBtn.style.cssText =
    "font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--border2);color:var(--text-muted);cursor:pointer;background:none;";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  saveBtn.style.cssText =
    "font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--accent);color:var(--accent);background:var(--accent-dim);cursor:pointer;";

  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  wrap.appendChild(input);
  wrap.appendChild(btns);
  document.body.appendChild(wrap);

  input.focus();

  cancelBtn.addEventListener("click", () => wrap.remove());
  saveBtn.addEventListener("click", () => {
    const note = input.value.trim();
    applyHighlight(range, "yellow", COLORS[0].bg, note);
    wrap.remove();
  });
}

// ── 하이라이트 삭제 ───────────────────────────
function removeHighlight(highlightId, markEl) {
  // mark 태그 제거하고 텍스트 노드로 교체
  const parent = markEl.parentNode;
  if (!parent) return;
  parent.replaceChild(document.createTextNode(markEl.textContent), markEl);
  parent.normalize();

  delete highlights[highlightId];
  saveHighlightsToStorage();
  showToast("형광펜 삭제됨");
}

// ── localStorage 저장/불러오기 ─────────────────
// (Firestore 연동은 이후 highlight 컬렉션 추가 시 확장)
function saveHighlightsToStorage() {
  if (!currentBookId) return;
  localStorage.setItem(
    `highlights-${currentBookId}`,
    JSON.stringify(highlights),
  );
}

function loadAndRestoreHighlights() {
  if (!currentBookId) return;
  try {
    const saved = JSON.parse(
      localStorage.getItem(`highlights-${currentBookId}`) ?? "{}",
    );
    highlights = saved;
    // DOM 복원은 텍스트 노드 기반이라 페이지 reload 후엔 위치가 달라질 수 있음
    // → 현재는 세션 중 추가한 것만 유지, 새로고침 후 재적용은 Phase 3 에서 처리
  } catch {
    highlights = {};
  }
}

// ── 팝업 제거 ─────────────────────────────────
function removePopup() {
  popupEl?.remove();
  popupEl = null;
}
