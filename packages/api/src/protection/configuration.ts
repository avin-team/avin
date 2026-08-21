import { env } from "@avin/env/server";

import type { ProtectionLaunchConfiguration } from "./launch-gates";

export const getProtectionLaunchConfiguration =
  (): ProtectionLaunchConfiguration => ({
    gates: {
      custody: env.AVIN_CHECK_CUSTODY_APPROVED,
      dataGovernance: env.AVIN_CHECK_DATA_GOVERNANCE_APPROVED,
      legalReview: env.AVIN_CHECK_LEGAL_REVIEW_APPROVED,
      programEntity: env.AVIN_CHECK_PROGRAM_ENTITY_APPROVED,
    },
    mode: env.AVIN_CHECK_MODE,
  });
