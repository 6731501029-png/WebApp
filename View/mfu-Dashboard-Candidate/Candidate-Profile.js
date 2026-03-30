// โหลด candidate ที่ login
let candidate = JSON.parse(localStorage.getItem("currentCandidate"));

if (candidate) {
  document.getElementById("candidateID").innerText =
    "Candidate ID: " + candidate.id;

  document.getElementById("candidateName").innerText =
    "Name: " + (candidate.name || "-");

  // คะแนน
  let votes = JSON.parse(localStorage.getItem("votes")) || [];

  let myVotes = votes.filter(v => v.candidateID === candidate.id);

  document.getElementById("voteStatus").innerText =
    "คะแนนของคุณ: " + myVotes.length + " votes";
}

// NAV
function goPolicy() {
  window.location.href = "Candidate-Policy.html";
}

function goHistory() {
  window.location.href = "Candidate-Resultshtml";
}

// LOGOUT
function logout() {
  localStorage.removeItem("currentCandidate");
  window.location.href = "../mfu-Candidate/Candidate.html";
}