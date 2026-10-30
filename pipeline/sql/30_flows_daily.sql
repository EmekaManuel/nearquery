-- Deposits (mt_mint, memo=deposit), withdrawals (mt_burn, memo=withdraw) and refunds, by origin chain of the asset.
-- Excludes failed receipts. NFT (nep171) mints/burns are excluded by the asset filter in mt_usd.
SELECT date, memo AS kind, origin_chain,
       sum(usd) AS usd, count(*) AS n, count(*) FILTER (WHERE usd IS NULL) AS unpriced_n
FROM mt_usd
WHERE NOT failed
GROUP BY ALL ORDER BY date, kind, origin_chain;
