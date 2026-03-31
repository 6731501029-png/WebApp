let mockIDs = ["C01", "C02", "C03", "C04"];

function register() {
    let cid = document.getElementById("cid").value.trim();
    let laser = document.getElementById("laser").value.trim();
    let candidateID = document.getElementById("candidateID").value.trim();
    let pass = document.getElementById("pass").value.trim();

    // Validate Citizen ID (13 digits)
    if (!/^\d{13}$/.test(cid)) {
        alert("Citizen ID must be exactly 13 digits.");
        return;
    }

    // Validate Laser ID (12 characters)
    if (laser.length !== 12) {
        alert("Laser ID must be exactly 12 characters.");
        return;
    }

    // Validate Candidate ID
    if (!mockIDs.includes(candidateID)) {
        alert("Invalid Candidate ID.");
        return;
    }

    let candidates = JSON.parse(localStorage.getItem("candidates")) || [];

    // Prevent duplicate
    let exists = candidates.find(c => c.candidateID === candidateID);
    if (exists) {
        alert("Candidate ID already exists.");
        return;
    }

    candidates.push({
        cid,
        laser,
        candidateID,
        pass
    });

    localStorage.setItem("candidates", JSON.stringify(candidates));

    alert("Registration successful.");
    window.location.href = "Candidate-Login.html";
}