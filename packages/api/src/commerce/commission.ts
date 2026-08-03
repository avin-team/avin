export interface EscrowReleaseAmounts {
  commissionAmount: number;
  sellerProceeds: number;
}

export const calculateEscrowReleaseAmounts = (
  escrowAmount: number,
  commissionRatePercent: number
): EscrowReleaseAmounts => {
  if (
    !Number.isSafeInteger(escrowAmount) ||
    escrowAmount <= 0 ||
    !Number.isFinite(commissionRatePercent) ||
    commissionRatePercent < 0 ||
    commissionRatePercent > 100
  ) {
    throw new Error("Escrow release amounts are invalid");
  }

  const commissionAmount = Math.floor(
    (escrowAmount * commissionRatePercent) / 100
  );
  return {
    commissionAmount,
    sellerProceeds: escrowAmount - commissionAmount,
  };
};
