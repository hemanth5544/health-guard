import { PrismaClient, Role, Severity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptAadhaar } from "../src/security/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: "patient@test.com",
      password: "Patient@123",
      role: Role.PATIENT,
      aadhaarLast4: "4521",
      aadhaarFull: "123412344521"
    },
    {
      email: "technician@test.com",
      password: "Tech@123",
      role: Role.TECHNICIAN
    },
    {
      email: "doctor@test.com",
      password: "Doctor@123",
      role: Role.DOCTOR
    }
  ] as const;

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        role: u.role,
        aadhaarLast4: "aadhaarLast4" in u ? u.aadhaarLast4 : null,
        aadhaarEnc:
          "aadhaarFull" in u ? encryptAadhaar(u.aadhaarFull) : null
      },
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        aadhaarLast4: "aadhaarLast4" in u ? u.aadhaarLast4 : null,
        aadhaarEnc:
          "aadhaarFull" in u ? encryptAadhaar(u.aadhaarFull) : null,
        patientRecord:
          u.role === Role.PATIENT
            ? {
                create: {
                  bloodPressure: "120/80",
                  heartRate: 72,
                  oxygenLevel: 98.5,
                  temperature: 36.8,
                  weight: 68.2,
                  bloodGroup: "O+",
                  techNotes: "Baseline vitals captured"
                }
              }
            : undefined
      }
    });
  }

  const patient = await prisma.user.findUnique({
    where: { email: "patient@test.com" }
  });

  if (patient) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: patient.id,
          action: "LOGIN",
          resource: "/api/auth/login",
          ipAddress: "127.0.0.1",
          statusCode: 200,
          severity: Severity.INFO,
          details: { seed: true }
        },
        {
          userId: patient.id,
          action: "ACCESS_DENIED",
          resource: "/api/iam/audit-logs",
          ipAddress: "127.0.0.1",
          statusCode: 403,
          severity: Severity.WARNING,
          details: { seed: true }
        }
      ]
    });
  }

  await prisma.intrusionAttempt.create({
    data: {
      ipAddress: "127.0.0.1",
      attemptType: "BRUTE_FORCE",
      payload: { seed: true, attempts: 6 },
      blocked: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

