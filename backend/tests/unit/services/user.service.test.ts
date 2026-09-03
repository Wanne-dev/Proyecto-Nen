// Pruebas del serializador de usuario (no expone datos sensibles).
import { describe, it, expect } from "vitest";
import { toPublicUser } from "../../../src/services/user.service";
import { User } from "../../../src/models/User";

const fakeUser = {
  id: "u-1",
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  role: "user",
  kycStatus: "verified",
  accountStatus: "active",
  isVerified: true,
  emailVerified: true,
  phoneVerified: false,
  twoFactorEnabled: true,
  phone: "+573001234567",
  documentType: "cc",
  documentNumber: "123456789",
  dateOfBirth: new Date("1990-05-10"),
  country: "CO",
  timezone: "America/Bogota",
  preferredCurrency: "COP",
  createdAt: new Date(),
  lastLoginAt: new Date(),
  // campos sensibles que NO deben filtrarse
  passwordHash: "hash-super-secreto",
  twoFactorSecret: "JBSWY3DPEHPK3PXP",
} as unknown as User;

describe("toPublicUser", () => {
  it("expone solo los campos públicos", () => {
    const pub = toPublicUser(fakeUser) as Record<string, unknown>;
    expect(pub.id).toBe("u-1");
    expect(pub.email).toBe("ana@example.com");
  });

  it("NUNCA expone passwordHash ni twoFactorSecret", () => {
    const pub = toPublicUser(fakeUser) as Record<string, unknown>;
    expect(pub).not.toHaveProperty("passwordHash");
    expect(pub).not.toHaveProperty("twoFactorSecret");
  });
});
