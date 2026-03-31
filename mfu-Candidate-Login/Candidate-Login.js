function login() {
    let id = document.getElementById("id").value;
    let pass = document.getElementById("pass").value;

    let candidates = JSON.parse(localStorage.getItem("candidates")) || [];

    let user = candidates.find(c =>
        c.candidateID === id && c.pass === pass
    );

    if (user) {
        // 🔥 สำคัญ: จำ user
        localStorage.setItem("currentCandidate", JSON.stringify({
            id: user.candidateID,
            cid: user.cid,
            laser: user.laser
        }));

        alert("Login สำเร็จ");

        // ไป Dashboard
        window.location.href = "../mfu-Candidate/Candidate-Profile.html";

    } else {
        alert("Candidate ID หรือ Password ไม่ถูกต้อง");
    }
}

function goVoter() {
    window.location.href = "../mfu-Voting-Login/Voting-Login.html";
}

function goAdmin() {
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}