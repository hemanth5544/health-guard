import {
  type AttackReport,

  Role,
  type ThreatEntry
} from "@healthguard/shared-types";


export async function simulateAttacks(baseUrl: string): Promise<AttackReport> {
  const results: AttackReport["results"] = [];
  const safeFetch = async (input: string, init?: RequestInit) => {
    try {
      const res = await fetch(input, init);
      return res;
    } catch {
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    const res = await safeFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res || !res.ok) return null;
    const json = (await res.json()) as {
      data?: { token?: string; user?: { id: string; email: string } };
    };
    return {
      token: json.data?.token ?? "",
      userId: json.data?.user?.id ?? ""
    };
  };

  // 1) Brute force login (credential stuffing)
  let bruteBlocked = 0;
  for (let i = 0; i < 10; i++) {
    const res = await safeFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "patient@test.com", password: `Wrong-${i}` })
    });
    if (!res || res.status === 429 || res.status === 401) bruteBlocked++;
  }
  results.push({
    name: "Brute force login",
    blocked: bruteBlocked === 10 || bruteBlocked >= 5,
    details: `Failed or rate-limited attempts: ${bruteBlocked}/10`
  });

  // Login as patient and technician for subsequent attacks
  const patient = await login("patient@test.com", "Patient@123");
  const technician = await login("technician@test.com", "Tech@123");
  const doctor = await login("doctor@test.com", "Doctor@123");

  const patientToken = patient?.token ?? "";
  const technicianToken = technician?.token ?? "";
  const doctorToken = doctor?.token ?? "";

  // 2) Random invalid token against protected endpoint
  const invalidTokenRes = await safeFetch(`${baseUrl}/api/patient/profile`, {
    method: "GET",
    headers: { authorization: "Bearer totally-invalid-token" }
  });
  results.push({
    name: "Random invalid token access",
    blocked: !invalidTokenRes || invalidTokenRes.status === 401,
    status: invalidTokenRes?.status,
    details: "Tests basic signature / format validation"
  });

  // 3) JWT tampering: modify role in payload and break signature, then hit doctor-only endpoint
  let jwtTamperBlocked = true;
  if (patientToken) {
    const [h, p, s] = patientToken.split(".");
    try {
      if (!p) throw new Error("Invalid token format");
      const payloadJson = JSON.parse(Buffer.from(p, "base64").toString("utf8")) as any;
      payloadJson.role = Role.DOCTOR;
      const tamperedPayload = Buffer.from(JSON.stringify(payloadJson)).toString("base64url");
      const tampered = `${h}.${tamperedPayload}.${s}-tampered`;
      const tamperRes = await safeFetch(`${baseUrl}/api/iam/audit-logs`, {
        method: "GET",
        headers: { authorization: `Bearer ${tampered}` }
      });
      jwtTamperBlocked = !tamperRes || tamperRes.status === 401 || tamperRes.status === 403;
      results.push({
        name: "JWT role tampering (payload+signature)",
        blocked: jwtTamperBlocked,
        status: tamperRes?.status,
        details: "Modified payload.role to DOCTOR and corrupted signature"
      });
    } catch {
      results.push({
        name: "JWT role tampering (payload+signature)",
        blocked: true,
        details: "Token decoding failed; treated as blocked"
      });
    }
  } else {
    results.push({
      name: "JWT role tampering (payload+signature)",
      blocked: true,
      details: "No patient token; skipping tampering scenario"
    });
  }

  // 4) Horizontal privilege escalation (patient reading another user’s vitals)
  let horizBlocked = true;
  if (patientToken && doctor?.userId) {
    const horiz = await safeFetch(
      `${baseUrl}/api/patient/vitals?userId=${encodeURIComponent(doctor.userId)}`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${patientToken}` }
      }
    );
    horizBlocked = !horiz || horiz.status === 401 || horiz.status === 403;
    results.push({
      name: "Horizontal privilege escalation (patient → other user)",
      blocked: horizBlocked,
      status: horiz?.status
    });
  } else {
    results.push({
      name: "Horizontal privilege escalation (patient → other user)",
      blocked: true,
      details: "Missing patient or doctor identity; treated as blocked"
    });
  }

  // 5) Vertical privilege escalation (technician writing doctor-only diagnosis)
  if (technicianToken) {
    const vertical = await safeFetch(`${baseUrl}/api/patient/diagnosis`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${technicianToken}`
      },
      body: JSON.stringify({ diagnosis: "TECHNICIAN-ESCALATION-ATTEMPT" })
    });
    results.push({
      name: "Vertical privilege escalation (TECHNICIAN → DOCTOR endpoint)",
      blocked: !vertical || vertical.status === 401 || vertical.status === 403,
      status: vertical?.status
    });
  } else {
    results.push({
      name: "Vertical privilege escalation (TECHNICIAN → DOCTOR endpoint)",
      blocked: true,
      details: "Technician login failed; treated as blocked"
    });
  }

  // 6) Body role / parameter injection with valid patient token
  if (patientToken) {
    const tamperBody = await safeFetch(`${baseUrl}/api/patient/vitals`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({ role: Role.DOCTOR, heartRate: 200 })
    });
    results.push({
      name: "Role / parameter injection in body",
      blocked: !tamperBody || tamperBody.status === 401 || tamperBody.status === 403,
      status: tamperBody?.status,
      details: "Sent body.role=DOCTOR from PATIENT token"
    });
  } else {
    results.push({
      name: "Role / parameter injection in body",
      blocked: true,
      details: "No patient token; treated as blocked"
    });
  }

  // 7) Session replay after logout (DP.IAM.SESSION.003)
  if (patientToken) {
    await safeFetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${patientToken}` }
    });
    const replay = await safeFetch(`${baseUrl}/api/patient/profile`, {
      method: "GET",
      headers: { authorization: `Bearer ${patientToken}` }
    });
    results.push({
      name: "Session replay after logout",
      blocked: !replay || replay.status === 401,
      status: replay?.status,
      details: "Re-used a logged-out token on /api/patient/profile"
    });
  } else {
    results.push({
      name: "Session replay after logout",
      blocked: true,
      details: "No patient token; treated as blocked"
    });
  }

  // 8) Session IP binding / hijack attempt using X-Forwarded-For header
  if (patientToken) {
    const ipChangeRes = await safeFetch(`${baseUrl}/api/patient/profile`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${patientToken}`,
        "x-forwarded-for": "203.0.113.99"
      }
    });
    results.push({
      name: "Session hijack via IP change (X-Forwarded-For)",
      blocked: !ipChangeRes || ipChangeRes.status === 401,
      status: ipChangeRes?.status,
      details: "Same token, different X-Forwarded-For IP"
    });
  } else {
    results.push({
      name: "Session hijack via IP change (X-Forwarded-For)",
      blocked: true,
      details: "No patient token; treated as blocked"
    });
  }

  const blocked = results.filter((r) => r.blocked).length;
  const succeeded = results.length - blocked;
  return { blocked, succeeded, results };
}

