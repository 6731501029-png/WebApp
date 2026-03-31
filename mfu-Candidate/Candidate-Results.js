let voter = JSON.parse(localStorage.getItem("currentVoter"));
let votes = JSON.parse(localStorage.getItem("votes")) || [];
let candidates = JSON.parse(localStorage.getItem("candidateData")) || [];

/* ====== STATS ====== */
document.getElementById("totalVoters").innerText =
    "👥 Number of voters: " + new Set(votes.map(v => v.cid)).size;

document.getElementById("totalCandidates").innerText =
    "🧑‍💼 Number of candidates: " + candidates.length;

document.getElementById("totalVotes").innerText =
    "🗳️ Number of voting: " + votes.length;

let percent = candidates.length
    ? ((votes.length / candidates.length) * 100).toFixed(1)
    : 0;

document.getElementById("percentVotes").innerText =
    "📊 Percentage of voting: " + percent + "%";

/* ====== RESULT ====== */
function loadResults(filter = "") {
    let count = {};

    candidates.forEach(c => count[c.id] = 0);
    votes.forEach(v => count[v.candidateID]++);

    let sorted = Object.entries(count)
        .sort((a, b) => b[1] - a[1]);

    let html = "";

    sorted.forEach(([id, score]) => {
        let c = candidates.find(c => c.id === id);
        if (!c) return;

        if (c.name.toLowerCase().includes(filter.toLowerCase())) {
            html += `
        <div class="result-item">
          <span>${c.name}</span>
          <span>${score} votes</span>
        </div>
      `;
        }
    });

    document.getElementById("resultList").innerHTML = html;
}

loadResults();

/* ====== SEARCH ====== */
function searchResult() {
    let value = document.getElementById("search").value;
    loadResults(value);
}

// LOGOUT
function logout() {
  localStorage.removeItem("currentCandidate");
  window.location.href = "../mfu-Candidate/Candidate.html";
}