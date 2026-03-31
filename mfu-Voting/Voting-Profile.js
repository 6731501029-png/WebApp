let voter = JSON.parse(localStorage.getItem("currentVoter"));

if (voter) {
    document.getElementById("userInfo").innerText = "Citizen ID: " + voter.cid;
    document.getElementById("laserInfo").innerText = "Laser ID: " + voter.laser;

    let voted = localStorage.getItem("hasVoted_" + voter.cid);

    document.getElementById("voteStatus").innerText =
        voted ? "✅ Vote submitted" : "❌ Vote not yet submitted";
}

function goVote() {
    window.location.href = "Voting-Vote.html";
}

function goResults() {
    window.location.href = "Voting-Results.html";
}

function logout() {
    localStorage.removeItem("currentVoter");
    window.location.href = "../mfu-Voting-Login/Voting-Login.html";
}