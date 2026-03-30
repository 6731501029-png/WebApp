function login() {
    let user = document.getElementById("user").value;
    let adminID = document.getElementById("adminID").value;
    let pass = document.getElementById("pass").value;

    let admins = JSON.parse(localStorage.getItem("admins")) || [];

    let found = admins.find(a => a.user === user && a.adminID === adminID && a.pass === pass);

    if (found) {
        alert("Admin Login สำเร็จ");
    } else {
        alert("ไม่พบข้อมูล");
    }
}

function createID() {
    let newID = document.getElementById("newID").value;

    let ids = JSON.parse(localStorage.getItem("candidateIDs")) || [];

    ids.push(newID);

    localStorage.setItem("candidateIDs", JSON.stringify(ids));

    alert("สร้าง Candidate ID สำเร็จ");
}

function goVoter() {
    window.location.href = "../mfu-voting/Voting.html";
}

function goCandidate() {
    window.location.href = "../mfu-Candidate/Candidate.html";
}