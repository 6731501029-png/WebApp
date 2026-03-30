let voter = JSON.parse(localStorage.getItem("currentVoter"));
let list = document.getElementById("candidateList");

// โหลดผู้สมัคร (มาจาก Candidate-Policy)
let candidates = JSON.parse(localStorage.getItem("candidateData")) || [];


candidates.forEach(c => {

    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
    <img src="${c.img}">
    <h3>${c.name}</h3>
    <button onclick="vote('${c.id}', event)">Vote</button>
  `;

    // คลิกทั้งกล่อง = ดู policy
    div.onclick = () => showPolicy(c);

    list.appendChild(div);
});

// POPUP
function showPolicy(c) {
    document.getElementById("modal").style.display = "flex";
    document.getElementById("modalTitle").innerText = c.name;
    document.getElementById("modalImg").src = c.img;
    document.getElementById("modalPolicy").innerText = c.policy;
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// VOTE
function vote(id, e) {
    e.stopPropagation(); // กันไม่ให้ popup เด้ง

    if (!voter) return;

    if (localStorage.getItem("hasVoted_" + voter.cid)) {
        alert("คุณโหวตแล้ว");
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

    alert("โหวตสำเร็จ");
}

localStorage.getItem("candidateData")