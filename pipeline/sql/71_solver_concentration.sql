-- Share of user-received volume served by the top 1 / 3 / 5 solvers, per month.
WITH v AS (
  SELECT date_trunc('month', l.date) AS month, l.account_id, sum(l.usd_best) FILTER (WHERE l.amount_raw > 0) AS vol
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'solver' GROUP BY ALL),
k AS (SELECT *, row_number() OVER (PARTITION BY month ORDER BY coalesce(vol, 0) DESC) AS rk FROM v)
SELECT CAST(month AS DATE) AS month, (SELECT count(DISTINCT date) FROM legs WHERE date_trunc('month', date) = k.month) AS days_covered, count(*) AS active_solvers,
       sum(vol) FILTER (WHERE rk = 1) / sum(vol) AS top1_share,
       sum(vol) FILTER (WHERE rk <= 3) / sum(vol) AS top3_share,
       sum(vol) FILTER (WHERE rk <= 5) / sum(vol) AS top5_share,
       sum(power(vol, 2)) / power(sum(vol), 2) AS hhi
FROM k GROUP BY k.month ORDER BY month;
