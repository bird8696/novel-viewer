// ════════════════════════════════════
// search.js — 텍스트 검색 · 하이라이트 · 이전/다음
// 경로: src/js/search.js
// ════════════════════════════════════

// ── 상태 ───────────────────────────────────────
let matches = []; // 검색 결과 NodeList
let currentIdx = -1; // 현재 위치
let lastQuery = ""; // 마지막 검색어

// ── 검색 초기화 ────────────────────────────────
export function initSearch() {
  const searchBtn = document.getElementById("btn-search");
  const searchBar = document.getElementById("search-bar");
  const searchInput = document.getElementById("search-input");
  const closeBtn = document.getElementById("btn-search-close");
  const prevBtn = document.getElementById("btn-search-prev");
  const nextBtn = document.getElementById("btn-search-next");

  // 검색 버튼 (상단바)
  searchBtn?.addEventListener("click", openSearch);

  // 닫기 버튼
  closeBtn?.addEventListener("click", closeSearch);

  // 이전 / 다음
  prevBtn?.addEventListener("click", () => navigate(-1));
  nextBtn?.addEventListener("click", () => navigate(1));

  // 검색어 입력 시 실시간 검색
  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (query === lastQuery) return;
    lastQuery = query;

    if (query.length < 1) {
      clearHighlights();
      updateCount();
      return;
    }
    search(query);
  });

  // 엔터 → 다음, Shift+엔터 → 이전
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.shiftKey ? navigate(-1) : navigate(1);
    }
    if (e.key === "Escape") closeSearch();
  });

  // Ctrl+F 단축키
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      searchBar?.classList.contains("hidden") ? openSearch() : closeSearch();
    }
  });
}

// ── 검색 열기 / 닫기 ───────────────────────────
export function openSearch() {
  const bar = document.getElementById("search-bar");
  const input = document.getElementById("search-input");
  bar?.classList.remove("hidden");
  input?.focus();
  input?.select();
}

export function closeSearch() {
  document.getElementById("search-bar")?.classList.add("hidden");
  clearHighlights();
  matches = [];
  currentIdx = -1;
  lastQuery = "";
  document.getElementById("search-input") &&
    (document.getElementById("search-input").value = "");
  updateCount();
}

// ── 검색 실행 ──────────────────────────────────
function search(query) {
  clearHighlights();
  matches = [];
  currentIdx = -1;

  if (!query) {
    updateCount();
    return;
  }

  const reader = document.getElementById("reader");
  if (!reader) return;

  // 텍스트 노드를 순회하며 검색어 하이라이트
  highlightText(reader, query);

  matches = Array.from(document.querySelectorAll("mark.search-highlight"));
  updateCount();

  if (matches.length > 0) navigate(1);
}

// ── 텍스트 노드 하이라이트 ─────────────────────
function highlightText(root, query) {
  const lowerQuery = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodesToReplace = [];

  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent.toLowerCase().includes(lowerQuery)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach((textNode) => {
    const parent = textNode.parentNode;
    if (!parent || parent.tagName === "MARK") return;

    const text = textNode.textContent;
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let idx = lower.indexOf(lowerQuery);

    while (idx !== -1) {
      // 검색어 앞 텍스트
      if (idx > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
      }
      // 하이라이트 마크
      const mark = document.createElement("mark");
      mark.className = "search-highlight";
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);

      lastIdx = idx + query.length;
      idx = lower.indexOf(lowerQuery, lastIdx);
    }

    // 나머지 텍스트
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    parent.replaceChild(frag, textNode);
  });
}

// ── 이전 / 다음 이동 ───────────────────────────
function navigate(dir) {
  if (matches.length === 0) return;

  // 현재 활성 해제
  if (currentIdx >= 0 && matches[currentIdx]) {
    matches[currentIdx].classList.remove("current");
  }

  currentIdx = (currentIdx + dir + matches.length) % matches.length;

  const current = matches[currentIdx];
  if (!current) return;

  current.classList.add("current");
  updateCount();

  // 스크롤로 이동
  current.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── 하이라이트 전체 제거 ───────────────────────
function clearHighlights() {
  document.querySelectorAll("mark.search-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize(); // 인접 텍스트 노드 병합
  });
}

// ── 검색 결과 카운트 표시 ─────────────────────
function updateCount() {
  const el = document.getElementById("search-count");
  if (!el) return;

  if (matches.length === 0) {
    el.textContent = lastQuery ? "없음" : "";
  } else {
    el.textContent = `${currentIdx + 1} / ${matches.length}`;
  }
}
