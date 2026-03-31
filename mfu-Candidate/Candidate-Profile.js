let candidate = JSON.parse(localStorage.getItem("currentCandidate"));

// Check login
if (!candidate) {
  alert("Please login first.");
  window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
}

// Show info
document.getElementById("candidateInfo").innerText =
  "Candidate ID: " + candidate.id;

document.getElementById("citizenInfo").innerText =
  "Citizen ID: " + candidate.cid;

document.getElementById("laserInfo").innerText =
  "Laser ID: " + candidate.laser;

// Navigation
function goPolicy() {
  window.location.href = "Candidate-Policy.html";
}

function goResults() {
  window.location.href = "Candidate-Results.html";
}

// Logout
function logout() {
  localStorage.removeItem("currentCandidate");
  window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
}