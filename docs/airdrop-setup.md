# NovaDeploy — Genuine 30,000-recipient distribution planning

This branch adds a **planning-only** BNB Smart Chain allocation workspace to the React/Vite dashboard.

## How to use
1. Open the allocation workspace below the token creation wizard.
2. Download the 30,000-row CSV template. Rows contain **empty** wallet addresses; no wallets are generated.
3. Collect opt-in recipient addresses from people who want to participate. Preserve an auditable consent record.
4. Import the CSV. The browser validates EVM address shape, BNB Chain designation, and case-insensitive duplicates.
5. Enter the total token budget and the actual token decimals. The UI calculates equal token-unit allocations with bigint arithmetic and displays any remainder.
6. Download a **review-only** allocation CSV. This is **not** an instruction to execute transfers.

## What is intentionally not automated
- Creating or purchasing wallets to manufacture a holder count.
- Scraping unrelated blockchain addresses and distributing unsolicited tokens.
- Claiming CSV flags prove consent, wallet ownership, or anti-sybil review.
- Sending transactions, funding liquidity, or reporting planned recipients as on-chain holders.
- Using a user-set reference price as an executable market quote.

## Backend work required before real distribution
- Implement authenticated campaign management, rate limiting, and encrypted consent records.
- Verify wallet control with a nonce-based SIWE-style signature, server-side signature validation, expiration, replay prevention, and chain ID 56.
- Review duplicates and sybil patterns; do not rely on a CSV's self-reported flags.
- Snapshot eligible recipients and allocations; publish a cryptographic commitment and allow recipients to review.
- For large distributions, evaluate an audited claim contract or Merkle distributor rather than 30,000 individually signed transfers.
- Require funding checks, security review, transaction simulation, and explicit wallet approval before deployment or token transfers.
- Track claims using confirmed BSC events and distinguish **registered**, **eligible**, **claimed**, and **current holders**.
- Query current holders from an indexed transfer-event pipeline, accounting for zero balances, burns, contracts, and pool addresses. Do not infer current holders from a list of transfers.
- Use server-side secrets and scoped admin roles. Do not put private keys or Etherscan keys in client code.

## Build checks
Run `npm install`, `npm run lint`, and `npm run build` in CI or a trusted checkout. No production deployment or blockchain transaction is part of this branch. The live Hostinger site is not updated by this PR.

## Accuracy warning
The existing repository contains prepopulated example deployment, transaction, audit, and performance claims. Those are not verified by this change. They should be removed or explicitly labeled as sample data before a production release.
