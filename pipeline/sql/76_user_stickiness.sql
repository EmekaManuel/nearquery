-- Per month: how many distinct users, what share transacted on >=2 / >=5 distinct days, and share of
-- user-received volume from the top 100 users. (Counts days active within the month only.)
WITH d AS (
  SELECT date_trunc('month', l.date) AS month, l.account_id, count(DISTINCT l.date) AS n_days,
         sum(l.usd_best) FILTER (WHERE l.amount_raw > 0) AS vol
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' GROUP BY ALL),
k AS (SELECT *, row_number() OVER (PARTITION BY month ORDER BY coalesce(vol, 0) DESC) AS rk FROM d)
SELECT CAST(month AS DATE) AS month, (SELECT count(DISTINCT date) FROM legs WHERE date_trunc('month', date) = k.month) AS days_covered, count(*) AS users,
       avg((n_days >= 2)::INT) AS share_2plus_days, avg((n_days >= 5)::INT) AS share_5plus_days,
       sum(vol) FILTER (WHERE rk <= 100) / sum(vol) AS top100_volume_share, sum(vol) AS user_volume_usd
FROM k GROUP BY k.month ORDER BY month;
