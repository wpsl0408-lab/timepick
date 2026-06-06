
// 이메일 가져오기
const email =
    localStorage.getItem("userEmail");

// 출력
document.getElementById(
    "userEmail"
).innerText = email;

// 로그아웃
function logout() {

    localStorage.clear();

    alert("로그아웃 되었습니다.");

    location.href = "login.html";
}


// 포인트 교환
function usePoint(point) {

    alert(
        `🎉 ${point.toLocaleString()}원 상품권으로 교환되었습니다!`
    );
}
