
// 로그인
window.login = function () {

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const role =
        document.getElementById("roleSelect").value;

    // 입력 확인
    if (!email || !password) {

        alert("이메일과 비밀번호를 입력해주세요!");
        return;
    }

    // 로그인 저장
    localStorage.setItem(
        "role",
        role
    );

    localStorage.setItem(
        "userEmail",
        email
    );

    // 로그인 성공
    alert("🎉 로그인 성공!");

    // 메인 이동
    location.href = "index.html";
}

