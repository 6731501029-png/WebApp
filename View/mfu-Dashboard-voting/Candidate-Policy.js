let list = document.getElementById("list");

// โหลดข้อมูล
function load() {
    let data = JSON.parse(localStorage.getItem("candidateData")) || [];

    list.innerHTML = "";

    data.forEach((c, index) => {
        let div = document.createElement("div");
        div.className = "item";

        div.innerHTML = `
      <img src="${c.img}">
      <h3>${c.name}</h3>
      <p>${c.policy.substring(0, 50)}...</p>

      <div class="actions">
        <button onclick="edit(${index})">Edit</button>
        <button onclick="remove(${index})">Delete</button>
      </div>
    `;

        list.appendChild(div);
    });
}

// SAVE
function saveCandidate() {
    let id = document.getElementById("id").value;
    let name = document.getElementById("name").value;
    let img = document.getElementById("img").value;
    let policy = document.getElementById("policy").value;

    let data = JSON.parse(localStorage.getItem("candidateData")) || [];

    let existing = data.find(c => c.id === id);

    if (existing) {
        existing.name = name;
        existing.img = img;
        existing.policy = policy;
    } else {
        data.push({ id, name, img, policy });
    }

    localStorage.setItem("candidateData", JSON.stringify(data));

    alert("บันทึกสำเร็จ");
    load();
}

// EDIT
function edit(index) {
    let data = JSON.parse(localStorage.getItem("candidateData"));

    let c = data[index];z

    document.getElementById("id").value = c.id;
    document.getElementById("name").value = c.name;
    document.getElementById("img").value = c.img;
    document.getElementById("policy").value = c.policy;
}

// DELETE
function remove(index) {
    let data = JSON.parse(localStorage.getItem("candidateData"));

    data.splice(index, 1);

    localStorage.setItem("candidateData", JSON.stringify(data));
    load();
}

load();