-- Daily demand-side view: user accounts (non-solver) vs solver accounts, from two-account swap receipts only.
-- user_volume_usd = positive legs held by user accounts = the value users receive (≈ net swap volume).
SELECT l.date,
       count(DISTINCT l.account_id) FILTER (WHERE r.role = 'user') AS user_accounts,
       count(DISTINCT l.account_id) FILTER (WHERE r.role = 'solver') AS solver_accounts,
       count(DISTINCT l.receipt_id) AS paired_swaps,
       sum(l.usd_best) FILTER (WHERE r.role = 'user' AND l.amount_raw > 0) AS user_volume_usd,
       sum(l.usd_best) FILTER (WHERE r.role = 'solver' AND l.amount_raw > 0) AS solver_volume_usd
FROM legs_usd l
JOIN pair_receipts p USING (receipt_id)
JOIN account_roles r ON r.account_id = l.account_id
WHERE NOT l.failed
GROUP BY l.date ORDER BY l.date;
