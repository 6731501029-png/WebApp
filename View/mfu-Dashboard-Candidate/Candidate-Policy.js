let candidate = JSON.parse(localStorage.getItem("currentCandidate"));
let data = JSON.parse(localStorage.getItem("candidateData")) || [];

// หา candidate ของตัวเอง
let myData = data.find(c => c.id === candidate?.id);

// โหลดข้อมูล
if (candidate) {
    document.getElementById("id").value = candidate.id;

    if (myData) {
        document.getElementById("name").value = myData.name || "";
        document.getElementById("img").value = myData.img || "";
        document.getElementById("policy").value = myData.policy || "";
    }
}

// SAVE
function save() {
    let name = document.getElementById("name").value;
    let img = document.getElementById("img").value;
    let policy = document.getElementById("policy").value;

    let index = data.findIndex(c => c.id === candidate.id);

    if (index !== -1) {
        // update
        data[index].name = name;
        data[index].img = img;
        data[index].policy = policy;
    } else {
        // create ใหม่
        data.push({
            id: candidate.id,
            name,
            img,
            policy
        });
    }

    localStorage.setItem("candidateData", JSON.stringify(data));

    alert("บันทึกสำเร็จ");
}

// LOGOUT
function logout() {
    localStorage.removeItem("currentCandidate");
    window.location.href = "../mfu-Candidate/Candidate.html";
}