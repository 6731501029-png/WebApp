import crypto from "node:crypto";
import express from "express";
import {
  asyncHandler,
  appStatus,
  candidateProfileRow,
  clearSession,
  dashboardSummary,
  db,
  fetchCandidateProfiles,
  fetchRankedResults,
  jsonResponse,
  requireSessionRole,
  rootPath,
  saveAppStatus,
  setSession,
  textResponse,
  updateCandidateImageReference,
} from "./common.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/Public", express.static(rootPath("Public")));
app.use("/View", express.static(rootPath("View")));
app.use("/storage", express.static(rootPath("storage")));
app.use("/mfu-Voting-Login", express.static(rootPath("mfu-Voting-Login")));
app.use("/mfu-Voting", express.static(rootPath("mfu-Voting")));
app.use("/mfu-Candidate-Login", express.static(rootPath("mfu-Candidate-Login")));
app.use("/mfu-Candidate", express.static(rootPath("mfu-Candidate")));
app.use("/mfu-Admin-Login", express.static(rootPath("mfu-Admin-Login")));
app.use("/mfu-Admin", express.static(rootPath("mfu-Admin")));

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function parseToggleValue(value, fallback = null) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "enable", "enabled", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "disable", "disabled", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

async function fetchCandidateById(candidateId) {
  const [rows] = await db().execute(
    `
      SELECT candidate_id, password, name, policies, is_enabled
      FROM candidates
      WHERE candidate_id = ?
      LIMIT 1
    `,
    [candidateId]
  );

  return rows[0] || null;
}

async function getAdminDashboardPayload() {
  const summary = await dashboardSummary();
  const status = await appStatus();

  return {
    total_voters: summary.number_of_voters,
    total_candidates: summary.number_of_candidates,
    total_votes: summary.number_of_voting,
    voting_status: status.voting || "enable",
  };
}

async function getResultsPayload(search = "", enabledOnly = false) {
  const results = await fetchRankedResults(search, enabledOnly);
  return results.map((row) => ({
    candidate_id: row.candidate_id,
    name: row.name,
    votes: row.score,
    policy: row.policy,
    image: row.image,
    is_enabled: row.is_enabled,
    rank: row.rank,
  }));
}

async function performVoterLogin(req, res) {
  const citizenId = firstNonEmpty(req.body?.citizen_id, req.body?.cid);
  const laserId = firstNonEmpty(req.body?.laser_id, req.body?.laser);
  const [rows] = await db().execute(
    `
      SELECT citizen_id, laser_id, is_enabled, has_voted
      FROM voters
      WHERE citizen_id = ? AND laser_id = ?
      LIMIT 1
    `,
    [citizenId, laserId]
  );

  const voter = rows[0];

  if (!voter) {
    textResponse(res, 401, "Invalid credentials");
    return;
  }

  if (!voter.is_enabled) {
    textResponse(res, 403, "Voter disabled");
    return;
  }

  setSession(res, "voter", String(voter.citizen_id), {
    citizen_id: String(voter.citizen_id),
    laser_id: String(voter.laser_id),
  });

  textResponse(res, 200, "Login successful");
}

async function performCandidateLogin(req, res) {
  const candidateId = firstNonEmpty(req.body?.candidate_id, req.body?.id);
  const password = String(req.body?.password ?? req.body?.pass ?? "");
  const candidate = await fetchCandidateById(candidateId);

  if (!candidate || !candidate.password || String(candidate.password) !== password) {
    textResponse(res, 401, "Wrong credentials");
    return;
  }

  if (!candidate.is_enabled) {
    textResponse(res, 403, "Candidate disabled");
    return;
  }

  setSession(res, "candidate", String(candidate.candidate_id), {
    candidate_id: String(candidate.candidate_id),
    name: candidate.name || "",
  });

  textResponse(res, 200, "Login successful");
}

async function performAdminLogin(req, res) {
  const username = firstNonEmpty(req.body?.username, req.body?.user);
  const password = String(req.body?.password ?? req.body?.pass ?? "");
  const [rows] = await db().execute(
    "SELECT id, username, password FROM admins WHERE username = ? LIMIT 1",
    [username]
  );
  const admin = rows[0];

  if (!admin || String(admin.password) !== password) {
    textResponse(res, 401, "Wrong username or Wrong password");
    return;
  }

  setSession(res, "admin", String(admin.id), {
    admin_id: String(admin.id),
    username: admin.username,
  });

  textResponse(res, 200, "Login successful");
}

app.post(
  "/voter/login",
  asyncHandler(performVoterLogin)
);

app.post("/voterlogin", asyncHandler(performVoterLogin));

app.get(
  "/voter/candidatesinfo",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "voter")) {
      return;
    }

    jsonResponse(res, 200, await fetchCandidateProfiles(true));
  })
);

app.get(
  "/voter/candidates",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "voter")) {
      return;
    }

    const profiles = await fetchCandidateProfiles(true);
    jsonResponse(
      res,
      200,
      profiles.map((row) => ({
        id: row.candidate_id,
        candidate_id: row.candidate_id,
        name: row.name,
        policy: row.policy,
        photo: row.image,
      }))
    );
  })
);

app.post(
  "/voter/vote",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "voter");
    if (!session) {
      return;
    }

    const status = await appStatus();
    if ((status.voting || "enable") !== "enable") {
      textResponse(res, 403, "Voting is disabled");
      return;
    }

    const candidateId = String(req.body?.candidate_id || "").trim();
    if (!candidateId) {
      textResponse(res, 404, "Candidate not found");
      return;
    }

    const connection = await db().getConnection();

    try {
      await connection.beginTransaction();

      const [voterRows] = await connection.execute(
        "SELECT is_enabled, has_voted FROM voters WHERE citizen_id = ? LIMIT 1 FOR UPDATE",
        [session.citizen_id || session.id]
      );
      const voter = voterRows[0];

      const [candidateRows] = await connection.execute(
        "SELECT candidate_id, is_enabled FROM candidates WHERE candidate_id = ? LIMIT 1",
        [candidateId]
      );
      const candidate = candidateRows[0];

      if (!candidate || !candidate.is_enabled) {
        await connection.rollback();
        textResponse(res, 404, "Candidate not found");
        return;
      }

      if (!voter || !voter.is_enabled) {
        await connection.rollback();
        textResponse(res, 403, "Voter disabled");
        return;
      }

      if (voter.has_voted) {
        await connection.rollback();
        textResponse(res, 400, "Already voted");
        return;
      }

      await connection.execute(
        "INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)",
        [session.citizen_id || session.id, candidateId]
      );
      await connection.execute("UPDATE voters SET has_voted = 1 WHERE citizen_id = ?", [
        session.citizen_id || session.id,
      ]);

      await connection.commit();
      textResponse(res, 200, "Vote recorded");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

app.get(
  "/voter/history",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "voter");
    if (!session) {
      return;
    }

    const [rows] = await db().execute(
      `
        SELECT candidate_id, voted_at
        FROM votes
        WHERE voter_id = ?
        ORDER BY voted_at DESC
      `,
      [session.citizen_id || session.id]
    );

    jsonResponse(
      res,
      200,
      rows.map((row) => ({
        vote: true,
        candidate_id: row.candidate_id,
        voted_at: row.voted_at,
      }))
    );
  })
);

app.get(
  "/voter/results",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "voter")) {
      return;
    }

    jsonResponse(res, 200, await getResultsPayload(String(req.query.query || ""), true));
  })
);

app.get(
  "/voter/dashboardvt",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "voter")) {
      return;
    }

    jsonResponse(res, 200, {
      ...(await dashboardSummary()),
      results: await getResultsPayload(String(req.query.search || ""), true),
    });
  })
);

app.post(
  "/candidate/login",
  asyncHandler(performCandidateLogin)
);

app.post("/candidatelogin", asyncHandler(performCandidateLogin));

app.post(
  "/candidate/register",
  asyncHandler(async (req, res) => {
    const candidateId = firstNonEmpty(req.body?.candidate_id, req.body?.id);
    const password = String(req.body?.password || "");

    const [rows] = await db().execute(
      "SELECT candidate_id, password FROM candidates WHERE candidate_id = ? LIMIT 1",
      [candidateId]
    );
    const candidate = rows[0];

    if (!candidate) {
      textResponse(res, 400, "Candidate ID not found");
      return;
    }

    await db().execute("UPDATE candidates SET password = ? WHERE candidate_id = ?", [
      password,
      candidateId,
    ]);

    textResponse(res, 200, "Registered successfully");
  })
);

app.put(
  "/candidate/updateinfo",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    const candidateId = String(session.candidate_id || session.id);
    const name = String(req.body?.name || "").trim();
    const policy = String(req.body?.policy || req.body?.policies || "").trim();
    const image = req.body?.image ?? req.body?.img ?? null;

    await updateCandidateImageReference(candidateId, typeof image === "string" ? image : null);

    await db().execute(
      `
        UPDATE candidates
        SET name = ?, policies = ?
        WHERE candidate_id = ?
      `,
      [name, policy, candidateId]
    );

    textResponse(res, 200, "Profile updated");
  })
);

app.get(
  "/candidate/profile",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    const candidate = await fetchCandidateById(String(session.candidate_id || session.id));
    if (!candidate) {
      textResponse(res, 401, "Unauthorized");
      return;
    }

    const profile = await candidateProfileRow(candidate);
    jsonResponse(res, 200, {
      id: profile.candidate_id,
      candidate_id: profile.candidate_id,
      name: profile.name,
      policy: profile.policy,
      photo: profile.image,
      is_enabled: profile.is_enabled,
    });
  })
);

app.put(
  "/candidate/profile",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    const candidateId = String(session.candidate_id || session.id);
    const name = String(req.body?.name || "").trim();
    const policy = String(req.body?.policy || req.body?.policies || "").trim();
    const image = req.body?.photo ?? req.body?.image ?? req.body?.img ?? null;

    await updateCandidateImageReference(candidateId, typeof image === "string" ? image : null);

    await db().execute(
      `
        UPDATE candidates
        SET name = ?, policies = ?
        WHERE candidate_id = ?
      `,
      [name, policy, candidateId]
    );

    textResponse(res, 200, "Profile updated");
  })
);

app.get(
  "/candidate/votingscore",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    const candidateId = String(session.candidate_id || session.id);
    const results = await getResultsPayload("", false);
    const current = results.find((item) => item.candidate_id === candidateId) || {
      rank: results.length + 1,
      votes: 0,
    };

    const [rows] = await db().execute(
      "SELECT candidate_id, name, policies, is_enabled FROM candidates WHERE candidate_id = ? LIMIT 1",
      [candidateId]
    );

    if (!rows[0]) {
      textResponse(res, 401, "Unauthorized");
      return;
    }

    jsonResponse(res, 200, {
      "current rank": current.rank,
      "voting score": current.votes,
      "top leaderboard": results[0]?.candidate_id || null,
      results,
      profile: await candidateProfileRow(rows[0]),
    });
  })
);

app.get(
  "/candidate/score",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    const candidateId = String(session.candidate_id || session.id);
    const results = await getResultsPayload("", false);
    const current = results.find((item) => item.candidate_id === candidateId);

    if (!current) {
      textResponse(res, 401, "Unauthorized");
      return;
    }

    jsonResponse(res, 200, current);
  })
);

app.get(
  "/candidate/results",
  asyncHandler(async (req, res) => {
    const session = requireSessionRole(req, res, "candidate");
    if (!session) {
      return;
    }

    jsonResponse(res, 200, await getResultsPayload(String(req.query.query || ""), false));
  })
);

app.post(
  "/admin/login",
  asyncHandler(performAdminLogin)
);

app.post("/adminmlogin", asyncHandler(performAdminLogin));
app.post("/admin/logout", (req, res) => {
  clearSession(req, res);
  textResponse(res, 200, "Logged out");
});
app.post("/adminmlogout", (req, res) => {
  clearSession(req, res);
  textResponse(res, 200, "Logged out");
});
app.post("/voter/logout", (req, res) => {
  clearSession(req, res);
  textResponse(res, 200, "Logged out");
});
app.post("/votermlogout", (req, res) => {
  clearSession(req, res);
  textResponse(res, 200, "Logged out");
});

app
  .route("/admin/candidatesam")
  .get(
    asyncHandler(async (req, res) => {
      if (!requireSessionRole(req, res, "admin")) {
        return;
      }

      jsonResponse(res, 200, await fetchCandidateProfiles(false));
    })
  )
  .post(
    asyncHandler(async (req, res) => {
      if (!requireSessionRole(req, res, "admin")) {
        return;
      }

      const candidateId = String(req.body?.candidate_id || "").trim();
      if (!candidateId) {
        textResponse(res, 400, "Candidate ID is required");
        return;
      }

      const [rows] = await db().execute(
        "SELECT candidate_id FROM candidates WHERE candidate_id = ? LIMIT 1",
        [candidateId]
      );

      if (rows[0]) {
        textResponse(res, 400, "Candidate ID already exists");
        return;
      }

      await db().execute(
        `
          INSERT INTO candidates (candidate_id, password, name, policies, is_enabled)
          VALUES (?, NULL, NULL, NULL, 1)
        `,
        [candidateId]
      );

      textResponse(res, 200, "Candidate ID created");
    })
  );

app.get(
  "/admin/dashboard",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    jsonResponse(res, 200, await getAdminDashboardPayload());
  })
);

app.get(
  "/admin/voters",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const [rows] = await db().query(
      `
        SELECT citizen_id, laser_id, is_enabled, has_voted
        FROM voters
        ORDER BY citizen_id ASC
      `
    );

    jsonResponse(
      res,
      200,
      rows.map((row) => ({
        citizen_id: String(row.citizen_id),
        laser_id: String(row.laser_id),
        is_enabled: Boolean(row.is_enabled),
        has_voted: Boolean(row.has_voted),
      }))
    );
  })
);

app.post(
  "/admin/voters",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const citizenId = firstNonEmpty(req.body?.citizen_id, req.body?.cid);
    const laserId = firstNonEmpty(req.body?.laser_id, req.body?.laser);
    const [rows] = await db().execute(
      "SELECT citizen_id FROM voters WHERE citizen_id = ? LIMIT 1",
      [citizenId]
    );

    if (rows[0]) {
      textResponse(res, 409, "Duplicate citizen ID");
      return;
    }

    await db().execute(
      "INSERT INTO voters (citizen_id, laser_id, is_enabled, has_voted) VALUES (?, ?, 1, 0)",
      [citizenId, laserId]
    );

    textResponse(res, 200, "Voter added");
  })
);

app.patch(
  "/admin/voters/:id/toggle",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const citizenId = String(req.params.id || "").trim();
    const [rows] = await db().execute(
      "SELECT is_enabled FROM voters WHERE citizen_id = ? LIMIT 1",
      [citizenId]
    );
    const voter = rows[0];

    if (!voter) {
      textResponse(res, 404, "Voter not found");
      return;
    }

    const enabled = parseToggleValue(req.body?.enabled ?? req.body?.status, !Boolean(voter.is_enabled));
    await db().execute("UPDATE voters SET is_enabled = ? WHERE citizen_id = ?", [
      enabled ? 1 : 0,
      citizenId,
    ]);

    textResponse(res, 200, enabled ? "Voter enabled" : "Voter disabled");
  })
);

app.get(
  "/admin/candidates",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    jsonResponse(res, 200, await fetchCandidateProfiles(false));
  })
);

app.post(
  "/admin/candidates",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const candidateId = firstNonEmpty(req.body?.candidate_id, req.body?.id);
    const name = String(req.body?.name || "").trim();
    const [rows] = await db().execute(
      "SELECT candidate_id FROM candidates WHERE candidate_id = ? LIMIT 1",
      [candidateId]
    );

    if (rows[0]) {
      textResponse(res, 409, "Duplicate candidate ID");
      return;
    }

    await db().execute(
      `
        INSERT INTO candidates (candidate_id, password, name, policies, is_enabled)
        VALUES (?, NULL, ?, '', 1)
      `,
      [candidateId, name]
    );

    textResponse(res, 200, "Candidate added");
  })
);

app.patch(
  "/admin/candidates/:id/toggle",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const candidateId = String(req.params.id || "").trim();
    const candidate = await fetchCandidateById(candidateId);

    if (!candidate) {
      textResponse(res, 404, "Candidate not found");
      return;
    }

    const enabled = parseToggleValue(
      req.body?.enabled ?? req.body?.status,
      !Boolean(candidate.is_enabled)
    );
    await db().execute("UPDATE candidates SET is_enabled = ? WHERE candidate_id = ?", [
      enabled ? 1 : 0,
      candidateId,
    ]);

    textResponse(res, 200, enabled ? "Candidate enabled" : "Candidate disabled");
  })
);

app.patch(
  "/admin/voting/toggle",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const current = await appStatus();
    const enabled = parseToggleValue(req.body?.enabled ?? req.body?.status, current.voting !== "enable");
    current.voting = enabled ? "enable" : "disable";
    await saveAppStatus(current);

    textResponse(res, 200, enabled ? "Voting enabled" : "Voting disabled");
  })
);

app.get(
  "/admin/results",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    jsonResponse(res, 200, await getResultsPayload(String(req.query.query || ""), false));
  })
);

app.patch(
  "/admin/status/:type",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    const type = String(req.params.type || "");
    const enabled = String(req.body?.status || "").trim().toLowerCase() === "enable" ? 1 : 0;

    if (type === "voting") {
      const current = await appStatus();
      current.voting = enabled ? "enable" : "disable";
      await saveAppStatus(current);
      textResponse(res, 200, enabled ? "Voting enabled" : "Voting disabled");
      return;
    }

    if (type === "candidate") {
      const candidateId = String(req.body?.candidate_id || "").trim();
      if (!candidateId) {
        textResponse(res, 400, "Candidate ID is required");
        return;
      }

      await db().execute("UPDATE candidates SET is_enabled = ? WHERE candidate_id = ?", [
        enabled,
        candidateId,
      ]);
      textResponse(res, 200, enabled ? "Candidate enabled" : "Candidate disabled");
      return;
    }

    if (type === "voter") {
      const citizenId = String(req.body?.citizen_id || "").trim();
      if (!citizenId) {
        textResponse(res, 400, "Citizen ID is required");
        return;
      }

      await db().execute("UPDATE voters SET is_enabled = ? WHERE citizen_id = ?", [
        enabled,
        citizenId,
      ]);
      textResponse(res, 200, enabled ? "Voter enabled" : "Voter disabled");
      return;
    }

    textResponse(res, 400, "Unsupported status type");
  })
);

app.get(
  "/admin/dashboardam",
  asyncHandler(async (req, res) => {
    if (!requireSessionRole(req, res, "admin")) {
      return;
    }

    jsonResponse(res, 200, {
      ...(await getAdminDashboardPayload()),
      results: await getResultsPayload(String(req.query.search || ""), false),
    });
  })
);

app.post("/logout", (req, res) => {
  clearSession(req, res);
  textResponse(res, 200, "Logged out");
});

app.get("/", (req, res) => {
  res.redirect("/mfu-Voting-Login/Voting-Login.html");
});

app.get("/password/raw", (req, res) => {
  const raw = String(req.query.text ?? req.query.password ?? "");
  const salt = crypto.randomBytes(16).toString("hex");
  const hashed = crypto.scryptSync(raw, salt, 64).toString("hex");
  textResponse(res, 200, `scrypt$${salt}$${hashed}`);
});

app.use((req, res) => {
  textResponse(res, 404, "Not found");
});

app.use((error, req, res, next) => {
  console.error(error);
  textResponse(res, 500, "Server error");
});

export default app;
