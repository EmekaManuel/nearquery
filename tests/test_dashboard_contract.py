"""The dashboard registry, the data contract and the downloads agree with each other."""
import json
import re

from pipeline import config

R = config.ROOT


def test_every_chart_references_files_that_exist():
    ts = (R / "dashboard" / "lib" / "charts.ts").read_text()
    for f in set(re.findall(r'"(\d\d_[a-z_]+\.sql)"', ts)):
        assert (R / "pipeline" / "sql" / f).exists(), f
    for f in set(re.findall(r'extraFiles: \["([^"]+)"', ts)):
        assert (R / f).exists(), f
    build = (R / "dashboard" / "build.py").read_text()
    downloads = set(re.findall(r'"([a-z_]+)"', re.search(r"DOWNLOADS = \[(.*?)\]", build, re.S).group(1)))
    for csv in set(re.findall(r'csv: "([a-z_]+)"', ts)):
        assert csv in downloads and (R / "data" / "metrics" / f"{csv}.csv").exists(), csv


def test_chart_ids_are_unique():
    ts = (R / "dashboard" / "lib" / "charts.ts").read_text()
    ids = re.findall(r'^\s+id: "([a-z-]+)"', ts, re.M)
    assert len(ids) == len(set(ids)) >= 12


def test_dashboard_json_has_the_contract_the_site_reads():
    p = R / "dashboard" / "data" / "dashboard.json"
    if not p.exists():
        import pytest
        pytest.skip("run `make dashboard` first")
    d = json.loads(p.read_text())
    for k in ("meta", "daily", "monthly", "weekly", "flows", "peers", "obs", "scenarios", "facts"):
        assert k in d
    assert d["peers"]["rows"] and d["facts"]["yieldTrigger"] > 0
