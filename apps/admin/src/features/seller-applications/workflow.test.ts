import { expect, it } from "vitest";

import { maskBankAccount } from "./workflow";

it("masks bank account numbers", () => {
  expect(maskBankAccount("1234567890")).toBe("**** 7890");
});
