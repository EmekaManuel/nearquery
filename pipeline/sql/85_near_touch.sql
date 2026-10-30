-- Share of user-received volume where the user sold or bought NEAR itself (NEAR, wNEAR, stNEAR), per month.
WITH u AS (
  SELECT l.date, l.entry_id,
         bool_or(l.symbol IN ('NEAR', 'wNEAR', 'STNEAR', 'stNEAR')) AS touches_near,
         max(l.usd_best) FILTER (WHERE l.amount_raw > 0) AS usd
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' GROUP BY l.date, l.entry_id)
SELECT CAST(date_trunc('month', date) AS DATE) AS month, count(DISTINCT date) AS days_covered, sum(usd) AS user_volume_usd,
       sum(usd) FILTER (WHERE touches_near) AS near_touching_usd,
       sum(usd) FILTER (WHERE touches_near) / sum(usd) AS near_touching_share
FROM u GROUP BY 1 ORDER BY 1;
