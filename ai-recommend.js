// ====================================
// TimePick AI 맛집 추천 모듈
// Gemini API 연동
// ====================================

const GEMINI_API_KEY = "AIzaSyDhc6FFPXqjcbKYUIDIoLp7rbKp23yTtJU";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// 식당 데이터 (script.js와 동일)
const RESTAURANTS = [
  { name: "맘스터치 한신대점", category: "패스트푸드", wait: 15, rating: 4.8 },
  { name: "이삭토스트 한신대점", category: "토스트", wait: 5, rating: 4.6 },
  { name: "우리반점", category: "중식", wait: 28, rating: 4.5 }
];

// ====================================
// AI 추천 요청
// ====================================
async function getAIRecommend() {
  const banner = document.getElementById("ai-banner");
  if (!banner) return;

  banner.innerHTML = `<span style="opacity:0.7">🤖 AI가 분석 중...</span>`;

  // 현재 상황 데이터 수집
  const hour = new Date().getHours();
  const dayNames = ["일","월","화","수","목","금","토"];
  const today = dayNames[new Date().getDay()];

  let timeSlot = "오전";
  if (hour >= 11 && hour <= 13) timeSlot = "점심시간";
  else if (hour >= 14 && hour <= 16) timeSlot = "오후";
  else if (hour >= 17 && hour <= 19) timeSlot = "저녁시간";
  else if (hour >= 20) timeSlot = "야간";

  // 날씨 정보
  let weatherText = "날씨 정보 없음";
  let weatherMod = 0;
  if (window.WeatherAPI) {
    try {
      const w = await WeatherAPI.fetchWeather();
      weatherText = `${w.label} ${w.temp}`;
      weatherMod = w.waitMod;
    } catch(e) {}
  }

  // 식당 정보 문자열 생성
  const restaurantInfo = RESTAURANTS.map(r => {
    const adjusted = Math.max(1, Math.round(r.wait * (1 + weatherMod/100)));
    return `- ${r.name} (${r.category}): 현재 대기 ${r.wait}분, 날씨 보정 후 약 ${adjusted}분, 평점 ${r.rating}`;
  }).join('\n');

  // Gemini 프롬프트
  const prompt = `당신은 한신대학교 근처 맛집을 추천하는 AI 어시스턴트입니다.
현재 상황을 분석해서 가장 좋은 식당 하나를 추천해주세요.

현재 상황:
- 시간대: ${today}요일 ${timeSlot} (${hour}시)
- 날씨: ${weatherText}
- 날씨 혼잡도 영향: ${weatherMod > 0 ? `+${weatherMod}%` : `${weatherMod}%`}

등록된 식당 목록:
${restaurantInfo}

조건:
- 반드시 1문장으로만 답변
- 추천 식당 이름 + 추천 이유 + 이모지 포함
- 예시: "🌧️ 비 오는 날 점심엔 실내에서 따뜻하게 이삭토스트 추천! 지금 대기 5분으로 가장 짧아요."
- 한국어로 답변`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
      })
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (text) {
      banner.innerHTML = `🤖 AI 추천: ${text}`;
    } else {
      banner.innerHTML = `🤖 AI 추천: 지금은 대기가 짧은 이삭토스트를 추천드려요! (${RESTAURANTS[1].wait}분)`;
    }
  } catch (err) {
    console.error("Gemini API 오류:", err);
    banner.innerHTML = `🤖 AI 추천: 현재 혼잡도가 낮은 "이삭토스트"를 추천합니다!`;
  }
}

// ====================================
// 페이지 로드 시 자동 실행
// ====================================
window.addEventListener("load", function() {
  // 날씨 로드 후 AI 추천 실행 (1.5초 대기)
  setTimeout(getAIRecommend, 1500);
});

// 전역 노출 (새로고침 버튼용)
window.getAIRecommend = getAIRecommend;