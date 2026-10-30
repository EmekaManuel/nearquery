-- Account quality since the contiguous cache start (2026-04-01): how many accounts are single-use, by address format.
-- Basis for "active accounts are not users" in THESIS.md.
WITH s AS (SELECT account_id, date, entry_id FROM legs WHERE NOT failed AND date >= DATE '2026-04-01' GROUP BY ALL),
a AS (SELECT account_id, count(*) AS n_entries, count(DISTINCT date) AS n_days,
        CASE WHEN regexp_matches(account_id, '^[0-9a-f]{64}$') THEN 'implicit_hex'
             WHEN regexp_matches(account_id, '^0x[0-9a-fA-F]{40}$') THEN 'evm_address' ELSE 'named_account' END AS fmt
      FROM s GROUP BY 1)
SELECT fmt, count(*) AS accounts, avg((n_days = 1)::INT) AS share_one_day,
       avg((n_entries = 1)::INT) AS share_single_entry, avg(n_entries) AS mean_entries
FROM a GROUP BY 1 ORDER BY 2 DESC;
