// ════════════════════════════════════
// settings.js — 테마 · 폰트 · 글자 크기 · 줄간격
// 경로: src/js/settings.js
// ════════════════════════════════════

const STORAGE_KEY = "reader-settings";

// 기본값
const DEFAULTS = {
  theme: "dark",
  font: "serif",
  fontSize: 18,
  lineHeight: 1.9,
  maxWidth: 680,
};

// ── 설정 초기화 ────────────────────────────────
export function initSettings() {
  const saved = loadSettings();
  const settings = { ...DEFAULTS, ...saved };

  // 저장된 설정 적용
  applyTheme(settings.theme);
  applyFont(settings.font);
  applyFontSize(settings.fontSize);
  applyLineHeight(settings.lineHeight);
  applyMaxWidth(settings.maxWidth);

  // 슬라이더 · 버튼 초기값 세팅
  setSliderValue("font-size-slider", "font-size-val", settings.fontSize, "px");
  setSliderValue(
    "line-height-slider",
    "line-height-val",
    settings.lineHeight,
    "",
  );
  setSliderValue("max-width-slider", "max-width-val", settings.maxWidth, "px");
  setActiveBtn(".theme-btns .theme-btn", settings.theme);
  setActiveBtn(".font-btns .font-btn", settings.font);

  // 이벤트 등록
  bindThemeBtns();
  bindFontBtns();
  bindSlider("font-size-slider", "font-size-val", "px", (v) =>
    applyFontSize(v),
  );
  bindSlider("line-height-slider", "line-height-val", "", (v) =>
    applyLineHeight(v),
  );
  bindSlider("max-width-slider", "max-width-val", "px", (v) =>
    applyMaxWidth(v),
  );
}

// ── 테마 ───────────────────────────────────────
function bindThemeBtns() {
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      setActiveBtn(".theme-btns .theme-btn", theme);
      saveSetting("theme", theme);
    });
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  // PWA 테마 컬러 업데이트
  const themeColors = { dark: "#0e0d0b", light: "#f8f6f2", sepia: "#f5efe3" };
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColors[theme] ?? "#0e0d0b");
}

// ── 폰트 ───────────────────────────────────────
function bindFontBtns() {
  document.querySelectorAll(".font-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const font = btn.dataset.font;
      applyFont(font);
      setActiveBtn(".font-btns .font-btn", font);
      saveSetting("font", font);
    });
  });
}

function applyFont(font) {
  const fontMap = {
    serif: "'Gowun Batang', 'Noto Serif KR', serif",
    sans: "'Noto Sans KR', sans-serif",
    mono: "'DM Mono', 'Courier New', monospace",
  };
  document
    .getElementById("reader")
    ?.style.setProperty("font-family", fontMap[font] ?? fontMap.serif);
  // CSS 변수로도 설정 (reader 없을 때 대비)
  document.documentElement.style.setProperty(
    "--reader-font",
    fontMap[font] ?? fontMap.serif,
  );
}

// ── 글자 크기 ──────────────────────────────────
function applyFontSize(size) {
  const px = `${size}px`;
  document.getElementById("reader")?.style.setProperty("font-size", px);
  document.documentElement.style.setProperty("--reader-font-size", px);
}

// ── 줄간격 ─────────────────────────────────────
function applyLineHeight(value) {
  document.getElementById("reader")?.style.setProperty("line-height", value);
  document.documentElement.style.setProperty("--reader-line-height", value);
}

// ── 텍스트 최대 너비 ───────────────────────────
function applyMaxWidth(width) {
  const px = `${width}px`;
  document.getElementById("reader")?.style.setProperty("max-width", px);
  document.documentElement.style.setProperty("--reader-max-width", px);
}

// ── 슬라이더 바인딩 ────────────────────────────
function bindSlider(sliderId, valId, unit, applyFn) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;

  slider.addEventListener("input", () => {
    const value = parseFloat(slider.value);
    const valEl = document.getElementById(valId);
    if (valEl) valEl.textContent = `${value}${unit}`;
    applyFn(value);

    // 설정 저장 (debounce)
    clearTimeout(slider._saveTimer);
    slider._saveTimer = setTimeout(() => {
      saveSetting(sliderId.replace("-slider", "").replace("-", ""), value);
    }, 500);
  });
}

// ── 유틸 ───────────────────────────────────────
function setSliderValue(sliderId, valId, value, unit) {
  const slider = document.getElementById(sliderId);
  const valEl = document.getElementById(valId);
  if (slider) slider.value = value;
  if (valEl) valEl.textContent = `${value}${unit}`;
}

function setActiveBtn(selector, value) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.theme === value || btn.dataset.font === value,
    );
  });
}

// ── localStorage 저장·불러오기 ─────────────────
function saveSetting(key, value) {
  const current = loadSettings();
  current[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// ── 설정 초기화 (외부 버튼에서 호출) ──────────────
export function resetSettings() {
  localStorage.removeItem(STORAGE_KEY);

  applyFont(DEFAULTS.font);
  applyFontSize(DEFAULTS.fontSize);
  applyLineHeight(DEFAULTS.lineHeight);
  applyMaxWidth(DEFAULTS.maxWidth);

  setSliderValue("font-size-slider", "font-size-val", DEFAULTS.fontSize, "px");
  setSliderValue(
    "line-height-slider",
    "line-height-val",
    DEFAULTS.lineHeight,
    "",
  );
  setSliderValue("max-width-slider", "max-width-val", DEFAULTS.maxWidth, "px");
  setActiveBtn(".font-btns .font-btn", DEFAULTS.font);
}
