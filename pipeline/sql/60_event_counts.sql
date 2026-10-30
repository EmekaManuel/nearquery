-- All DIP-4 / NEP-245 events seen in intents.near logs, per day.
SELECT CAST(block_date AS DATE) AS date, standard, event, failed, sum(n) AS n
FROM read_parquet('{RAW}/events/*.parquet')
GROUP BY ALL ORDER BY 1, 2, 3, 4;
