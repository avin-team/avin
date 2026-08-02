# Use a double-entry ledger for all financial movements

Every Avin financial event will be an immutable Transaction containing balanced debit and credit Postings to LedgerAccounts, while wallet balance columns remain a materialized read model that must reconcile with those Postings. This is more schema and transaction work than a single-entry event log, but establishes one auditable invariant for deposits, holds, escrow release, commission, refunds, SellerWallet balances, and withdrawals before those later flows depend on the ledger.
