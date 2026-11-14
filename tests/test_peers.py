"""The peer-fee selection rule is fixed and testable without the network."""
from pipeline.peers import MIN_VOLUME, select


def row(fees, vol, cat="Bridge"):
    return {"total30d": fees, "category": cat}, {"total30d": vol}


def test_rule_keeps_bridges_with_enough_volume_and_computes_fees_per_million():
    f_a, v_a = row(1_500_000, 1_000_000_000)
    f_b, v_b = row(10, 10_000_000)                 # too little volume
    f_c, v_c = row(500, 5_000_000_000, "DEX Aggregator")  # wrong category
    f_d, v_d = row(0, 2_000_000_000)               # no fees
    out = select({"A": f_a, "B": f_b, "C": f_c, "D": f_d}, {"A": v_a, "B": v_b, "C": v_c, "D": v_d}, {})
    assert list(out.protocol) == ["A"] and out.fees_per_1m_usd.iloc[0] == 1500
    assert MIN_VOLUME == 100e6


def test_bridge_aggregators_are_included_by_the_aggregator_table():
    f, v = row(26_000, 1_000_000_000, "Whatever")
    out = select({"Agg": f}, {}, {"Agg": v})
    assert list(out.category) == ["Bridge Aggregator"] and out.fees_per_1m_usd.iloc[0] == 26
