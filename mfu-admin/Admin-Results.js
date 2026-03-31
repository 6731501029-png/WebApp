// 🔐 check admin login
let admin = JSON.parse(localStorage.getItem("currentAdmin"));

if (!admin) {
    alert("Please login as admin.");
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}

// 🔥 RESET SYSTEM
function resetAll() {

    let confirmReset = confirm("Are you sure? This will delete ALL data.");

    if (!confirmReset) return;

    // 💀 ลบทั้งหมด
    localStorage.clear();

    alert("System reset complete.");

    // กลับหน้า login
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}

// LOGOUT
function logout() {
    localStorage.removeItem("currentAdmin");
    window.location.href = "../mfu-Admin-Login/Admin-Login.html";
}