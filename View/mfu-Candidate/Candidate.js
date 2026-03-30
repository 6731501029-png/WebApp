function register() {
    let cid = document.getElementById("cid").value;
    let laser = document.getElementById("laser").value;
    let candidateID = document.getElementById("candidateID").value;
    let pass = document.getElementById("pass").value;

    let validIDs = JSON.parse(localStorage.getItem("candidateIDs")) || [];

    if (!validIDs.includes(candidateID)) {
        alert("Candidate ID ไม่ถูกต้อง (ต้องมาจาก Admin)");
        return;
    }

    let candidates = JSON.parse(localStorage.getItem("candidates")) || [];
    candidates.push({ cid, laser, candidateID, pass });

    localStorage.setItem("candidates", JSON.stringify(candidates));

    alert("สมัครสำเร็จ");
}

function login() {
    let id = document.getElementById("id").value;
    let pass = document.getElementById("pass").value;

    let candidates = JSON.parse(localStorage.getItem("candidates")) || [];

    let user = candidates.find(c => c.candidateID === id && c.pass === pass);

    if (user) {
        alert("Login สำเร็จ");
    } else {
        alert("ข้อมูลผิด");
    }
}

function goVoter() {
    window.location.href = "../mfu-voting/Voting.html";
}

function goAdmin() {
    window.location.href = "../mfu-Admin/Admin.html";
}