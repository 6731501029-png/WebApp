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

// Manage votes
let votes = JSON.parse(localStorage.getItem("votes")) || [];

function displayVotes() {
    const list = document.getElementById("voteList");
    list.innerHTML = "<h4>Current Votes:</h4>";
    votes.forEach((v, index) => {
        list.innerHTML += `<p>${v.voter} voted for ${v.candidate}</p>`;
    });
}

function resetVotes() {
    let confirmReset = confirm("Are you sure? This will delete all votes.");
    if (!confirmReset) return;
    votes = [];
    localStorage.setItem("votes", JSON.stringify(votes));
    displayVotes();
    alert("Votes reset.");
}

// Initial display
displayVotes();