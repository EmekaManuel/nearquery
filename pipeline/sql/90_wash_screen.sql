-- Wash and bot screen on user volume, by month. Two transparent rules, no on-chain labels, so read the result as a
-- screen with stated thresholds, not as proof of wash trading.
--   round-trip: within one user-day, volume that is swapped out and back in the same assets. For each account-day,
--     churn = 1 - (sum over assets of |net value change|) / (sum over assets of gross value moved). A one-way swap
--     has churn 0; A->B then B->A the same day has churn near 1. Round-trip volume = received volume x churn.
--   high-frequency: account-days with at least 50 swaps (bot-like cadence). All of their volume is set aside.
-- Filtered volume = user received volume minus high-frequency volume minus the round-trip part of the rest.
-- Thresholds are the two constants below; METHODOLOGY.md explains why they are stated choices.
WITH per_asset AS (
  SELECT l.date, l.account_id, l.asset,
         sum(l.usd_best) AS net_usd, sum(abs(l.usd_best)) AS gross_usd
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' AND l.usd_best IS NOT NULL GROUP BY ALL),
churn AS (
  SELECT date, account_id, sum(gross_usd) AS gross, sum(abs(net_usd)) AS net,
         greatest(0, 1 - sum(abs(net_usd)) / nullif(sum(gross_usd), 0)) AS churn
  FROM per_asset GROUP BY date, account_id),
vol AS (
  SELECT l.date, l.account_id, sum(l.usd_best) FILTER (WHERE l.amount_raw > 0) AS vol,
         count(DISTINCT l.receipt_id) AS n_swaps
  FROM legs_usd l JOIN pair_receipts USING (receipt_id) JOIN account_roles r ON r.account_id = l.account_id
  WHERE NOT l.failed AND r.role = 'user' GROUP BY ALL),
j AS (
  SELECT v.date, v.account_id, coalesce(v.vol, 0) AS vol, v.n_swaps, coalesce(c.churn, 0) AS churn,
         v.n_swaps >= 50 AS bot_like
  FROM vol v LEFT JOIN churn c USING (date, account_id))
SELECT CAST(date_trunc('month', date) AS DATE) AS month,
       count(DISTINCT date) AS days_covered,
       sum(vol) AS user_volume_usd,
       sum(vol) FILTER (WHERE bot_like) AS high_frequency_usd,
       sum(vol * churn) FILTER (WHERE NOT bot_like) AS round_trip_usd,
       sum(vol) - coalesce(sum(vol) FILTER (WHERE bot_like), 0) - coalesce(sum(vol * churn) FILTER (WHERE NOT bot_like), 0) AS filtered_volume_usd,
       coalesce(sum(vol) FILTER (WHERE bot_like), 0) / sum(vol) AS high_frequency_share,
       coalesce(sum(vol * churn) FILTER (WHERE NOT bot_like), 0) / sum(vol) AS round_trip_share,
       1 - (coalesce(sum(vol) FILTER (WHERE bot_like), 0) + coalesce(sum(vol * churn) FILTER (WHERE NOT bot_like), 0)) / sum(vol) AS kept_share,
       count(*) FILTER (WHERE bot_like) AS bot_like_account_days
FROM j GROUP BY 1 ORDER BY 1;
