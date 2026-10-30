-- Protocol-level fees_collected (token_diff `fees_collected`, priced) and NEAR gas burned by intents.near.
SELECT o.block_date AS date,
       f.fees_usd, f.unpriced_fee_rows,
       o.n_outcomes, o.n_failed, o.tokens_burnt_near, o.gas_burnt,
       o.tokens_burnt_near * np.price AS tokens_burnt_usd
FROM (SELECT CAST(block_date AS DATE) AS block_date, * EXCLUDE (block_date) FROM read_parquet('{RAW}/outcomes/*.parquet')) o
LEFT JOIN (SELECT date, sum(usd) AS fees_usd, count(*) FILTER (WHERE usd IS NULL) AS unpriced_fee_rows
           FROM fees_usd WHERE NOT failed GROUP BY date) f ON f.date = o.block_date
LEFT JOIN prices_filled np ON np.price_key = 'coingecko:near' AND np.date = o.block_date
ORDER BY o.block_date;
