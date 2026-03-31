let voter = JSON.parse(localStorage.getItem("currentVoter"));
let votes = JSON.parse(localStorage.getItem("votes")) || [];
let candidates = JSON.parse(localStorage.getItem("candidateData")) || [];

let container = document.getElementById("historyList");

if (!voter) {

    container.innerHTML = "<p>User data not found</p>";

} else {
    let myVotes = votes.filter(v => v.cid === voter.cid);

    myVotes.reverse();

    if (myVotes.length === 0) {
        container.innerHTML = "<p>No voting history found</p>";
    } else {
        let html = `<div class="timeline">`;

        myVotes.forEach(v => {
            let c = candidates.find(c => c.id === v.candidateID);

            html += `
                <div class="timeline-item">
                  <div class="timeline-content">
                    <p><strong>🗳️ Voted for:</strong> ${c?.name || v.candidateID}</p>
                    <p><strong>⏰ Timestamp:</strong> ${v.time}</p>
                  </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }
}

/* LOGOUT */
function logout() {
    localStorage.removeItem("currentVoter");
    window.location.href = "../mfu-Voting-Login/Voting-Login.html";
}