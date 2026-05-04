// ════════════════════════════════════
// parser.js — 파일 업로드 · 인코딩 감지 · 챕터 파싱
// ════════════════════════════════════

// ── 챕터 구분 패턴 ─────────────────────────────
// 아래 패턴 중 하나라도 매칭되면 챕터 제목으로 인식
const CHAPTER_PATTERNS = [
  /^제\s*\d+\s*[장화편권]/, // 제1장, 제 2화, 제3편
  /^chapter\s*\d+/i, // Chapter 1, CHAPTER 2
  /^\d+\s*[장화편]/, // 1장, 2화, 3편
  /^[一二三四五六七八九十百千]+[장화편]/, // 한자 숫자
  /^={3,}/, // === 구분선
  /^-{5,}/, // ----- 구분선
  /^\*{3,}/, // *** 구분선
  /^\[.{1,30}\]$/, // [챕터명] 형식
  /^<.{1,30}>$/, // <챕터명> 형식
  /^프롤로그|에필로그|후기|작가의\s*말/, // 특수 챕터
];

// ── 파일 업로드 초기화 ─────────────────────────
export function initParser({ onBookLoaded }) {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  if (!dropZone || !fileInput) return;

  // 클릭으로 파일 선택
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, onBookLoaded);
    fileInput.value = ""; // 같은 파일 재업로드 허용
  });

  // 드래그 앤 드롭
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
// UTF-8 → EUC-KR 순서로 시도, 깨짐 감지 후 전환
async function readFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();

  // UTF-8 먼저 시도
  const utf8Text = new TextDecoder("utf-8", { fatal: true });
  try {
    return utf8Text.decode(buffer);
  } catch {
    // UTF-8 실패 → EUC-KR 시도
  }

  // EUC-KR 시도
  try {
    const euckrText = new TextDecoder("euc-kr", { fatal: true });
    return euckrText.decode(buffer);
  } catch {
    // 둘 다 실패 → 강제 UTF-8 (깨진 글자 허용)
    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }
}

// ── 챕터 파싱 ──────────────────────────────────
export function parseChapters(text) {
  const lines = text.split(/\r?\n/);
  const chapters = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isChapterTitle(trimmed)) {
      // 이전 챕터 저장
      if (current) chapters.push(finishChapter(current));

      // 새 챕터 시작
      current = {
        index: chapters.length,
        title: cleanTitle(trimmed),
        lines: [],
      };
    } else {
      if (!current) {
        // 챕터 구분 없는 파일 — 전체를 1챕터로
        current = { index: 0, title: "본문", lines: [] };
      }
      current.lines.push(line);
    }
  }

  // 마지막 챕터 저장
  if (current) chapters.push(finishChapter(current));

  // 챕터가 1개고 제목이 "본문"이면 파일명으로 교체 (나중에 viewer에서 처리)
  return chapters.length > 0
    ? chapters
    : [{ index: 0, title: "본문", content: text, charCount: text.length }];
}

// ── 챕터 타이틀 판별 ───────────────────────────
function isChapterTitle(line) {
  if (!line || line.length > 60) return false; // 너무 긴 줄은 제외
  return CHAPTER_PATTERNS.some((pattern) => pattern.test(line));
}

// ── 챕터 제목 정리 ────────────────────────────
function cleanTitle(title) {
  // 구분선 패턴이면 빈 구분 제목으로
  if (/^[=\-*]{3,}$/.test(title)) return "─────";
  return title;
}

// ── 챕터 마무리 ───────────────────────────────
function finishChapter(chapter) {
  // 앞뒤 빈 줄 제거
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
// 파일명 + 크기 조합으로 고유 ID 생성
// 같은 소설이면 항상 같은 ID → Firestore에서 찾을 수 있음
async function generateBookId(file) {
  const raw = `${file.name}-${file.size}`;
  const buffer = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 24); // 24자리로 자름
}

// ── 에러 표시 ─────────────────────────────────
function showParserError(msg) {
  // toast가 아직 없을 수 있으니 alert fallback
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
