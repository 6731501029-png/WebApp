document.addEventListener("DOMContentLoaded", () => {

    let voter = JSON.parse(localStorage.getItem("currentVoter"));
    let list = document.getElementById("candidateList");

    if (!list) {
        console.error("candidateList not found");
        return;
    }

    function loadCandidates() {
        let candidates = JSON.parse(localStorage.getItem("candidateData")) || [];

        list.innerHTML = "";

        if (candidates.length === 0) {
            list.innerHTML = "<p style='color:white'>No candidates available.</p>";
            return;
        }

        candidates.forEach(c => {

            let div = document.createElement("div");
            div.className = "card";

            let voted = voter && localStorage.getItem("hasVoted_" + voter.cid);

            div.innerHTML = `
                <img src="${c.img}">
                <h3>${c.name}</h3>
                <button ${voted ? "disabled" : ""}>
                    ${voted ? "Voted" : "Vote"}
                </button>
            `;

            // CLICK CARD = SHOW POLICY
            div.onclick = () => showPolicy(c);

            // FIX: ปุ่มต้องแยก event
            div.querySelector("button").onclick = (e) => vote(c.id, e);

            list.appendChild(div);
        });
    }

    function showPolicy(c) {
        document.getElementById("modal").style.display = "flex";
        document.getElementById("modalTitle").innerText = c.name;
        document.getElementById("modalImg").src = c.img;
        document.getElementById("modalPolicy").innerText = c.policy;
    }

    window.closeModal = function () {
        document.getElementById("modal").style.display = "none";
    }

    function vote(id, e) {
        e.stopPropagation();

        if (!voter) {
            alert("User not logged in.");
            return;
        }

        if (localStorage.getItem("hasVoted_" + voter.cid)) {
            alert("You have already voted.");
            return;
        }

        let votes = JSON.parse(localStorage.getItem("votes")) || [];

        votes.push({
            cid: voter.cid,
            candidateID: id,
            time: new Date().toLocaleString()
        });

        localStorage.setItem("votes", JSON.stringify(votes));
        localStorage.setItem("hasVoted_" + voter.cid, true);

        alert("Vote submitted successfully.");

        loadCandidates();
    }

    window.logout = function () {
        localStorage.removeItem("currentVoter");
        window.location.href = "../mfu-Voting-Login/Voting-Login.html";
    }

    loadCandidates();
});