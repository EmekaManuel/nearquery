-- Base tables. Inputs: raw parquet cache ({RAW}) plus the `assets` and `prices` tables registered by metrics.py
-- from data/reference/. Nothing here is aggregated; every metric file below builds on these.

-- forward-filled daily price per key (calendar x key), so a missing day reuses the last known price
CREATE OR REPLACE TABLE prices_filled AS
WITH cal AS (SELECT CAST(d AS DATE) AS date FROM generate_series(DATE '2024-12-31', DATE '2026-10-30', INTERVAL 1 DAY) t(d)),
     keys AS (SELECT DISTINCT price_key FROM prices)
SELECT k.price_key, c.date,
       last_value(p.price IGNORE NULLS) OVER (PARTITION BY k.price_key ORDER BY c.date) AS price
FROM keys k CROSS JOIN cal c LEFT JOIN prices p ON p.price_key = k.price_key AND p.date = c.date;

-- one row per (token_diff entry, asset); entry_id identifies one token_diff entry (one account's side of a swap)
CREATE OR REPLACE TABLE legs AS
SELECT entry_id, CAST(ts AS DATE) AS date, ts, failed, intent_hash, account_id, receipt_id,
       e.key AS asset, TRY_CAST(e.value AS DOUBLE) AS amount_raw
FROM (SELECT row_number() OVER () AS entry_id, *,
             unnest(map_entries(CAST(diff::JSON AS MAP(VARCHAR, VARCHAR)))) AS e
      FROM read_parquet('{RAW}/swaps/*.parquet'));

-- usd: priced from the price table. usd_imputed: for an entry with exactly ONE unpriced asset, the value implied
-- by value conservation (minus the sum of the priced legs of the same entry), only if its sign matches the leg.
-- usd_best = usd, else usd_imputed. Imputed values are always reported separately, never silently mixed in.
CREATE OR REPLACE TABLE legs_usd AS
WITH base AS (
  SELECT l.*, a.symbol, a.origin_chain,
         l.amount_raw / pow(10, a.decimals) AS qty,
         CASE WHEN a.price_key = 'USD' THEN 1.0 ELSE p.price END AS price,
         l.amount_raw / pow(10, a.decimals) * CASE WHEN a.price_key = 'USD' THEN 1.0 ELSE p.price END AS usd
  FROM legs l
  LEFT JOIN assets a ON a.asset = l.asset
  LEFT JOIN prices_filled p ON p.price_key = a.price_key AND p.date = l.date),
e AS (
  SELECT *, sum(usd) OVER (PARTITION BY entry_id) AS priced_sum,
         count(*) FILTER (WHERE usd IS NULL) OVER (PARTITION BY entry_id) AS n_unpriced
  FROM base)
SELECT * EXCLUDE (priced_sum, n_unpriced),
       CASE WHEN usd IS NULL AND n_unpriced = 1 AND priced_sum IS NOT NULL
                 AND sign(-priced_sum) = sign(amount_raw) THEN -priced_sum END AS usd_imputed,
       coalesce(usd, CASE WHEN usd IS NULL AND n_unpriced = 1 AND priced_sum IS NOT NULL
                               AND sign(-priced_sum) = sign(amount_raw) THEN -priced_sum END) AS usd_best
FROM e;

-- fees_collected per entry, priced the same way
CREATE OR REPLACE TABLE fees_usd AS
SELECT CAST(f.ts AS DATE) AS date, f.failed, f.e.key AS asset,
       TRY_CAST(f.e.value AS DOUBLE) / pow(10, a.decimals) *
         CASE WHEN a.price_key = 'USD' THEN 1.0 ELSE p.price END AS usd
FROM (SELECT ts, failed, unnest(map_entries(CAST(fees::JSON AS MAP(VARCHAR, VARCHAR)))) AS e
      FROM read_parquet('{RAW}/swaps/*.parquet') WHERE fees <> '{}') f
LEFT JOIN assets a ON a.asset = f.e.key
LEFT JOIN prices_filled p ON p.price_key = a.price_key AND p.date = CAST(f.ts AS DATE);

-- NEP-245 mint/burn (deposits, withdrawals, refunds); token_ids and amounts are parallel arrays
CREATE OR REPLACE TABLE mt_usd AS
SELECT CAST(m.ts AS DATE) AS date, m.failed, m.event, m.memo, m.owner_id, m.asset,
       TRY_CAST(m.amt AS DOUBLE) / pow(10, a.decimals) *
         CASE WHEN a.price_key = 'USD' THEN 1.0 ELSE p.price END AS usd,
       a.origin_chain, a.symbol, a.asset IS NULL AS unknown_asset
FROM (SELECT ts, failed, event, memo, owner_id,
             unnest(from_json(token_ids::JSON, '["VARCHAR"]')) AS asset,
             unnest(from_json(amounts::JSON, '["VARCHAR"]')) AS amt
      FROM read_parquet('{RAW}/mt/*.parquet')) m
LEFT JOIN assets a ON a.asset = m.asset
LEFT JOIN prices_filled p ON p.price_key = a.price_key AND p.date = CAST(m.ts AS DATE)
WHERE m.asset LIKE 'nep141:%' OR m.asset LIKE 'nep245:%';


-- Swap pairing: a receipt whose successful entries belong to exactly two accounts is one user<->solver swap.
CREATE OR REPLACE TABLE pair_receipts AS
SELECT receipt_id, min(account_id) AS a, max(account_id) AS b
FROM (SELECT DISTINCT receipt_id, account_id FROM legs WHERE NOT failed)
GROUP BY receipt_id HAVING count(*) = 2;

-- Solver heuristic (documented in METHODOLOGY): an account is a solver if it faced >= 100 distinct counterparties
-- across the window. Users face a handful of solvers; solvers face thousands of users. Not an on-chain label.
CREATE OR REPLACE TABLE account_roles AS
WITH sides AS (SELECT a AS account_id, b AS cp FROM pair_receipts UNION ALL SELECT b, a FROM pair_receipts)
SELECT account_id, count(DISTINCT cp) AS n_counterparties, count(*) AS n_swaps,
       CASE WHEN count(DISTINCT cp) >= 100 THEN 'solver' ELSE 'user' END AS role
FROM sides GROUP BY account_id;
