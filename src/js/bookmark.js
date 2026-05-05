// ════════════════════════════════════
// bookmark.js — 북마크 추가 · 삭제 · 목록 렌더링
// 경로: src/js/bookmark.js
// ════════════════════════════════════

import { saveBookmark, deleteBookmark, loadBookmarks } from "./sync.js";
import { showToast } from "./firebase.js";

// ── 상태 ───────────────────────────────────────
let currentBookId = null;

// ── 북마크 초기화 ──────────────────────────────
export function initBookmark({ bookId, getPosition }) {
  currentBookId = bookId;

  // 북마크 추가 버튼 (상단바)
  const btn = document.getElementById("btn-bookmark-add");
  if (btn) {
    // 기존 이벤트 제거 후 재등록
    btn.replaceWith(btn.cloneNode(true));
    document
      .getElementById("btn-bookmark-add")
      ?.addEventListener("click", () => addBookmark(getPosition));
  }

  // B 키 단축키는 viewer.js 에서 처리 — 여기선 직접 호출 가능하도록 export

  // 저장된 북마크 불러와서 사이드바 렌더링
  renderBookmarks();
}

// ── 북마크 추가 ────────────────────────────────
export async function addBookmark(getPosition) {
  if (!currentBookId) return;

  const { chapterIdx, scrollY } = getPosition();
  const bookmarkId = `bm-${Date.now()}`;

  // 챕터 제목을 라벨로 사용
  const chapterEl = document.getElementById(`chapter-${chapterIdx}`);
  const label =
    chapterEl?.querySelector(".chapter-title")?.textContent ??
    `${chapterIdx + 1}챕터`;

  await saveBookmark({
    bookId: currentBookId,
    bookmarkId,
    chapterIdx,
    scrollY,
    label,
  });

  showToast(`🔖 "${label}" 북마크 추가됨`);
  renderBookmarks();
}

// ── 북마크 삭제 ────────────────────────────────
async function removeBookmark(bookmarkId) {
  if (!currentBookId) return;

  await deleteBookmark({ bookId: currentBookId, bookmarkId });
  renderBookmarks();
  showToast("북마크 삭제됨");
}

// ── 북마크 목록 렌더링 ─────────────────────────
export async function renderBookmarks() {
  if (!currentBookId) return;

  const list = document.getElementById("bookmark-list");
  if (!list) return;

  const bookmarks = await loadBookmarks(currentBookId);

  if (bookmarks.length === 0) {
    list.innerHTML = `<p class="sidebar-empty">북마크가 없어요<br>B키로 추가할 수 있어요</p>`;
    return;
  }

  list.innerHTML = "";

  bookmarks.forEach((bm) => {
    const item = document.createElement("div");
    item.className = "bookmark-item";

    item.innerHTML = `
      <div class="bookmark-info">
        <div class="bookmark-label">${escapeHtml(bm.label)}</div>
        <div class="bookmark-meta">챕터 ${bm.chapterIdx + 1}</div>
      </div>
      <button class="bookmark-delete" data-id="${bm.bookmarkId}" title="삭제">✕</button>
    `;

    // 클릭 → 해당 위치로 이동
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("bookmark-delete")) return;
      scrollToBookmark(bm);
    });

    // 삭제 버튼
    item.querySelector(".bookmark-delete")?.addEventListener("click", (e) => {
      e.stopPropagation();
      removeBookmark(bm.bookmarkId);
    });

    list.appendChild(item);
  });
}

// ── 북마크 위치로 스크롤 ───────────────────────
function scrollToBookmark({ chapterIdx, scrollY }) {
  const contentArea = document.getElementById("content-area");
  const section = document.getElementById(`chapter-${chapterIdx}`);
  if (!contentArea || !section) return;

  // 챕터 위치 + scrollY 오프셋
  contentArea.scrollTo({
    top: section.offsetTop - 64 + scrollY,
    behavior: "smooth",
  });

  // 사이드바 탭을 목차로 되돌리기 (선택사항)
  // document.querySelector('.stab[data-tab="toc"]')?.click();
}

// ── XSS 방지 ──────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
