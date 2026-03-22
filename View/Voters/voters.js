(() => {
  const STORAGE = {
    auth: "mfu_voters_auth",
    vote: "mfu_voters_vote",
    votesByCandidate: "mfu_voters_votes_by_candidate",
  };

  const TOTAL_VOTERS = 2500;
  const CANDIDATES = [
    { id: "C01", code: "01", name: "กานต์ กิตติคุณ", party: "พรรคก้าวใหม่", color: "linear-gradient(135deg,#8c1515,#fec260)", policies: ["ทุนการศึกษาเพื่อทุกคน", "ระบบขนส่งภายในมหาวิทยาลัย", "พื้นที่อ่านหนังสือ 24 ชม."] },
    { id: "C02", code: "02", name: "นภา วัฒนศิริ", party: "พรรคชุมชนเข้มแข็ง", color: "linear-gradient(135deg,#0ea5e9,#fec260)", policies: ["เพิ่มจุดคัดแยกขยะ", "โครงการสุขภาพใจ", "กิจกรรมเสริมทักษะอาชีพ"] },
    { id: "C03", code: "03", name: "ธีร์ธวัช ปัญญา", party: "พรรคดิจทัลเพื่อทุกคน", color: "linear-gradient(135deg,#8c1515,#0ea5e9)", policies: ["Wi‑Fi ครอบคลุมทุกอาคาร", "ระบบแจ้งซ่อมออนไลน์", "ลดขั้นตอนงานเอกสาร"] },
    { id: "C04", code: "04", name: "พิมพ์ชนก ศรีสุวรรณ", party: "พรรคสวัสดิการนักศึกษา", color: "linear-gradient(135deg,#10b981,#fec260)", policies: ["ขยายเวลาโรงอาหาร", "เพิ่มงบชมรม", "ระบบร้องเรียนติดตามผล"] },
  ];

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeParse = (v, fallback) => {
    try {
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };

  const getAuth = () => safeParse(localStorage.getItem(STORAGE.auth), null);
  const setAuth = (auth) => localStorage.setItem(STORAGE.auth, JSON.stringify(auth));
  const clearAuth = () => localStorage.removeItem(STORAGE.auth);

  const getVote = () => safeParse(localStorage.getItem(STORAGE.vote), { hasVoted: false, candidateId: null, votedAt: null });
  const setVote = (vote) => localStorage.setItem(STORAGE.vote, JSON.stringify(vote));

  const makeSeed = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const seededRand = (seed) => {
    let x = seed >>> 0;
    return () => ((x = (Math.imul(1664525, x) + 1013904223) >>> 0) / 4294967296);
  };

  const initVotes = () => {
    const existing = safeParse(localStorage.getItem(STORAGE.votesByCandidate), null);
    if (existing && existing.votes) return existing;

    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const rnd = seededRand(makeSeed(`MFU-VOTERS-${stamp}`));
    const votes = {};
    for (const c of CANDIDATES) votes[c.id] = 220 + Math.floor(rnd() * 380);

    const state = { stamp, votes };
    localStorage.setItem(STORAGE.votesByCandidate, JSON.stringify(state));
    return state;
  };

  const getVotesByCandidate = () => initVotes().votes;
  const setVotesByCandidate = (votes) => {
    const state = initVotes();
    localStorage.setItem(STORAGE.votesByCandidate, JSON.stringify({ ...state, votes }));
  };

  const formatDateTime = (iso) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));

  const maskCitizenId = (id) => {
    const s = String(id || "");
    if (s.length < 8) return s || "";
    return `${s.slice(0, 3)}-xxxx-xxxx-${s.slice(-2)}`;
  };

  const requireAuth = () => {
    const auth = getAuth();
    if (!auth) {
      window.location.href = "login.html";
      return null;
    }
    return auth;
  };

  const logout = () => {
    clearAuth();
    window.location.href = "login.html";
  };

  const candidateById = (id) => CANDIDATES.find((c) => c.id === id) || null;

  const renderAuthInNavbar = () => {
    const auth = getAuth();
    const value = auth?.citizenId ? maskCitizenId(auth.citizenId) : "";
    qsa("[data-auth-citizen]").forEach((el) => {
      el.textContent = value;
    });
  };

  const bindLogoutButtons = () => {
    qsa("[data-action='logout']").forEach((btn) => btn.addEventListener("click", logout));
  };

  const bindLogin = () => {
    const auth = getAuth();
    if (auth) {
      window.location.href = "dashboard.html";
      return;
    }

    const form = qs("[data-login-form]");
    if (!form) return;

    const citizen = qs("[name='citizenId']", form);
    const laser = qs("[name='laserId']", form);
    const error = qs("[data-login-error]");

    const setError = (msg) => {
      if (!error) return;
      error.textContent = msg;
      error.classList.toggle("d-none", !msg);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      setError("");
      const citizenId = String(citizen?.value || "").trim();
      const laserId = String(laser?.value || "").trim();

      if (!/^\d{13}$/.test(citizenId)) return setError("Citizen ID ต้องเป็นตัวเลข 13 หลัก");
      if (!/^[A-Za-z0-9]{10,14}$/.test(laserId)) return setError("Laser ID ต้องเป็นตัวอักษร/ตัวเลข 10–14 ตัว");

      setAuth({ citizenId, laserId, loginAt: new Date().toISOString() });
      window.location.href = "dashboard.html";
    });
  };

  const renderDashboard = () => {
    const auth = requireAuth();
    if (!auth) return;

    const vote = getVote();
    const votes = getVotesByCandidate();
    const totalVotes = Object.values(votes).reduce((a, b) => a + (b || 0), 0);
    const percent = Math.min(100, Math.round((totalVotes / TOTAL_VOTERS) * 100));

    const statusEl = qs("[data-vote-status]");
    if (statusEl) {
      if (vote.hasVoted && vote.candidateId) {
        const c = candidateById(vote.candidateId);
        statusEl.className = "alert voters-success py-2 px-3 mb-0";
        statusEl.innerHTML = `โหวตแล้ว: <strong>${c?.name || vote.candidateId}</strong> • ${formatDateTime(vote.votedAt)}`;
      } else {
        statusEl.className = "alert voters-alert py-2 px-3 mb-0";
        statusEl.innerHTML = `ยังไม่โหวต • ไปที่หน้า <a class="text-decoration-underline" href="candidates.html">Candidates</a>`;
      }
    }

    const setText = (sel, value) => {
      const el = qs(sel);
      if (el) el.textContent = value;
    };
    setText("[data-stat-voters]", TOTAL_VOTERS.toLocaleString());
    setText("[data-stat-candidates]", String(CANDIDATES.length));
    setText("[data-stat-votes]", totalVotes.toLocaleString());
    setText("[data-stat-percent]", `${percent}%`);
  };

  const renderCandidates = () => {
    requireAuth();
    const vote = getVote();

    const banner = qs("[data-candidates-banner]");
    if (banner) {
      if (vote.hasVoted) {
        const c = candidateById(vote.candidateId);
        banner.className = "alert voters-success mb-3";
        banner.textContent = `คุณโหวตแล้ว: ${c?.name || vote.candidateId} • ${formatDateTime(vote.votedAt)}`;
      } else {
        banner.className = "alert voters-alert mb-3";
        banner.innerHTML = `โหวตได้ <strong>1 ครั้ง</strong> (ยืนยันแล้วแก้ไขไม่ได้)`;
      }
    }

    qsa("[data-action='vote']").forEach((btn) => {
      const id = btn.getAttribute("data-candidate");
      const c = candidateById(id);
      if (!c) return;

      if (vote.hasVoted) {
        btn.setAttribute("disabled", "disabled");
        btn.classList.remove("btn-accent");
        btn.classList.add("btn-soft");
        btn.textContent = vote.candidateId === id ? "คุณเลือกคนนี้" : "ปิดการโหวต";
        return;
      }

      btn.addEventListener("click", () => {
        const ok = window.confirm(`ยืนยันโหวตให้: ${c.name}\n\nโหวตได้ 1 ครั้ง`);
        if (!ok) return;
        const votedAt = new Date().toISOString();
        setVote({ hasVoted: true, candidateId: id, votedAt });
        const votes = getVotesByCandidate();
        setVotesByCandidate({ ...votes, [id]: (votes[id] || 0) + 1 });
        window.location.href = "results.html";
      });
    });
  };

  const renderHistory = () => {
    requireAuth();
    const vote = getVote();
    const tbody = qs("[data-history-body]");
    if (!tbody) return;

    if (!vote.hasVoted) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted">ยังไม่มีประวัติการโหวต</td></tr>`;
      return;
    }

    const c = candidateById(vote.candidateId);
    tbody.innerHTML = `
      <tr>
        <td>1</td>
        <td>${formatDateTime(vote.votedAt)}</td>
        <td><span class="kbd">${vote.candidateId}</span></td>
        <td>${c?.name || "-"}</td>
        <td><span class="badge text-bg-success">SUCCESS</span></td>
      </tr>
    `;
  };

  const renderResults = () => {
    requireAuth();
    const vote = getVote();
    const votes = getVotesByCandidate();

    const list = CANDIDATES.map((c) => ({ ...c, votes: votes[c.id] || 0 })).sort((a, b) => b.votes - a.votes);
    const tbody = qs("[data-results-body]");
    if (!tbody) return;

    const rows = list
      .map((c, idx) => {
        const mine = vote.hasVoted && vote.candidateId === c.id;
        return `
          <tr ${mine ? 'style="background: rgba(254,194,96,.22);"' : ""}>
            <td>${idx + 1}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <span class="candidate-avatar" style="background:${c.color}; width:38px; height:38px; border-radius:12px;">${c.code}</span>
                <div>
                  <div>${c.name} ${mine ? '<span class="badge" style="background:rgba(140,21,21,.12);border:1px solid rgba(140,21,21,.22);color:rgba(140,21,21,.98);">YOUR VOTE</span>' : ""}</div>
                  <div class="text-muted small"><span class="kbd">${c.id}</span></div>
                </div>
              </div>
            </td>
            <td class="text-muted">${c.party}</td>
            <td class="text-end"><span class="kbd">${c.votes.toLocaleString()}</span></td>
          </tr>
        `;
      })
      .join("");

    tbody.innerHTML = rows;

    const totalVotes = list.reduce((a, c) => a + c.votes, 0);
    const totalEl = qs("[data-total-votes]");
    if (totalEl) totalEl.textContent = totalVotes.toLocaleString();

    const search = qs("[data-action='search']");
    if (search) {
      search.addEventListener("input", () => {
        const q = String(search.value || "").trim().toLowerCase();
        const filtered = !q ? list : list.filter((c) => `${c.id} ${c.name} ${c.party}`.toLowerCase().includes(q));
        tbody.innerHTML = filtered
          .map((c, idx) => {
            const mine = vote.hasVoted && vote.candidateId === c.id;
            return `
              <tr ${mine ? 'style="background: rgba(254,194,96,.22);"' : ""}>
                <td>${idx + 1}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="candidate-avatar" style="background:${c.color}; width:38px; height:38px; border-radius:12px;">${c.code}</span>
                    <div>
                      <div>${c.name} ${mine ? '<span class="badge" style="background:rgba(140,21,21,.12);border:1px solid rgba(140,21,21,.22);color:rgba(140,21,21,.98);">YOUR VOTE</span>' : ""}</div>
                      <div class="text-muted small"><span class="kbd">${c.id}</span></div>
                    </div>
                  </div>
                </td>
                <td class="text-muted">${c.party}</td>
                <td class="text-end"><span class="kbd">${c.votes.toLocaleString()}</span></td>
              </tr>
            `;
          })
          .join("");
      });
    }
  };

  const init = () => {
    const page = document.body?.getAttribute("data-page") || "";

    renderAuthInNavbar();
    bindLogoutButtons();

    if (page === "login") return bindLogin();
    if (page === "logout") return logout();
    if (page === "dashboard") return renderDashboard();
    if (page === "candidates") return renderCandidates();
    if (page === "history") return renderHistory();
    if (page === "results") return renderResults();

    if (page !== "index") requireAuth();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
