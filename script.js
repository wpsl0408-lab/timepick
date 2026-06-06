import { db } from './firebase.js';
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====================================
// 전역 데이터
// ====================================
let restaurants = [
  {
    name: "맘스터치 한신대점",
    searchKeyword: "맘스터치 오산 한신대",   // 카카오맵 검색어
    category: "패스트푸드",
    rating: 4.8,
    wait: 15,
    lat: 37.1924,   // 카카오맵 로드 전 임시 좌표 (한신대 중심)
    lng: 127.0251,
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd"
  },
  {
    name: "이삭토스트 한신대점",
    searchKeyword: "이삭토스트 오산 한신대",
    category: "토스트",
    rating: 4.6,
    wait: 5,
    lat: 37.1924,
    lng: 127.0251,
    img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af"
  },
  {
    name: "우리반점",
    searchKeyword: "우리반점 오산 양산동",
    category: "중식",
    rating: 4.5,
    wait: 28,
    lat: 37.1924,
    lng: 127.0251,
    img: "https://images.unsplash.com/photo-1585032226651-759b368d7246"
  }
];

let map;
let currentPoints = 1200;

// ====================================
// 시작
// ====================================
window.onload = async function () {
  await loadRestaurants();
  showList();
  // 카카오맵 SDK 로드 대기 후 지도 초기화
  waitForKakao(loadMainMap);

  if (document.getElementById("name")) {
    loadDetail();
  }

  const role = localStorage.getItem("role");
  const ownerBtn = document.getElementById("ownerBtn");
  if (role === "owner" && ownerBtn) ownerBtn.style.display = "block";
}

// 카카오맵 SDK 로드 대기
function waitForKakao(callback) {
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    callback();
  } else {
    setTimeout(() => waitForKakao(callback), 200);
  }
}

// ====================================
// Firebase 데이터 가져오기
// ====================================
async function loadRestaurants() {
  try {
    const querySnapshot = await getDocs(collection(db, "restaurants"));
    const firebaseRestaurants = [];
    querySnapshot.forEach((doc) => {
      firebaseRestaurants.push({ id: doc.id, ...doc.data() });
    });
    if (firebaseRestaurants.length > 0) {
      restaurants = firebaseRestaurants;
    }
  } catch (error) {
    console.error("Firebase 오류:", error);
  }
}

// ====================================
// 메인 리스트 출력
// ====================================
function showList() {
  const listContainer = document.getElementById("list");
  if (!listContainer) return;

  let html = "";
  restaurants.forEach((r, i) => {
    let crowdText = "", crowdColor = "";
    if (r.wait <= 10)       { crowdText = "🟢 여유"; crowdColor = "#10b981"; }
    else if (r.wait <= 25)  { crowdText = "🟡 보통"; crowdColor = "#f59e0b"; }
    else                     { crowdText = "🔴 혼잡"; crowdColor = "#ef4444"; }

    html += `
    <div class="card" onclick="goDetail(${i})">
      <img src="${r.img}" class="food-img">
      <h3>${r.name}</h3>
      <p style="font-size:13px; color:#64748b; margin:5px 0;">${r.category}</p>
      <p style="color:#f59e0b; font-size:14px; font-weight:bold;">⭐ ${r.rating}</p>
      <p style="color:#ef4444; font-size:14px; font-weight:bold; margin-top:8px;">⏳ 현재 대기: ${r.wait}분</p>
      <p style="color:${crowdColor}; font-size:13px; font-weight:bold; margin-top:5px;">${crowdText}</p>
      <p style="font-size:12px; color:#64748b; margin-top:5px;">👥 현재 ${Math.floor(Math.random()*20)+1}명 이용 중</p>
      <span style="display:inline-block; margin-top:10px; background:#FF5A00; color:white; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:bold;">🔥 인기 맛집</span>
    </div>`;
  });

  listContainer.innerHTML = html;
}

// ====================================
// 상세페이지 이동
// ====================================
window.goDetail = function(index) {
  localStorage.setItem("selected", index);
  localStorage.setItem("selectedStore", JSON.stringify(restaurants[index]));
  location.href = "detail.html";
}

// ====================================
// 상세페이지 출력
// ====================================
function loadDetail() {
  const index = localStorage.getItem("selected") || 0;
  const r = restaurants[index];
  if (!r) return;
  document.getElementById("name").innerText = r.name;
  document.getElementById("info").innerText = `${r.category} | ⭐ ${r.rating}`;
  document.getElementById("wait").innerText = r.wait;
  if (document.getElementById("detailImg")) document.getElementById("detailImg").src = r.img;
}

// ====================================
// 메인 지도 - 카카오 키워드 검색으로 정확한 좌표 자동 설정
// ====================================
function loadMainMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // 한신대 중심으로 지도 생성
  const center = new kakao.maps.LatLng(37.1924, 127.0251);
  map = new kakao.maps.Map(mapContainer, { center, level: 4 });

  const ps = new kakao.maps.services.Places();

  // 식당마다 키워드 검색해서 실제 좌표로 마커 찍기
  restaurants.forEach((r, i) => {
    const keyword = r.searchKeyword || r.name + " 오산";

    ps.keywordSearch(keyword, function(data, status) {
      let pos;

      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        // 검색 성공 → 실제 좌표 사용
        pos = new kakao.maps.LatLng(data[0].y, data[0].x);
        // 좌표를 restaurants 배열에도 업데이트
        restaurants[i].lat = parseFloat(data[0].y);
        restaurants[i].lng = parseFloat(data[0].x);
        console.log(`✅ ${r.name} 좌표 찾음:`, data[0].y, data[0].x);
      } else {
        // 검색 실패 → 기존 좌표 사용
        pos = new kakao.maps.LatLng(r.lat, r.lng);
        console.warn(`⚠️ ${r.name} 좌표 검색 실패, 기본 좌표 사용`);
      }

      // 마커 생성
      const marker = new kakao.maps.Marker({ map, position: pos, title: r.name });

      // 말풍선 (항상 표시)
      const infowindow = new kakao.maps.InfoWindow({
        content: `
          <div style="
            padding:7px 11px;
            font-size:12px;
            font-weight:bold;
            color:#1e293b;
            white-space:nowrap;
            line-height:1.5;
          ">
            🍽 ${r.name}<br>
            <span style="color:#FF5A00; font-size:11px; font-weight:normal;">⏳ ${r.wait}분 대기</span>
          </div>
        `,
        removable: false
      });
      infowindow.open(map, marker);

      // ✅ 마커 클릭 → 하단 카드 표시 + detail.html 이동
      kakao.maps.event.addListener(marker, 'click', function() {
        showStoreCard(r, i);
      });
    });
  });

  // 지도 빈 곳 클릭 → 하단 카드 숨기기
  kakao.maps.event.addListener(map, 'click', function() {
    const card = document.getElementById("selectedStore");
    if (card) card.style.display = "none";
  });
}

// ====================================
// 하단 식당 카드 표시 (날씨 연동)
// ====================================
function showStoreCard(r, i) {
  const card = document.getElementById("selectedStore");
  if (!card) return;

  card.style.display = "flex";
  document.getElementById("storeImg").src = r.img;
  document.getElementById("storeName").innerText = r.name;
  document.getElementById("storeWait").innerText = `현재 대기 ${r.wait}분`;

  // 날씨 보정 대기시간
  const adjustedEl = document.getElementById("storeWaitAdjusted");
  if (adjustedEl && window.WeatherAPI) {
    adjustedEl.innerText = "날씨 반영 예측 중...";
    WeatherAPI.predictWaitTime(r.wait).then(({ finalWait, weatherInfo }) => {
      adjustedEl.innerText = `${weatherInfo.icon} 날씨·요일 반영: 약 ${finalWait}분`;
    });
  }

  // 카드 클릭 → detail.html 이동
  card.onclick = function() {
    localStorage.setItem("selected", i);
    localStorage.setItem("selectedStore", JSON.stringify(r));
    location.href = "detail.html";
  };

  // 웨이팅 버튼 클릭 (카드 이동과 분리)
  const waitBtn = card.querySelector("button");
  if (waitBtn) {
    waitBtn.onclick = function(e) {
      e.stopPropagation();
      localStorage.setItem("selected", i);
      localStorage.setItem("selectedStore", JSON.stringify(r));
      openWaitingModal(r);
    };
  }
}

// ====================================
// 웨이팅 모달
// ====================================
window.goWaiting = function() {
  const storeData = localStorage.getItem("selectedStore");
  const r = storeData ? JSON.parse(storeData) : restaurants[0];
  openWaitingModal(r);
}

function openWaitingModal(r) {
  let modal = document.getElementById("waitingModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "waitingModal";
    modal.style.cssText = `
      display:none; position:fixed; top:0; left:0;
      width:100%; height:100%; background:rgba(0,0,0,0.6);
      z-index:2000; justify-content:center; align-items:flex-end;
    `;
    document.body.appendChild(modal);
  }

  const waitTime = r.wait || 15;
  modal.innerHTML = `
    <div style="
      background:white; width:100%; max-width:430px;
      border-radius:24px 24px 0 0; padding:24px 20px;
      animation:slideUp 0.3s ease;
    ">
      <div style="width:40px; height:4px; background:#e2e8f0; border-radius:2px; margin:0 auto 16px;"></div>
      <span onclick="closeWaitingModal()" style="float:right; font-size:24px; cursor:pointer; color:#94a3b8;">×</span>
      <div style="text-align:center; margin-bottom:16px;">
        <div style="font-size:40px; margin-bottom:8px;">🍽️</div>
        <h3 style="color:#2D4B9B; font-size:17px;">${r.name}</h3>
        <p style="font-size:13px; color:#64748b;">${r.category}</p>
      </div>
      <div style="background:#fff7ed; border-radius:14px; padding:16px; text-align:center; margin-bottom:16px;">
        <p style="font-size:12px; color:#64748b; margin-bottom:4px;">현재 예상 대기시간</p>
        <p style="font-size:38px; font-weight:800; color:#FF5A00;" id="waitModalTime">${waitTime}분</p>
        <p style="font-size:12px; color:#4A90E2;" id="waitModalAdjusted">날씨 반영 계산 중...</p>
      </div>
      <div style="background:#f8fafc; border-radius:12px; padding:14px; margin-bottom:16px; font-size:13px; color:#475569; line-height:1.7;">
        📋 순서가 되면 알림을 보내드려요<br>
        ✅ 웨이팅 완료 후 리뷰 작성 시 <strong style="color:#FF5A00;">300P</strong> 적립
      </div>
      <button onclick="confirmWaiting('${r.name}')" style="
        width:100%; background:#FF5A00; color:white; border:none;
        border-radius:14px; padding:15px; font-size:16px; font-weight:800; cursor:pointer;
      ">✅ 웨이팅 등록하기</button>
    </div>
  `;

  if (!document.getElementById("slideUpStyle")) {
    const s = document.createElement("style"); s.id = "slideUpStyle";
    s.textContent = `@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`;
    document.head.appendChild(s);
  }

  modal.style.display = "flex";

  if (window.WeatherAPI) {
    WeatherAPI.predictWaitTime(waitTime).then(({ finalWait, weatherInfo }) => {
      const adj = document.getElementById("waitModalAdjusted");
      if (adj) adj.textContent = `${weatherInfo.icon} 날씨·요일 반영: 약 ${finalWait}분 예상`;
    });
  }
}

window.closeWaitingModal = function() {
  const modal = document.getElementById("waitingModal");
  if (modal) modal.style.display = "none";
}

window.confirmWaiting = function(name) {
  closeWaitingModal();
  showToast(`🎉 ${name} 웨이팅이 등록되었습니다!`);
}

// ====================================
// 리뷰 모달
// ====================================
window.openInput = function() {
  document.getElementById("reviewModal").style.display = "block";
}
window.closeModal = function() {
  document.getElementById("reviewModal").style.display = "none";
}
window.submitReview = function() {
  const inputs = document.querySelectorAll("#reviewModal input[type='number']");
  const radios1 = document.querySelectorAll("input[name='state']:checked");
  const radios2 = document.querySelectorAll("input[name='crowd']:checked");
  if (!inputs[0]?.value || radios1.length === 0 || radios2.length === 0) {
    showToast("⚠️ 모든 항목을 입력해주세요!"); return;
  }
  closeModal();
  currentPoints += 300;
  showPointAnimation(300);
  updatePointDisplay();
}

// ====================================
// 포인트 표시 업데이트
// ====================================
function updatePointDisplay() {
  document.querySelectorAll("[onclick='openShop()']").forEach(el => {
    el.innerHTML = `💰 내 포인트: ${currentPoints.toLocaleString()}P`;
  });
}

// ====================================
// 지역 검색
// ====================================
window.searchLocation = function() {
  const keyword = document.getElementById("locationInput").value;
  if (!keyword) { alert("지역명을 입력해주세요!"); return; }
  const ps = new kakao.maps.services.Places();
  ps.keywordSearch(keyword, function(data, status) {
    if (status === kakao.maps.services.Status.OK) {
      map.setCenter(new kakao.maps.LatLng(data[0].y, data[0].x));
      map.setLevel(3);
    } else {
      alert("검색 결과가 없습니다.");
    }
  });
}

// ====================================
// 현재 위치
// ====================================
window.getCurrentLocation = function() {
  if (!navigator.geolocation) { alert("현재 위치를 지원하지 않습니다."); return; }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      map.setCenter(latlng);
      new kakao.maps.Marker({ position: latlng, map });
      showToast("📍 현재 위치로 이동했습니다!");
    },
    function() { alert("위치 권한을 허용해주세요!"); }
  );
}

// ====================================
// 정렬
// ====================================
window.sortByWait = function() {
  restaurants.sort((a, b) => a.wait - b.wait);
  showList();
  showToast("✅ 대기시간 짧은 순으로 정렬됐어요!");
}

// ====================================
// 리워드 샵
// ====================================
window.openShop = function() {
  const modal = document.getElementById("shopModal");
  if (modal) modal.style.display = "flex";
}
window.closeShop = function() {
  const modal = document.getElementById("shopModal");
  if (modal) modal.style.display = "none";
}
window.buyItem = function(itemName, cost) {
  if (currentPoints < cost) {
    showToast(`⚠️ 포인트가 부족해요! (보유: ${currentPoints}P)`); return;
  }
  currentPoints -= cost;
  updatePointDisplay();
  closeShop();
  showToast(`🎁 ${itemName} 교환권이 발급됐어요!`);
  showPointAnimation(-cost);
}

// ====================================
// 포인트 애니메이션
// ====================================
function showPointAnimation(points) {
  const el = document.createElement("div");
  el.textContent = points > 0 ? `+${points}P 적립! 🎉` : `${points}P 사용`;
  el.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${points > 0 ? '#FF5A00' : '#64748b'};
    color:white; padding:12px 28px; border-radius:30px;
    font-size:18px; font-weight:800; z-index:9999; pointer-events:none;
    box-shadow:0 4px 20px rgba(255,90,0,0.4);
    animation:pointUp 1.8s ease forwards;
  `;
  if (!document.getElementById("pointAnimStyle")) {
    const s = document.createElement("style"); s.id = "pointAnimStyle";
    s.textContent = `@keyframes pointUp {
      0%{opacity:1;transform:translateX(-50%) translateY(0)}
      70%{opacity:1;transform:translateX(-50%) translateY(-40px)}
      100%{opacity:0;transform:translateX(-50%) translateY(-60px)}
    }`;
    document.head.appendChild(s);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ====================================
// 토스트 메시지
// ====================================
function showToast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#1e293b; color:white; padding:12px 24px;
    border-radius:30px; font-size:14px; font-weight:700;
    z-index:9999; white-space:nowrap; pointer-events:none;
    animation:fadeInOut 2.5s ease forwards;
  `;
  if (!document.getElementById("toastAnimStyle")) {
    const s = document.createElement("style"); s.id = "toastAnimStyle";
    s.textContent = `@keyframes fadeInOut {
      0%{opacity:0;transform:translateX(-50%) translateY(10px)}
      15%{opacity:1;transform:translateX(-50%) translateY(0)}
      75%{opacity:1} 100%{opacity:0}
    }`;
    document.head.appendChild(s);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}