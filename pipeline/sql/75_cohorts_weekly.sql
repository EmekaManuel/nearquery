-- Weekly user cohorts: cohort = ISO week of an account's first successful swap in the window (users only).
-- Restricted to the contiguous part of the cache (>= 2026-04-06, first full ISO week) so cache gaps cannot look like churn.
-- Cohorts before the 5th week of the window are left-censored (existing users look "new") and are flagged.
WITH u AS (
  SELECT DISTINCT l.account_id, CAST(date_trunc('week', l.date) AS DATE) AS wk
  FROM legs l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' AND l.date >= DATE '2026-04-06'),  -- contiguous cache starts 2026-04-01; weeks start Monday
f AS (SELECT account_id, min(wk) AS cohort FROM u GROUP BY 1),
w0 AS (SELECT min(wk) AS first_wk FROM u)
SELECT f.cohort AS cohort_week, date_diff('week', f.cohort, u.wk) AS weeks_since,
       count(*) AS active_users,
       (SELECT count(*) FROM f f2 WHERE f2.cohort = f.cohort) AS cohort_size,
       f.cohort < (SELECT first_wk + INTERVAL 5 WEEK FROM w0) AS left_censored
FROM u JOIN f USING (account_id)
GROUP BY f.cohort, u.wk ORDER BY 1, 2;
