/**
 * weather.js - 기상청 단기예보 API 연동 모듈
 * 관광 플랫폼 공통 날씨 + 대기시간 예측 보정
 * 위치: 경기도 오산시 (한신대학교) → 격자 X:60, Y:120
 */

const WEATHER_CONFIG = {
  API_KEY: "93451d0038180d1ef65e16c1b3107cdcb2bbe287d768628a558a1cfb2bb3d6f7",
  NX: 60,   // 오산시 격자 X
  NY: 120,  // 오산시 격자 Y
  BASE_URL: "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
};

// 날씨 코드 → 아이콘 & 텍스트 변환
const WEATHER_MAP = {
  "맑음":     { icon: "☀️", label: "맑음",     waitMod: +15 },
  "구름많음":  { icon: "⛅", label: "구름많음",  waitMod: +5  },
  "흐림":     { icon: "☁️", label: "흐림",     waitMod: -5  },
  "비":       { icon: "🌧️", label: "비",       waitMod: -20 },
  "눈":       { icon: "❄️", label: "눈",       waitMod: -25 },
  "비/눈":    { icon: "🌨️", label: "비/눈",   waitMod: -22 },
  "소나기":   { icon: "🌦️", label: "소나기",   waitMod: -15 },
};

// PTY(강수형태) 코드 → 날씨 이름
function ptyToWeather(pty, sky) {
  if (pty === "1") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (pty === "4") return "소나기";
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  return "맑음";
}

// 현재 시각 기준 basetime 계산 (기상청은 매 정시 발표)
function getBaseDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  // 초단기실황은 현재 시각 기준 가장 가까운 정시
  let hour = now.getHours();
  const min = now.getMinutes();
  if (min < 10) hour = hour === 0 ? 23 : hour - 1;
  const baseDate = `${year}${month}${day}`;
  const baseTime = `${String(hour).padStart(2, "0")}00`;
  return { baseDate, baseTime };
}

// 요일별 대기시간 보정 (%)
function getDayModifier() {
  const day = new Date().getDay(); // 0=일, 6=토
  const modifiers = {
    0: +20, // 일요일 - 가장 붐빔
    1: -10, // 월요일
    2: -10, // 화요일
    3: -5,  // 수요일
    4: 0,   // 목요일
    5: +15, // 금요일
    6: +25, // 토요일 - 최고 붐빔
  };
  return modifiers[day] ?? 0;
}

// 시간대별 대기시간 보정 (%)
function getTimeModifier() {
  const hour = new Date().getHours();
  if (hour >= 11 && hour <= 13) return +30; // 점심 피크
  if (hour >= 17 && hour <= 19) return +25; // 저녁 피크
  if (hour >= 14 && hour <= 16) return +10; // 오후
  if (hour >= 20 && hour <= 21) return +5;  // 저녁 이후
  return 0;
}

/**
 * 핵심 함수: 날씨 데이터 가져오기
 * @returns {Promise<{weather, icon, temp, label, waitMod, dayMod, timeMod}>}
 */
async function fetchWeather() {
  const { baseDate, baseTime } = getBaseDateTime();
  const params = new URLSearchParams({
    serviceKey: WEATHER_CONFIG.API_KEY,
    numOfRows: "10",
    pageNo: "1",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: WEATHER_CONFIG.NX,
    ny: WEATHER_CONFIG.NY,
  });

  try {
    const res = await fetch(`${WEATHER_CONFIG.BASE_URL}?${params}`);
    const data = await res.json();
    const items = data?.response?.body?.items?.item ?? [];

    let temp = "--";
    let pty = "0";
    let sky = "1";

    items.forEach((item) => {
      if (item.category === "T1H") temp = item.obsrValue + "°C";
      if (item.category === "PTY") pty = item.obsrValue;
      if (item.category === "SKY") sky = item.obsrValue;
    });

    const weatherName = ptyToWeather(pty, sky);
    const weatherInfo = WEATHER_MAP[weatherName] ?? WEATHER_MAP["맑음"];

    return {
      weather: weatherName,
      icon: weatherInfo.icon,
      label: weatherInfo.label,
      temp,
      waitMod: weatherInfo.waitMod,   // 날씨 보정 (%)
      dayMod: getDayModifier(),         // 요일 보정 (%)
      timeMod: getTimeModifier(),       // 시간 보정 (%)
    };
  } catch (err) {
    console.error("기상청 API 오류:", err);
    return {
      weather: "맑음",
      icon: "☀️",
      label: "맑음",
      temp: "--",
      waitMod: 0,
      dayMod: getDayModifier(),
      timeMod: getTimeModifier(),
    };
  }
}

/**
 * 대기시간 최종 예측
 * @param {number} baseWait - 기본 대기시간 (분)
 * @returns {Promise<{finalWait, breakdown}>}
 */
async function predictWaitTime(baseWait) {
  const w = await fetchWeather();
  const total = w.waitMod + w.dayMod + w.timeMod;
  const finalWait = Math.max(1, Math.round(baseWait * (1 + total / 100)));

  return {
    finalWait,
    weatherInfo: w,
    breakdown: {
      base: baseWait,
      weatherMod: w.waitMod,
      dayMod: w.dayMod,
      timeMod: w.timeMod,
      total: finalWait,
    },
  };
}

/**
 * UI 헬퍼: 날씨 위젯 HTML 생성 후 지정 요소에 삽입
 * @param {string} targetSelector - 삽입할 CSS 셀렉터 (예: "#weather-widget")
 */
async function renderWeatherWidget(targetSelector) {
  const el = document.querySelector(targetSelector);
  if (!el) return;

  el.innerHTML = `<span style="opacity:0.5">날씨 불러오는 중...</span>`;

  const w = await fetchWeather();

  el.innerHTML = `
    <div class="weather-widget" style="
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 14px;
      color: inherit;
    ">
      <span style="font-size:20px">${w.icon}</span>
      <span><strong>${w.temp}</strong></span>
      <span style="opacity:0.8">${w.label}</span>
    </div>
  `;
}

/**
 * UI 헬퍼: 대기시간 예측 결과를 지정 요소에 렌더링
 * @param {string} targetSelector - 삽입할 CSS 셀렉터
 * @param {number} baseWait - 기본 대기시간 (분)
 */
async function renderWaitPrediction(targetSelector, baseWait) {
  const el = document.querySelector(targetSelector);
  if (!el) return;

  el.innerHTML = `<span style="opacity:0.5">예측 중...</span>`;

  const { finalWait, weatherInfo, breakdown } = await predictWaitTime(baseWait);

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const today = dayNames[new Date().getDay()];

  el.innerHTML = `
    <div class="wait-prediction" style="
      background: linear-gradient(135deg, #667eea22, #764ba222);
      border: 1px solid #667eea44;
      border-radius: 16px;
      padding: 16px 20px;
      font-family: inherit;
    ">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <span style="font-size:28px">${weatherInfo.icon}</span>
        <div>
          <div style="font-size:22px; font-weight:700; color:#667eea">
            약 ${finalWait}분
          </div>
          <div style="font-size:12px; opacity:0.7">현재 예상 대기시간</div>
        </div>
      </div>
      <div style="font-size:12px; opacity:0.65; display:flex; gap:12px; flex-wrap:wrap;">
        <span>🌡️ ${weatherInfo.temp}</span>
        <span>📅 ${today}요일 ${breakdown.dayMod > 0 ? "+" : ""}${breakdown.dayMod}%</span>
        <span>⏰ 시간대 ${breakdown.timeMod > 0 ? "+" : ""}${breakdown.timeMod}%</span>
        <span>${weatherInfo.icon} 날씨 ${breakdown.weatherMod > 0 ? "+" : ""}${breakdown.weatherMod}%</span>
      </div>
    </div>
  `;
}

// 전역 노출
window.WeatherAPI = {
  fetchWeather,
  predictWaitTime,
  renderWeatherWidget,
  renderWaitPrediction,
};