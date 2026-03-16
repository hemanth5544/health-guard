import {
  type AttackReport,
  Role
} from "@healthguard/shared-types";


export async function simulateAttacks(baseUrl: string): Promise<AttackReport> {
  const results: AttackReport["results"] = [];


  const safeFetch = async (input: string, init?: RequestInit) => {
    try {
      return await fetch(input, init);
    } catch {
      return null;
    }
  };

  /** Returns { token, userId } on success, null on failure */
  const login = async (email: string, password: string) => {
    const res = await safeFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res?.ok) return null;
    const json = (await res.json()) as {
      data?: { token?: string; user?: { id: string; email: string } };
    };
    return {
      token: json.data?.token ?? "",
      userId: json.data?.user?.id ?? ""
    };
  };

  /** True if a response body looks like real PHI / patient data */
  const containsData = (body: unknown): boolean => {
    if (!body || typeof body !== "object") return false;
    const s = JSON.stringify(body).toLowerCase();
    return (
      s.includes("heartrate") ||
      s.includes("heart_rate") ||
      s.includes("diagnosis") ||
      s.includes("bloodpressure") ||
      s.includes("blood_pressure") ||
      s.includes("email") ||
      s.includes("aadhaar") ||
      s.includes("dob") ||
      s.includes("name")
    );
  };

  /** Decode a JWT payload without verifying the signature */
  const decodePayload = (token: string): Record<string, unknown> | null => {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  };


  const patient    = await login("patient@test.com",    "Patient@123");
  const technician = await login("technician@test.com", "Tech@123");
  const doctor     = await login("doctor@test.com",     "Doctor@123");

  const patientToken    = patient?.token    ?? "";
  const technicianToken = technician?.token ?? "";
  const doctorToken     = doctor?.token     ?? "";

  // ── 1. Brute-force / credential stuffing ─────────────────────────────────
  {
    let tokenLeaked = false;
    let rateLimited = false;

    for (let i = 0; i < 10; i++) {
      const res = await safeFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "patient@test.com", password: `Wrong-${i}` })
      });
      if (res?.status === 429) { rateLimited = true; break; }
      if (res?.ok) {
        const json = (await res.json()) as { data?: { token?: string } };
        if (json.data?.token) { tokenLeaked = true; break; }
      }
    }

    results.push({
      name: "Brute force / credential stuffing",
      blocked: !tokenLeaked,
      details: tokenLeaked
        ? "BREACH: server issued a token on wrong password"
        : rateLimited
        ? "Rate-limited before 10 attempts — no token leaked"
        : "All 10 attempts rejected (401) — no token leaked"
    });
  }

  // ── 2. Invalid / random token ────────────────────────────────────────────
  {
    const res = await safeFetch(`${baseUrl}/api/patient/profile`, {
      headers: { authorization: "Bearer totally.invalid.token" }
    });
    let body: unknown = null;
    try { body = await res?.json(); } catch { /* ignore */ }

    const gotData = res?.ok && containsData(body);
    results.push({
      name: "Random invalid token access",
      blocked: !gotData,
      status: res?.status,
      details: gotData
        ? "BREACH: server returned patient data with a fabricated token"
        : "Correctly rejected (401/403) — no data returned"
    });
  }

  // ── 3. JWT alg:none attack ────────────────────────────────────────────────
  // GOAL: Strip the signature and set alg="none". A vulnerable server accepts
  //       unsigned tokens because it trusts the algorithm field in the header.
  {
    let breached = false;
    let details  = "No patient token — skipping";

    if (patientToken) {
      const origPayload = decodePayload(patientToken);
      if (origPayload) {
        const noneHeader  = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
        const nonePayload = Buffer.from(JSON.stringify({ ...origPayload, role: Role.DOCTOR })).toString("base64url");
        // Valid alg:none tokens have an empty (but present) third segment
        const noneToken = `${noneHeader}.${nonePayload}.`;

        const res = await safeFetch(`${baseUrl}/api/iam/audit-logs`, {
          headers: { authorization: `Bearer ${noneToken}` }
        });
        let body: unknown = null;
        try { body = await res?.json(); } catch { /* ignore */ }

        breached = res?.ok === true;
        details  = breached
          ? `BREACH: server accepted alg:none token (status ${res?.status}) and returned data`
          : `Correctly rejected alg:none token (status ${res?.status})`;
      } else {
        details = "Could not decode patient token payload";
      }
    }

    results.push({
      name: "JWT alg:none attack (unsigned token accepted)",
      blocked: !breached,
      details
    });
  }

  // ── 4. JWT role tampering (corrupted signature) ───────────────────────────
  // GOAL: Flip role to DOCTOR in the payload, corrupt the signature.
  //       A server that doesn't verify the signature will still accept this.
  {
    let breached = false;
    let details  = "No patient token — skipping";

    if (patientToken) {
      const [h, p, s] = patientToken.split(".");
      const origPayload = decodePayload(patientToken);

      if (origPayload && h && p && s) {
        const tamperedPayload = Buffer.from(
          JSON.stringify({ ...origPayload, role: Role.DOCTOR })
        ).toString("base64url");
        const tamperedToken = `${h}.${tamperedPayload}.${s}TAMPERED`;

        const res = await safeFetch(`${baseUrl}/api/iam/audit-logs`, {
          headers: { authorization: `Bearer ${tamperedToken}` }
        });
        breached = res?.ok === true;
        details  = breached
          ? `BREACH: server accepted tampered JWT (status ${res?.status})`
          : `Correctly rejected tampered JWT (status ${res?.status})`;
      }
    }

    results.push({
      name: "JWT role tampering (payload modified, signature corrupted)",
      blocked: !breached,
      details
    });
  }

  // ── 5. IDOR — horizontal privilege escalation ────────────────────────────
  // GOAL: As a patient, request *another* patient's vitals by guessing/using
  //       a different userId. Check if the server returns their data.
  {
    let breached = false;
    let details  = "No patient or doctor token — skipping";

    if (patientToken && doctor?.userId && patient?.userId) {
      // Use the doctor's userId as the target — patient should never see it
      const res = await safeFetch(
        `${baseUrl}/api/patient/vitals?userId=${encodeURIComponent(doctor.userId)}`,
        { headers: { authorization: `Bearer ${patientToken}` } }
      );
      let body: unknown = null;
      try { body = await res?.json(); } catch { /* ignore */ }

      // Breach = server returned 200 AND the body has data belonging to
      // a different user (or any health data at all)
      const returnedData   = res?.ok && containsData(body);
      const notOwnData     = JSON.stringify(body ?? "").includes(doctor.userId);
      breached = returnedData || notOwnData;

      details = breached
        ? `BREACH: patient token retrieved another user's vitals (status ${res?.status})`
        : `Correctly blocked cross-user vitals request (status ${res?.status})`;
    }

    results.push({
      name: "IDOR / horizontal privilege escalation (patient → other user's vitals)",
      blocked: !breached,
      details
    });
  }

  // ── 6. IDOR — enumerate patient IDs ──────────────────────────────────────
  // GOAL: Iterate numeric IDs 1-20. If any returns data for a user that is
  //       NOT the authenticated patient, the server is vulnerable to IDOR.
  {
    let breached   = false;
    let leakedId   = "";
    let details    = "No patient token — skipping";

    if (patientToken && patient?.userId) {
      for (let id = 1; id <= 20; id++) {
        const candidateId = String(id);
        if (candidateId === patient.userId) continue; // skip own record

        const res = await safeFetch(
          `${baseUrl}/api/patient/vitals?userId=${candidateId}`,
          { headers: { authorization: `Bearer ${patientToken}` } }
        );
        let body: unknown = null;
        try { body = await res?.json(); } catch { /* ignore */ }

        if (res?.ok && containsData(body)) {
          breached  = true;
          leakedId  = candidateId;
          break;
        }
      }

      details = breached
        ? `BREACH: IDOR — patient token exposed record for userId=${leakedId}`
        : "All 20 sequential IDs correctly rejected for cross-patient access";
    }

    results.push({
      name: "IDOR — sequential userId enumeration",
      blocked: !breached,
      details
    });
  }

  // ── 7. Vertical privilege escalation (TECHNICIAN → DOCTOR endpoint) ──────
  // GOAL: Technician tries to write a diagnosis (doctor-only action).
  //       Check if the write actually persisted.
  {
    let breached = false;
    let details  = "Technician login failed — skipping";

    if (technicianToken) {
      const marker = `TECHNICIAN-ESCALATION-${Date.now()}`;
      const writeRes = await safeFetch(`${baseUrl}/api/patient/diagnosis`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${technicianToken}`
        },
        body: JSON.stringify({ diagnosis: marker })
      });

      // Now verify: try to read the diagnosis back with a doctor token
      // If the marker appears, the write succeeded despite the role check
      if (doctorToken) {
        const readRes = await safeFetch(`${baseUrl}/api/patient/diagnosis`, {
          headers: { authorization: `Bearer ${doctorToken}` }
        });
        let body: unknown = null;
        try { body = await readRes?.json(); } catch { /* ignore */ }
        breached = JSON.stringify(body ?? "").includes(marker);
        details  = breached
          ? `BREACH: technician write accepted AND persisted (marker found in doctor read-back)`
          : writeRes?.ok
          ? `Server returned 2xx for technician write but data did NOT persist (check server logic)`
          : `Write correctly rejected (status ${writeRes?.status})`;
      } else {
        breached = writeRes?.ok === true;
        details  = breached
          ? `BREACH: server accepted technician write with 2xx (status ${writeRes?.status})`
          : `Write correctly rejected (status ${writeRes?.status}) — could not verify persistence`;
      }
    }

    results.push({
      name: "Vertical privilege escalation (TECHNICIAN → DOCTOR endpoint)",
      blocked: !breached,
      details
    });
  }

  // ── 8. Body role injection ────────────────────────────────────────────────
  // GOAL: Send role=DOCTOR in the request body using a PATIENT token.
  //       Does the server trust the body role over the JWT role?
  {
    let breached = false;
    let details  = "No patient token — skipping";

    if (patientToken) {
      // Try a doctor-only endpoint with patient token but body claiming DOCTOR role
      const res = await safeFetch(`${baseUrl}/api/patient/diagnosis`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${patientToken}`
        },
        body: JSON.stringify({ role: Role.DOCTOR, diagnosis: "BODY-INJECTION-TEST" })
      });
      breached = res?.ok === true;
      details  = breached
        ? `BREACH: server trusted body.role=DOCTOR over JWT role (status ${res?.status})`
        : `Body role ignored — correctly used JWT role (status ${res?.status})`;
    }

    results.push({
      name: "Body / parameter role injection",
      blocked: !breached,
      details
    });
  }

  // ── 9. Session replay after logout ───────────────────────────────────────
  // GOAL: Log out, then reuse the token. If the server has no token blacklist
  //       (stateless JWT only), the old token still works — a real session flaw.
  {
    let breached = false;
    let details  = "No patient token — skipping";

    if (patientToken) {
      await safeFetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${patientToken}` }
      });

      const replay = await safeFetch(`${baseUrl}/api/patient/profile`, {
        headers: { authorization: `Bearer ${patientToken}` }
      });
      let body: unknown = null;
      try { body = await replay?.json(); } catch { /* ignore */ }

      // Breach = server returned the patient's profile with a logged-out token
      breached = replay?.ok === true && containsData(body);
      details  = breached
        ? `BREACH: logged-out token still returns patient profile (no server-side invalidation)`
        : `Token correctly invalidated after logout (status ${replay?.status})`;
    }

    results.push({
      name: "Session replay after logout (token blacklist absent)",
      blocked: !breached,
      details
    });
  }

  // ── 10. Session hijack via IP spoofing ───────────────────────────────────
  // GOAL: Reuse a valid token with a completely different X-Forwarded-For IP.
  //       If the server binds sessions to the originating IP, this should fail.
  //       If it doesn't, the token works from any IP — hijacking is possible.
  {
    let breached = false;
    let details  = "No patient token — skipping";

    // Re-login to get a fresh token (previous one may be invalidated by logout test)
    const freshPatient = await login("patient@test.com", "Patient@123");
    if (freshPatient?.token) {
      const res = await safeFetch(`${baseUrl}/api/patient/profile`, {
        headers: {
          authorization: `Bearer ${freshPatient.token}`,
          "x-forwarded-for": "203.0.113.99" // completely different IP
        }
      });
      let body: unknown = null;
      try { body = await res?.json(); } catch { /* ignore */ }

      // Breach = server returned data without IP binding check
      // NOTE: Most APIs don't bind to IP (by design); flag as informational
      breached = res?.ok === true && containsData(body);
      details  = breached
        ? `INFO: Token accepted from spoofed IP — no IP binding (status ${res?.status}). ` +
          `Common in stateless JWT systems; only a risk if combined with token theft.`
        : `Session rejected on IP change (status ${res?.status}) — IP binding active`;
    }

    results.push({
      name: "Session hijack via X-Forwarded-For IP spoofing",
      blocked: !breached,
      details
    });
  }


  const blocked   = results.filter(r => r.blocked).length;
  const succeeded = results.length - blocked;   // attacks that broke through

  return { blocked, succeeded, results };
}

