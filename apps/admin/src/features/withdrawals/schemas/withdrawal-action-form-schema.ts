import { z } from "zod";

import type { WithdrawalAction } from "../types";

export const createWithdrawalActionFormSchema = (
  action: WithdrawalAction | null
) =>
  z
    .object({ value: z.string().trim().max(5000) })
    .superRefine((form, context) => {
      if (action === "REJECT" && !form.value) {
        context.addIssue({
          code: "custom",
          message: "Vui lòng nhập lý do từ chối.",
          path: ["value"],
        });
      }
    });

export interface WithdrawalActionFormValues {
  value: string;
}
