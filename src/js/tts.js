// ════════════════════════════════════
// tts.js — TTS 읽어주기 (Web Speech API)
// 경로: src/js/tts.js
// ════════════════════════════════════

import { showToast } from "./firebase.js";

// ── 상태 ───────────────────────────────────────
let synth = window.speechSynthesis;
let isPlaying = false;
let currentRate = 1.0;
let currentVoice = null;
let ttsPanel = null;
let activePara = null;

// ── TTS 지원 여부 확인 ─────────────────────────
export function isTTSSupported() {
  return "speechSynthesis" in window;
}

// ── 초기화 ─────────────────────────────────────
export function initTTS() {
  if (!isTTSSupported()) {
    showToast("이 브라우저는 TTS를 지원하지 않아요");
    return;
  }
  createTTSPanel();
  if (synth.getVoices().length > 0) {
    loadVoices();
  } else {
    synth.addEventListener("voiceschanged", loadVoices, { once: true });
  }
}

// ── TTS 패널 생성 ──────────────────────────────
function createTTSPanel() {
  if (document.getElementById("tts-panel")) return;

  ttsPanel = document.createElement("div");
  ttsPanel.id = "tts-panel";
  ttsPanel.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--bg-surface);
    border: 1px solid var(--border2);
    border-radius: 14px;
    padding: 14px 16px;
    z-index: 450;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 240px;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
  `;

  ttsPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:13px;font-weight:500;color:var(--text)">🔊 읽어주기</span>
      <button id="tts-close" style="color:var(--text-muted);background:none;border:none;cursor:pointer;font-size:14px;">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;">
      <label style="color:var(--text-muted);font-size:11px;">음성</label>
      <select id="tts-voice" style="background:var(--bg-surface2);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:11px;padding:5px 8px;cursor:pointer;outline:none;"></select>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;">
      <label style="color:var(--text-muted);font-size:11px;">속도 <span id="tts-rate-val">1.0x</span></label>
      <input type="range" id="tts-rate" min="0.5" max="2.0" step="0.1" value="1.0"
        style="width:100%;height:4px;-webkit-appearance:none;appearance:none;background:var(--border2);border-radius:2px;cursor:pointer;outline:none;"/>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;">
      <button id="tts-play" style="flex:1;padding:8px;border-radius:8px;background:var(--accent-dim);border:1px solid var(--accent);color:var(--accent);font-size:12px;font-weight:500;cursor:pointer;">▶ 재생</button>
      <button id="tts-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border2);color:var(--text-muted);font-size:12px;cursor:pointer;background:none;">■ 정지</button>
    </div>
  `;

  document.body.appendChild(ttsPanel);

  document.getElementById("tts-close")?.addEventListener("click", closeTTS);
  document.getElementById("tts-play")?.addEventListener("click", togglePlay);
  document.getElementById("tts-stop")?.addEventListener("click", stopTTS);

  document.getElementById("tts-rate")?.addEventListener("input", (e) => {
    currentRate = parseFloat(e.target.value);
    const label = document.getElementById("tts-rate-val");
    if (label) label.textContent = `${currentRate.toFixed(1)}x`;
    // 속도 변경 시 재시작
    if (isPlaying) {
      stopTTS();
      const text = document.getElementById("reader")?.innerText ?? "";
      setTimeout(() => startTTS(text), 50);
    }
  });

  document.getElementById("tts-voice")?.addEventListener("change", (e) => {
    currentVoice =
      synth.getVoices().find((v) => v.name === e.target.value) ?? null;
  });
}

// ── 음성 목록 로드 ─────────────────────────────
function loadVoices() {
  const voices = synth.getVoices();
  const select = document.getElementById("tts-voice");
  if (!select) return;

  select.innerHTML = "";

  const sorted = [
    ...voices.filter((v) => v.lang.startsWith("ko")),
    ...voices.filter((v) => !v.lang.startsWith("ko")),
  ];

  sorted.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    select.appendChild(opt);
  });

  currentVoice = sorted[0] ?? null;
}

// ── 재생/일시정지 토글 ────────────────────────
function togglePlay() {
  if (isPlaying) {
    pauseTTS();
  } else {
    const text = document.getElementById("reader")?.innerText ?? "";
    if (!text.trim()) {
      showToast("읽을 텍스트가 없어요");
      return;
    }
    startTTS(text);
  }
}

// ── TTS 시작 — 모든 청크를 미리 큐에 올림 ──────
// onstart 로 하이라이트 → 실제 음성 시작 순간에 정확히 동기화
function startTTS(text) {
  synth.cancel();

  const chunks = splitIntoChunks(text, 150);
  const paragraphs = Array.from(document.querySelectorAll("#reader p"));
  const total = chunks.length;

  isPlaying = true;
  updatePlayBtn();

  chunks.forEach((chunk, idx) => {
    // 이 청크가 속한 paragraph 미리 찾기
    const key = chunk.trim().slice(0, 20);
    const para = paragraphs.find((p) => p.textContent.includes(key)) ?? null;

    const utt = new SpeechSynthesisUtterance(chunk);
    utt.rate = currentRate;
    utt.lang = "ko-KR";
    if (currentVoice) utt.voice = currentVoice;

    // ★ onstart: 실제 음성 시작 순간에 하이라이트 + 스크롤
    utt.onstart = () => {
      if (!isPlaying) return;
      highlightPara(para);
    };

    // 마지막 청크 끝나면 정리
    utt.onend = () => {
      if (idx === total - 1) {
        clearHighlight();
        isPlaying = false;
        updatePlayBtn();
      }
    };

    utt.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      clearHighlight();
      isPlaying = false;
      updatePlayBtn();
    };

    synth.speak(utt);
  });
}

// ── paragraph 하이라이트 + 스크롤 ─────────────
function highlightPara(para) {
  clearHighlight();
  if (!para) return;

  para.style.background = "rgba(201,169,110,0.25)";
  para.style.borderRadius = "4px";
  activePara = para;

  // content-area 기준 offsetTop 계산
  const contentArea = document.getElementById("content-area");
  if (!contentArea) return;

  let top = 0;
  let el = para;
  while (el && el !== contentArea) {
    top += el.offsetTop;
    el = el.offsetParent;
  }

  contentArea.scrollTo({
    top: top - contentArea.clientHeight / 2 + para.offsetHeight / 2,
    behavior: "smooth",
  });
}

// ── 하이라이트 제거 ───────────────────────────
function clearHighlight() {
  if (!activePara) return;
  activePara.style.background = "";
  activePara.style.borderRadius = "";
  activePara = null;
}

// ── 청크 분리 ─────────────────────────────────
function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]?/g) ?? [text];
  const result = [];
  let current = "";

  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current) result.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result.filter(Boolean);
}

// ── 일시정지 ──────────────────────────────────
function pauseTTS() {
  synth.cancel();
  clearHighlight();
  isPlaying = false;
  updatePlayBtn();
}

// ── 정지 ──────────────────────────────────────
function stopTTS() {
  synth.cancel();
  clearHighlight();
  isPlaying = false;
  updatePlayBtn();
}

// ── 버튼 텍스트 업데이트 ──────────────────────
function updatePlayBtn() {
  const btn = document.getElementById("tts-play");
  if (btn) btn.textContent = isPlaying ? "⏸ 일시정지" : "▶ 재생";
}

// ── TTS 패널 닫기 ─────────────────────────────
function closeTTS() {
  stopTTS();
  ttsPanel?.remove();
  ttsPanel = null;
}

// ── 외부에서 TTS 열기/닫기 ────────────────────
export function openTTS() {
  if (!isTTSSupported()) {
    showToast("이 브라우저는 TTS를 지원하지 않아요");
    return;
  }
  if (!document.getElementById("tts-panel")) {
    initTTS();
  } else {
    ttsPanel?.remove();
    ttsPanel = null;
  }
}
