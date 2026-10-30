-- Active accounts in swaps by address format, plus concentration. Format is a descriptive label,
-- NOT a user/solver classification (solver identification is a separate, documented step).
WITH per AS (
  SELECT date, account_id,
         CASE WHEN regexp_matches(account_id, '^0x[0-9a-fA-F]{40}$') THEN 'evm_address'
              WHEN regexp_matches(account_id, '^[0-9a-f]{64}$') THEN 'implicit_hex'
              ELSE 'named_account' END AS fmt,
         sum(usd_best) FILTER (WHERE amount_raw > 0 AND usd_best IS NOT NULL) AS vol
  FROM legs_usd WHERE NOT failed GROUP BY ALL),
ranked AS (SELECT *, row_number() OVER (PARTITION BY date ORDER BY coalesce(vol, 0) DESC) AS rk FROM per)
SELECT date,
       count(*) AS accounts,
       count(*) FILTER (WHERE fmt = 'evm_address') AS evm_address,
       count(*) FILTER (WHERE fmt = 'implicit_hex') AS implicit_hex,
       count(*) FILTER (WHERE fmt = 'named_account') AS named_account,
       sum(vol) FILTER (WHERE rk <= 5) / nullif(sum(vol), 0) AS top5_share_of_leg_sum
FROM ranked GROUP BY date ORDER BY date;
