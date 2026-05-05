// ════════════════════════════════════
// parser.js — 파일 업로드 · 인코딩 감지 · 챕터 파싱
// 경로: src/js/parser.js
// ════════════════════════════════════

// ── 챕터 구분 패턴 ─────────────────────────────
const CHAPTER_PATTERNS = [
  /^\d+\s*화/, // 1화, 2화, 1 화
  /^제\s*\d+\s*[장화편권]/, // 제1장, 제 2화
  /^chapter\s*\d+/i, // Chapter 1
  /^\d+\s*[장편권]/, // 1장, 2편
  /^[一二三四五六七八九十百千]+[장화편]/, // 한자 숫자
  /^={3,}/, // === 구분선
  /^-{5,}/, // ----- 구분선
  /^\*{3,}/, // *** 구분선
  /^\[.{1,30}\]$/, // [챕터명]
  /^<.{1,30}>$/, // <챕터명>
  /^(프롤로그|에필로그|후기|작가의\s*말)/,
];

// ── 파일 업로드 초기화 ─────────────────────────
export function initParser({ onBookLoaded }) {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  if (!dropZone || !fileInput) return;

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, onBookLoaded);
    fileInput.value = "";
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".txt")) {
      showParserError("TXT 파일만 올릴 수 있어요.");
      return;
    }
    processFile(file, onBookLoaded);
  });
}

// ── 파일 처리 메인 ─────────────────────────────
async function processFile(file, onBookLoaded) {
  if (!file.name.endsWith(".txt")) {
    showParserError("TXT 파일만 올릴 수 있어요.");
    return;
  }

  try {
    const text = await readFileWithEncoding(file);
    const chapters = parseChapters(text);
    const bookId = await generateBookId(file);

    const book = {
      id: bookId,
      title: file.name.replace(/\.txt$/i, ""),
      totalChars: text.length,
      chapters,
      loadedAt: Date.now(),
    };

    onBookLoaded(book);
  } catch (err) {
    console.error("파일 처리 오류:", err);
    showParserError("파일을 읽는 중 오류가 발생했어요.");
  }
}

// ── 인코딩 자동 감지 ───────────────────────────
async function readFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {}

  try {
    return new TextDecoder("euc-kr", { fatal: true }).decode(buffer);
  } catch {}

  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

// ── 챕터 파싱 ──────────────────────────────────
export function parseChapters(text) {
  const lines = text.split(/\r?\n/);
  const chapters = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    // \r 포함 특수문자 제거 후 trim
    const trimmed = lines[i].replace(/\r/g, "").trim();

    if (isChapterTitle(trimmed)) {
      if (current) chapters.push(finishChapter(current));

      current = {
        index: chapters.length,
        title: cleanTitle(trimmed),
        lines: [],
      };
    } else {
      if (!current) {
        current = { index: 0, title: "본문", lines: [] };
      }
      current.lines.push(lines[i]);
    }
  }

  if (current) chapters.push(finishChapter(current));

  return chapters.length > 0
    ? chapters
    : [{ index: 0, title: "본문", content: text, charCount: text.length }];
}

// ── 챕터 타이틀 판별 ───────────────────────────
function isChapterTitle(line) {
  if (!line) return false;

  // 길이 제한 — 100자 이내
  if (line.length > 100) return false;

  // 패턴 매칭
  if (CHAPTER_PATTERNS.some((p) => p.test(line))) return true;

  // 추가: "N화 제목" 형식 — 숫자화 로 시작하는 모든 줄
  // ex) "1화 진짜 억울해 죽겠네!", "23화 귀환"
  if (/^\d+화/.test(line)) return true;

  return false;
}

// ── 챕터 제목 정리 ────────────────────────────
function cleanTitle(title) {
  if (/^[=\-*]{3,}$/.test(title)) return "─────";
  return title;
}

// ── 챕터 마무리 ───────────────────────────────
function finishChapter(chapter) {
  while (chapter.lines.length && !chapter.lines[0].trim())
    chapter.lines.shift();
  while (chapter.lines.length && !chapter.lines.at(-1).trim())
    chapter.lines.pop();

  const content = chapter.lines.join("\n");
  return {
    index: chapter.index,
    title: chapter.title,
    content,
    charCount: content.length,
  };
}

// ── 파일 해시 생성 (bookId) ────────────────────
async function generateBookId(file) {
  const raw = `${file.name}-${file.size}`;
  const buffer = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 24);
}

// ── 에러 표시 ─────────────────────────────────
function showParserError(msg) {
  const wrap = document.getElementById("toast-wrap");
  if (wrap) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  } else {
    alert(msg);
  }
}
