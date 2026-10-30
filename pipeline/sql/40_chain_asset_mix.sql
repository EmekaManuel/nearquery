-- Swap volume mix by asset origin chain and symbol (positive legs, priced). leg-sum basis: both sides counted.
SELECT date, coalesce(origin_chain, 'unknown') AS origin_chain, coalesce(symbol, asset) AS symbol,
       sum(usd_best) AS leg_sum_usd, sum(usd_imputed) AS imputed_usd, count(*) AS legs
FROM legs_usd
WHERE amount_raw > 0 AND NOT failed AND usd_best IS NOT NULL
GROUP BY ALL ORDER BY date, leg_sum_usd DESC;
