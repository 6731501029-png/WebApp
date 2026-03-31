function login() {
    let user = document.getElementById("user").value.trim();
    let adminID = document.getElementById("adminID").value.trim();
    let pass = document.getElementById("pass").value.trim();

    // 🔥 Hardcode Admin Account
    if (user === "admin" && adminID === "A001" && pass === "1234") {

        localStorage.setItem("currentAdmin", JSON.stringify({
            user,
            adminID
        }));

        alert("Admin login successful");

        // 👉 ไปหน้าแรก (Results)
        window.location.href = "../mfu-Admin/Admin-Results.html";

    } else {
        alert("Invalid admin credentials");
    }
}

function goVoter() {
    window.location.href = "../mfu-Voting-Login/Voting-Login.html";
}

function goCandidate() {
    window.location.href = "../mfu-Candidate-Login/Candidate-Login.html";
}