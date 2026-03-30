let voter = JSON.parse(localStorage.getItem("currentVoter"));

if (voter) {
    document.getElementById("userInfo").innerText = "Citizen ID: " + voter.cid;
    document.getElementById("laserInfo").innerText = "Laser ID: " + voter.laser;

    let voted = localStorage.getItem("hasVoted_" + voter.cid);

    document.getElementById("voteStatus").innerText =
        voted ? "✅ โหวตแล้ว" : "❌ ยังไม่โหวต";
}

function goVote() {
    window.location.href = "Dashboard-Policy.html";
}

function goHistory() {
    window.location.href = "Dashboard-History.html";
}

function logout() {
    localStorage.removeItem("currentVoter");
    window.location.href = "../mfu-voting/Voting.html";
}