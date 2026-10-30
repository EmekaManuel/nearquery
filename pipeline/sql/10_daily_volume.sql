-- Daily swap volume under two explicit definitions. Failed receipts are excluded.
--   leg_sum_usd : sum of positive token_diff legs across every entry (user AND solver side). This is the
--                 definition that reproduces NEAR's reported public volume (see METHODOLOGY).
--   net_swap_usd: leg_sum_usd / 2, the value that actually changed hands once per swap.
-- leg_sum_usd = leg_sum_priced_usd (price table) + leg_sum_imputed_usd (value-conservation imputation, see 00_setup).
-- Positive legs still without a value after both steps are counted in unvalued_pos_legs: leg_sum_usd is a lower bound.
SELECT date,
       coalesce(sum(usd_best) FILTER (WHERE amount_raw > 0 AND NOT failed), 0) AS leg_sum_usd,
       coalesce(sum(usd_best) FILTER (WHERE amount_raw > 0 AND NOT failed), 0) / 2 AS net_swap_usd,
       coalesce(sum(usd) FILTER (WHERE amount_raw > 0 AND NOT failed), 0) AS leg_sum_priced_usd,
       coalesce(sum(usd_imputed) FILTER (WHERE amount_raw > 0 AND NOT failed), 0) AS leg_sum_imputed_usd,
       count(*) FILTER (WHERE amount_raw > 0 AND NOT failed) AS pos_legs,
       count(*) FILTER (WHERE amount_raw > 0 AND NOT failed AND usd IS NULL) AS unpriced_pos_legs,
       count(*) FILTER (WHERE amount_raw > 0 AND NOT failed AND usd_best IS NULL) AS unvalued_pos_legs,
       count(DISTINCT account_id) FILTER (WHERE NOT failed) AS active_accounts,
       count(DISTINCT intent_hash) FILTER (WHERE NOT failed) AS intents,
       count(DISTINCT receipt_id) FILTER (WHERE NOT failed) AS swap_receipts,
       count(DISTINCT intent_hash) FILTER (WHERE failed) AS failed_intents
FROM legs_usd
GROUP BY date ORDER BY date;
