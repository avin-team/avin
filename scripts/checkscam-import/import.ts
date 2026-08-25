import path from "node:path";

import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import {
  protectionPolicyVersion,
  protectionProviderApplication,
  protectionProviderProfile,
  protectionProviderProfileRevision,
  protectionProviderProfileVersion,
} from "@avin/db/schema/protection";
import type {
  ProviderOfficialChannels,
  ProviderRegisteredBankAccounts,
  ProviderTier,
} from "@avin/db/schema/protection";
import { eq, inArray, like, sql } from "drizzle-orm";

interface CheckScamProviderRecord {
  bio?: string;
  displayName: string;
  location?: string;
  officialChannels?: ProviderOfficialChannels;
  recognizedBondAmount: number;
  recommendedTransactionLimit: number;
  registeredBankAccounts?: ProviderRegisteredBankAccounts;
  services: string;
  slug: string;
  source?: string;
  tier: ProviderTier;
  verifiedAt?: string;
}

const ensurePolicyVersion = async () => {
  const [existing] = await db
    .select()
    .from(protectionPolicyVersion)
    .orderBy(protectionPolicyVersion.createdAt)
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(protectionPolicyVersion)
    .values({
      effectiveAt: new Date("2024-01-01"),
      materialChange: false,
      materialChangeMetadata: { changedAreas: [], rationale: "Initial policy" },
      membershipFeeAmount: 0,
      minimumBondAmount: 1_000_000,
      retentionPolicyReference: "default",
      summary: "Avin Check Provider Policy",
      terms: "Chính sách đối tác Avin Check.",
      title: "Chính sách đối tác v1.0",
      version: "v1.0",
    })
    .returning();

  if (!created) {
    throw new Error("Không thể tạo phiên bản chính sách mặc định.");
  }
  return created;
};

const cleanImportedCheckScamData = async () => {
  console.log("🧹 Đang tiến hành xoá dữ liệu đối tác import từ CheckScam...");

  const importedProfiles = await db
    .select({ id: protectionProviderProfile.id })
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.source, "CHECKSCAM"));

  const profileIds = importedProfiles.map((p) => p.id);

  if (profileIds.length > 0) {
    await db.execute(
      sql`ALTER TABLE "protection_provider_profile_version" DISABLE TRIGGER "protection_provider_profile_version_immutable_trigger"`
    );
    try {
      await db
        .delete(protectionProviderProfileVersion)
        .where(inArray(protectionProviderProfileVersion.profileId, profileIds));
    } finally {
      await db.execute(
        sql`ALTER TABLE "protection_provider_profile_version" ENABLE TRIGGER "protection_provider_profile_version_immutable_trigger"`
      );
    }

    await db
      .delete(protectionProviderProfileRevision)
      .where(inArray(protectionProviderProfileRevision.profileId, profileIds));
    await db
      .delete(protectionProviderProfile)
      .where(inArray(protectionProviderProfile.id, profileIds));
  }

  await db
    .delete(protectionProviderApplication)
    .where(eq(protectionProviderApplication.source, "CHECKSCAM"));

  await db.delete(user).where(like(user.id, "checkscam_provider_%"));

  console.log(
    `✅ Đã xoá sạch ${profileIds.length} hồ sơ đối tác import từ CheckScam.`
  );
};

const ensureProviderUser = async (
  record: CheckScamProviderRecord,
  userId: string
) => {
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) {
    await db.insert(user).values({
      email: `${record.slug}@checkscam.vn`,
      emailVerified: true,
      id: userId,
      name: record.displayName,
      role: "BUYER",
    });
  }
};

const upsertProviderApplication = async (
  record: CheckScamProviderRecord,
  userId: string,
  policy: typeof protectionPolicyVersion.$inferSelect,
  verifiedDate: Date
) => {
  const [existingApp] = await db
    .select()
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.providerUserId, userId))
    .limit(1);

  const fallbackAccounts: ProviderRegisteredBankAccounts = [
    {
      accountName: record.displayName.toUpperCase(),
      accountNumber: "0000000000",
      bankCode: "MB",
      isPrimary: true,
    },
  ];

  if (existingApp) {
    await db
      .update(protectionProviderApplication)
      .set({
        bio: record.bio,
        bondAmount: record.recognizedBondAmount,
        fullName: record.displayName,
        location: record.location ?? "Toàn quốc",
        officialChannels: record.officialChannels ?? {},
        policyAcceptedAt: verifiedDate,
        policyVersion: policy.version,
        policyVersionId: policy.id,
        publicDataConsent: true,
        recognizedBondAmount: record.recognizedBondAmount,
        registeredBankAccounts:
          record.registeredBankAccounts ?? fallbackAccounts,
        services: record.services,
        source: "CHECKSCAM",
        status: "APPROVED",
        updatedAt: new Date(),
      })
      .where(eq(protectionProviderApplication.id, existingApp.id));
    return existingApp.id;
  }

  const [newApp] = await db
    .insert(protectionProviderApplication)
    .values({
      bio: record.bio,
      bondAmount: record.recognizedBondAmount,
      fullName: record.displayName,
      location: record.location ?? "Toàn quốc",
      officialChannels: record.officialChannels ?? {},
      policyAcceptedAt: verifiedDate,
      policyVersion: policy.version,
      policyVersionId: policy.id,
      providerUserId: userId,
      publicDataConsent: true,
      recognizedBondAmount: record.recognizedBondAmount,
      registeredBankAccounts: record.registeredBankAccounts ?? fallbackAccounts,
      services: record.services,
      source: "CHECKSCAM",
      status: "APPROVED",
    })
    .returning();

  if (!newApp) {
    throw new Error(`Không thể tạo application cho ${record.displayName}`);
  }
  return newApp.id;
};

const upsertProviderProfile = async (
  record: CheckScamProviderRecord,
  userId: string,
  applicationId: string,
  verifiedDate: Date
) => {
  const [existingProfile] = await db
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, userId))
    .limit(1);

  if (existingProfile) {
    await db
      .update(protectionProviderProfile)
      .set({
        bio: record.bio,
        displayName: record.displayName,
        location: record.location ?? "Toàn quốc",
        officialChannels: record.officialChannels ?? {},
        profileSlug: record.slug,
        services: record.services,
        source: "CHECKSCAM",
        status: "ACTIVE",
        updatedAt: new Date(),
        verifiedAt: verifiedDate,
      })
      .where(eq(protectionProviderProfile.id, existingProfile.id));
    return existingProfile.id;
  }

  const [newProfile] = await db
    .insert(protectionProviderProfile)
    .values({
      applicationId,
      bio: record.bio,
      displayName: record.displayName,
      location: record.location ?? "Toàn quốc",
      officialChannels: record.officialChannels ?? {},
      profileSlug: record.slug,
      providerUserId: userId,
      services: record.services,
      source: "CHECKSCAM",
      status: "ACTIVE",
      verifiedAt: verifiedDate,
    })
    .returning();

  if (!newProfile) {
    throw new Error(`Không thể tạo profile cho ${record.displayName}`);
  }
  return newProfile.id;
};

const upsertProviderProfileVersion = async (
  record: CheckScamProviderRecord,
  profileId: string,
  applicationId: string,
  policyId: string,
  verifiedDate: Date
) => {
  const [existingVersion] = await db
    .select()
    .from(protectionProviderProfileVersion)
    .where(eq(protectionProviderProfileVersion.profileId, profileId))
    .limit(1);

  const fallbackAccounts: ProviderRegisteredBankAccounts = [
    {
      accountName: record.displayName.toUpperCase(),
      accountNumber: "0000000000",
      bankCode: "MB",
      isPrimary: true,
    },
  ];

  if (existingVersion) {
    await db.execute(
      sql`ALTER TABLE "protection_provider_profile_version" DISABLE TRIGGER "protection_provider_profile_version_immutable_trigger"`
    );
    try {
      await db
        .update(protectionProviderProfileVersion)
        .set({
          bio: record.bio,
          displayName: record.displayName,
          location: record.location ?? "Toàn quốc",
          officialChannels: record.officialChannels ?? {},
          policyVersionId: policyId,
          profileSlug: record.slug,
          recognizedBondAmount: record.recognizedBondAmount,
          recommendedTransactionLimit: record.recommendedTransactionLimit,
          registeredBankAccounts:
            record.registeredBankAccounts ?? fallbackAccounts,
          services: record.services,
          source: "CHECKSCAM",
          status: "ACTIVE",
          tier: record.tier,
          verifiedAt: verifiedDate,
        })
        .where(eq(protectionProviderProfileVersion.id, existingVersion.id));
    } finally {
      await db.execute(
        sql`ALTER TABLE "protection_provider_profile_version" ENABLE TRIGGER "protection_provider_profile_version_immutable_trigger"`
      );
    }
    return;
  }

  await db.insert(protectionProviderProfileVersion).values({
    bio: record.bio,
    displayName: record.displayName,
    location: record.location ?? "Toàn quốc",
    officialChannels: record.officialChannels ?? {},
    policyVersionId: policyId,
    profileId,
    profileSlug: record.slug,
    recognizedBondAmount: record.recognizedBondAmount,
    recommendedTransactionLimit: record.recommendedTransactionLimit,
    registeredBankAccounts: record.registeredBankAccounts ?? fallbackAccounts,
    services: record.services,
    source: "CHECKSCAM",
    sourceApplicationId: applicationId,
    status: "ACTIVE",
    tier: record.tier,
    verifiedAt: verifiedDate,
    versionNumber: 1,
  });
};

const importCheckScamData = async () => {
  const dataFilePath = path.resolve(import.meta.dir, "data.json");
  const fileContent = await Bun.file(dataFilePath).text();
  const records: CheckScamProviderRecord[] = JSON.parse(fileContent);

  console.log(
    `🚀 Bắt đầu import ${records.length} hồ sơ đối tác từ CheckScam...`
  );

  const policy = await ensurePolicyVersion();

  for (const record of records) {
    const userId = `checkscam_provider_${record.slug.replaceAll("-", "_")}`;
    const verifiedDate = record.verifiedAt
      ? new Date(record.verifiedAt)
      : new Date();

    await ensureProviderUser(record, userId);
    const applicationId = await upsertProviderApplication(
      record,
      userId,
      policy,
      verifiedDate
    );
    const profileId = await upsertProviderProfile(
      record,
      userId,
      applicationId,
      verifiedDate
    );
    await upsertProviderProfileVersion(
      record,
      profileId,
      applicationId,
      policy.id,
      verifiedDate
    );

    console.log(
      `  ✨ [${record.tier}] ${record.displayName} (slug: ${record.slug}) - Quỹ: ${record.recognizedBondAmount.toLocaleString("vi-VN")} đ`
    );
  }

  console.log("🎉 Hoàn tất import dữ liệu CheckScam!");
};

const main = async () => {
  const isCleanMode =
    process.argv.includes("--clean") ||
    process.argv.includes("--delete") ||
    process.argv.includes("-c");

  if (isCleanMode) {
    await cleanImportedCheckScamData();
    return;
  }

  await importCheckScamData();
};

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error("❌ Lỗi khi thực thi script:", error);
  process.exit(1);
}
