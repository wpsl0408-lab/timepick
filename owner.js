
// 대기시간 수정
function updateWait() {

    const wait =
        document.getElementById("waitInput").value;

    alert(`현재 대기시간 ${wait}분으로 수정 완료!`);
}

// 혼잡도 수정
function updateCrowd() {

    const crowd =
        document.getElementById("crowd").value;

    alert(`혼잡도가 '${crowd}' 상태로 변경되었습니다.`);
}

// 광고 저장
function saveAd() {

    const ad =
        document.getElementById("adText").value;

    alert(`광고 문구 저장 완료!\n\n${ad}`);
}

// 쿠폰 발행
function createCoupon() {

    const coupon =
        document.getElementById("coupon").value;

    alert(`🎉 '${coupon}' 쿠폰 발행 완료!`);
}

