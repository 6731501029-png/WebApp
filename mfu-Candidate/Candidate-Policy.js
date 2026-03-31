document.addEventListener("DOMContentLoaded", () => {

    let candidate = JSON.parse(localStorage.getItem("currentCandidate"));

    if (!candidate) {
        alert("Please login first.");
        window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
        return;
    }

    let idInput = document.getElementById("id");
    let nameInput = document.getElementById("name");
    let imgInput = document.getElementById("img");
    let policyInput = document.getElementById("policy");

    idInput.value = candidate.id;

    let data = JSON.parse(localStorage.getItem("candidateData")) || [];

    let myData = data.find(c => c.id === candidate.id);

    // LOAD
    if (myData) {
        nameInput.value = myData.name || "";
        imgInput.value = myData.img || "";
        policyInput.value = myData.policy || "";
    }

    // SHOW MY POLICY (แบบ card)
    function renderMyPolicy() {

        let list = document.getElementById("list");

        if (!myData) {
            list.innerHTML = "<p style='text-align:center'>No policy yet.</p>";
            return;
        }

        list.innerHTML = `
        <div class="item">
            <img src="${myData.img}">
            <h3>${myData.name}</h3>
            <p>${myData.policy}</p>
        </div>
    `;
    }
    renderMyPolicy();

    // SAVE (create or update)
    window.saveCandidate = function () {

        let name = nameInput.value.trim();
        let img = imgInput.value.trim();
        let policy = policyInput.value.trim();

        if (!name || !img || !policy) {
            alert("All fields are required.");
            return;
        }

        let index = data.findIndex(c => c.id === candidate.id);

        if (index !== -1) {
            // UPDATE
            data[index].name = name;
            data[index].img = img;
            data[index].policy = policy;
        } else {
            // CREATE (ครั้งแรก)
            data.push({
                id: candidate.id,
                name,
                img,
                policy
            });
        }

        localStorage.setItem("candidateData", JSON.stringify(data));

        alert("Saved successfully.");
    }

    // 🗑️ DELETE (เฉพาะของตัวเอง)
    window.deleteCandidate = function () {

        let confirmDelete = confirm("Are you sure you want to delete your policy?");
        if (!confirmDelete) return;

        let index = data.findIndex(c => c.id === candidate.id);

        if (index !== -1) {
            data.splice(index, 1);
            localStorage.setItem("candidateData", JSON.stringify(data));

            // เคลียร์ input
            nameInput.value = "";
            imgInput.value = "";
            policyInput.value = "";

            alert("Deleted successfully.");
        } else {
            alert("No policy found.");
        }
    }

    // LOGOUT
    window.logout = function () {
        localStorage.removeItem("currentCandidate");
        window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
    }

});