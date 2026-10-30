-- Monthly user flow by (origin chain of asset sold -> origin chain of asset bought), USD of the bought leg.
-- Only user-side entries of two-account swaps; entries with an unpriced bought leg are excluded and counted.
WITH u AS (
  SELECT l.date, l.entry_id,
         arg_max(l.origin_chain, -l.amount_raw) FILTER (WHERE l.amount_raw < 0) AS sold_chain,
         arg_max(l.origin_chain, l.amount_raw) FILTER (WHERE l.amount_raw > 0) AS bought_chain,
         max(l.usd_best) FILTER (WHERE l.amount_raw > 0) AS usd
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' GROUP BY l.date, l.entry_id)
SELECT CAST(date_trunc('month', date) AS DATE) AS month, count(DISTINCT date) AS days_covered, sold_chain, bought_chain,
       sum(usd) AS usd, count(*) AS swaps, count(*) FILTER (WHERE usd IS NULL) AS unvalued_swaps
FROM u GROUP BY ALL ORDER BY 1, 6 DESC NULLS LAST;
