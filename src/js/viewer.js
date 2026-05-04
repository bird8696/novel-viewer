// ════════════════════════════════════
// viewer.js — 챕터 렌더링 · 목차 · 스크롤 · 진행률
// 경로: src/js/viewer.js
// ════════════════════════════════════

import { showToast } from "./firebase.js";

// ── 상태 ───────────────────────────────────────
let currentBook = null; // 현재 로드된 책
let currentChapter = 0; // 현재 챕터 인덱스
let scrollSaveTimer = null; // debounce 타이머
let onScrollSave = null; // sync.js 에서 주입하는 저장 콜백

// ── 뷰어 초기화 ────────────────────────────────
export function initViewer({ onScroll }) {
  onScrollSave = onScroll ?? null;

  const contentArea = document.getElementById("content-area");

  // 스크롤 이벤트 — debounce 2초 후 저장
  contentArea?.addEventListener("scroll", () => {
    updateProgressBar();
    updateActiveToc();

    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
      if (onScrollSave && currentBook) {
        onScrollSave({
          bookId: currentBook.id,
          chapterIdx: currentChapter,
          scrollY: contentArea.scrollTop,
        });
      }
    }, 2000);
  });

  // 사이드바 탭 전환
  document.querySelectorAll(".stab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".stab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".sidebar-panel")
        .forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document
        .getElementById(`panel-${tab.dataset.tab}`)
        ?.classList.remove("hidden");
    });
  });

  // 사이드바 토글
  document
    .getElementById("btn-sidebar-toggle")
    ?.addEventListener("click", toggleSidebar);

  // 설정 패널
  document
    .getElementById("btn-settings")
    ?.addEventListener("click", openSettings);
  document
    .getElementById("btn-settings-close")
    ?.addEventListener("click", closeSettings);
  document
    .getElementById("settings-backdrop")
    ?.addEventListener("click", closeSettings);

  // 키보드 단축키
  document.addEventListener("keydown", handleKeydown);
}

// ── 책 불러오기 (parser.js 에서 호출) ──────────
export function loadBook(book) {
  currentBook = book;
  currentChapter = 0;

  // 업로드 화면 숨기고 뷰어 표시
  document.getElementById("upload-screen")?.classList.add("hidden");
  document.getElementById("reader-wrap")?.classList.remove("hidden");

  // 상단 제목 업데이트
  const titleEl = document.getElementById("book-title");
  if (titleEl) titleEl.textContent = book.title;

  // 상단 버튼 표시
  document.getElementById("btn-search")?.style.removeProperty("display");
  document.getElementById("btn-bookmark-add")?.style.removeProperty("display");
  document.getElementById("progress-wrap")?.style.removeProperty("display");

  // 렌더링
  renderAllChapters(book.chapters);
  renderToc(book.chapters);
  updateProgressBar();
}

// ── 전체 챕터 렌더링 ───────────────────────────
function renderAllChapters(chapters) {
  const reader = document.getElementById("reader");
  if (!reader) return;

  reader.innerHTML = "";

  chapters.forEach((chapter) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = `chapter-${chapter.index}`;
    section.dataset.idx = chapter.index;

    // 챕터 제목
    const title = document.createElement("h2");
    title.className = "chapter-title";
    title.textContent = chapter.title;
    section.appendChild(title);

    // 본문
    const body = document.createElement("div");
    body.className = "chapter-body";
    body.innerHTML = renderBody(chapter.content);
    section.appendChild(body);

    reader.appendChild(section);
  });
}

// ── 본문 텍스트 → HTML 변환 ────────────────────
// 빈 줄 기준으로 문단 분리
function renderBody(text) {
  if (!text) return "";

  return text
    .split(/\n{2,}/) // 빈 줄로 문단 분리
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      // 각 줄을 <br>로 연결
      const lines = trimmed
        .split(/\n/)
        .map((l) => escapeHtml(l))
        .join("<br>");
      return `<p>${lines}</p>`;
    })
    .filter(Boolean)
    .join("");
}

// XSS 방지
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 목차 렌더링 ────────────────────────────────
function renderToc(chapters) {
  const tocList = document.getElementById("toc-list");
  if (!tocList) return;

  tocList.innerHTML = "";

  chapters.forEach((chapter) => {
    const btn = document.createElement("button");
    btn.className = "toc-item";
    btn.textContent = chapter.title;
    btn.dataset.idx = chapter.index;

    btn.addEventListener("click", () => {
      scrollToChapter(chapter.index);
      // 모바일에서 사이드바 자동 닫기
      if (window.innerWidth <= 640) closeSidebarMobile();
    });

    tocList.appendChild(btn);
  });

  // 첫 번째 항목 활성화
  tocList.querySelector(".toc-item")?.classList.add("active");
}

// ── 챕터로 스크롤 ──────────────────────────────
export function scrollToChapter(idx) {
  const section = document.getElementById(`chapter-${idx}`);
  const contentArea = document.getElementById("content-area");
  if (!section || !contentArea) return;

  currentChapter = idx;
  contentArea.scrollTo({ top: section.offsetTop - 64, behavior: "smooth" });
  updateActiveToc();
}

// ── 특정 위치로 스크롤 복원 ────────────────────
export function restoreScroll({ chapterIdx, scrollY }) {
  const contentArea = document.getElementById("content-area");
  if (!contentArea) return;

  currentChapter = chapterIdx ?? 0;

  // 렌더링 완료 후 스크롤
  requestAnimationFrame(() => {
    contentArea.scrollTop = scrollY ?? 0;
    updateActiveToc();
    updateProgressBar();
  });
}

// ── 진행률 업데이트 ────────────────────────────
function updateProgressBar() {
  const contentArea = document.getElementById("content-area");
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("progress-text");
  if (!contentArea || !fill || !text) return;

  const scrolled = contentArea.scrollTop;
  const total = contentArea.scrollHeight - contentArea.clientHeight;
  const pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;

  fill.style.width = `${pct}%`;
  text.textContent = `${pct}%`;
}

// ── 현재 보이는 챕터 감지 → 목차 활성화 ─────────
function updateActiveToc() {
  const contentArea = document.getElementById("content-area");
  if (!contentArea) return;

  const scrollTop = contentArea.scrollTop + 80;
  const sections = contentArea.querySelectorAll(".chapter");

  let activeIdx = 0;
  sections.forEach((section) => {
    if (section.offsetTop <= scrollTop) {
      activeIdx = parseInt(section.dataset.idx, 10);
    }
  });

  currentChapter = activeIdx;

  // 목차 활성 상태 업데이트
  document.querySelectorAll(".toc-item").forEach((item) => {
    item.classList.toggle(
      "active",
      parseInt(item.dataset.idx, 10) === activeIdx,
    );
  });
}

// ── 사이드바 토글 ──────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  if (window.innerWidth <= 640) {
    // 모바일: transform으로 슬라이드
    sidebar.classList.toggle("mobile-open");
  } else {
    // 데스크탑: 너비 축소
    sidebar.classList.toggle("collapsed");
  }
}

function closeSidebarMobile() {
  document.getElementById("sidebar")?.classList.remove("mobile-open");
}

// ── 설정 패널 ──────────────────────────────────
function openSettings() {
  const panel = document.getElementById("settings-panel");
  if (!panel) return;
  panel.classList.remove("hidden");
  requestAnimationFrame(() => panel.classList.add("open"));
  document.getElementById("settings-backdrop")?.classList.remove("hidden");
}

function closeSettings() {
  const panel = document.getElementById("settings-panel");
  if (!panel) return;
  panel.classList.remove("open");
  document.getElementById("settings-backdrop")?.classList.add("hidden");
  setTimeout(() => panel.classList.add("hidden"), 250);
}

// ── 키보드 단축키 ──────────────────────────────
function handleKeydown(e) {
  // 입력 중엔 단축키 무시
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  const contentArea = document.getElementById("content-area");

  switch (e.key) {
    case "t":
    case "T":
      toggleSidebar();
      break;

    case "ArrowDown":
    case " ":
      e.preventDefault();
      contentArea?.scrollBy({ top: 300, behavior: "smooth" });
      break;

    case "ArrowUp":
      e.preventDefault();
      contentArea?.scrollBy({ top: -300, behavior: "smooth" });
      break;

    case "f":
    case "F":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleSearch();
      }
      break;

    case "b":
    case "B":
      if (!e.ctrlKey && !e.metaKey) addBookmark();
      break;

    case "Escape":
      closeSettings();
      closeSearch();
      break;
  }
}

// ── 검색 토글 (search.js 연결 전 플레이스홀더) ──
function toggleSearch() {
  const bar = document.getElementById("search-bar");
  if (!bar) return;
  bar.classList.toggle("hidden");
  if (!bar.classList.contains("hidden")) {
    document.getElementById("search-input")?.focus();
  }
}

function closeSearch() {
  document.getElementById("search-bar")?.classList.add("hidden");
}

// ── 북마크 추가 (bookmark.js 연결 전 플레이스홀더) ─
function addBookmark() {
  if (!currentBook) return;
  const contentArea = document.getElementById("content-area");
  showToast(`📖 ${currentChapter + 1}챕터에 북마크 추가됨`);
  // bookmark.js 연결 후 실제 저장 로직 교체
  console.log("bookmark:", {
    chapterIdx: currentChapter,
    scrollY: contentArea?.scrollTop ?? 0,
  });
}

// ── 현재 읽기 위치 반환 (sync.js 에서 사용) ─────
export function getCurrentPosition() {
  const contentArea = document.getElementById("content-area");
  return {
    chapterIdx: currentChapter,
    scrollY: contentArea?.scrollTop ?? 0,
  };
}

// ── 현재 책 반환 ───────────────────────────────
export function getCurrentBook() {
  return currentBook;
}
