import { z } from "zod";

import type { WithdrawalAction } from "../types";

export const createWithdrawalActionFormSchema = (
  action: WithdrawalAction | null
) =>
  z
    .object({ value: z.string().trim().max(5000) })
    .superRefine((form, context) => {
      if (action !== "APPROVE" && !form.value) {
        context.addIssue({
          code: "custom",
          message:
            action === "REJECT"
              ? "Vui lòng nhập lý do từ chối."
              : "Vui lòng nhập mã giao dịch ngân hàng.",
          path: ["value"],
        });
      }
    });

export interface WithdrawalActionFormValues {
  value: string;
}
