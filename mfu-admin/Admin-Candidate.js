// 🔐 check admin login
let admin = JSON.parse(localStorage.getItem("currentAdmin"));

if (!admin) {
    alert("Please login as admin.");
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}

// LOGOUT
function logout() {
    localStorage.removeItem("currentAdmin");
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}

// Manage candidates
let candidates = JSON.parse(localStorage.getItem("candidates")) || [];

function displayCandidates() {
    const list = document.getElementById("candidateList");
    list.innerHTML = "<h4>Current Candidates:</h4>";
    candidates.forEach((c, index) => {
        list.innerHTML += `<p>${c.name} - ${c.party} <button onclick="removeCandidate(${index})">Remove</button></p>`;
    });
}

function addCandidate(name, party) {
    candidates.push({name, party});
    localStorage.setItem("candidates", JSON.stringify(candidates));
    displayCandidates();
}

function removeCandidate(index) {
    candidates.splice(index, 1);
    localStorage.setItem("candidates", JSON.stringify(candidates));
    displayCandidates();
}

document.getElementById("candidateForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById("candidateName").value;
    const party = document.getElementById("candidateParty").value;
    addCandidate(name, party);
    document.getElementById("candidateName").value = "";
    document.getElementById("candidateParty").value = "";
});

// Initial display
displayCandidates();