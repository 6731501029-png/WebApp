function login() {
  let cid = document.getElementById("cid").value;
  let laser = document.getElementById("laser").value;

  let voter = { cid, laser };

  localStorage.setItem("currentVoter", JSON.stringify(voter));

  let voters = JSON.parse(localStorage.getItem("voters")) || [];
  voters.push(voter);
  localStorage.setItem("voters", JSON.stringify(voters));

  alert("Login สำเร็จ");

  // 🔥 redirect
  window.location.href = "../mfu-Dashboard-voting/Dashboard-Profile.html";
}

function goCandidate() {
    window.location.href = "../mfu-Candidate/Candidate.html";
}

function goAdmin() {
    window.location.href = "../mfu-Admin/Admin.html";
}