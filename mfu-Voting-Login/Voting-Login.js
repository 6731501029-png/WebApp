function login() {
    let cid = document.getElementById("cid").value.trim();
    let laser = document.getElementById("laser").value.trim();

    // Validate Citizen ID (must be 13 digits)
    if (!/^\d{13}$/.test(cid)) {
        alert("Invalid Citizen ID. It must contain exactly 13 digits.");
        return;
    }

    // Validate Laser ID (must be 12 characters)
    if (laser.length !== 12) {
        alert("Invalid Laser ID. It must contain exactly 12 characters.");
        return;
    }

    let voter = { cid, laser };

    localStorage.setItem("currentVoter", JSON.stringify(voter));

    let voters = JSON.parse(localStorage.getItem("voters")) || [];
    voters.push(voter);
    localStorage.setItem("voters", JSON.stringify(voters));

    window.location.href = "../mfu-Voting/Voting-Profile.html";
}

function goCandidate() {
    window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
}

function goAdmin() {
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}