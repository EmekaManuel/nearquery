"""The thesis is computed, reproducible and consistent with the thresholds it states."""
import re

from pipeline import config, thesis


def test_thesis_is_reproduced_exactly_from_the_snapshots():
    k = thesis.keys()
    tpl = (config.ROOT / "THESIS.template.md").read_text()
    rendered = re.sub(r"\{\{(\w+)\}\}", lambda m: k[m.group(1)], tpl)
    assert rendered == (config.ROOT / "THESIS.md").read_text(), "THESIS.md is stale: run `make thesis`"


def test_every_placeholder_has_a_computed_value():
    tpl = (config.ROOT / "THESIS.template.md").read_text()
    assert not set(re.findall(r"\{\{(\w+)\}\}", tpl)) - set(thesis.keys())
    assert "{{" not in (config.ROOT / "THESIS.md").read_text()


def test_thresholds_are_defined_once_and_flow_into_the_text():
    k = thesis.keys()
    assert k["t_yield"] == f"{thesis.THRESH['yield'] * 100:.0f}%"
    assert k["t_ints"] == f"{thesis.THRESH['ints']:,}"
    text = (config.ROOT / "THESIS.md").read_text()
    for key in ("t_yield", "t_touch", "t_ints", "t_top5"):
        assert k[key] in text


def test_no_threshold_literals_are_duplicated_elsewhere():
    files = [*(config.ROOT / "dashboard" / "lib").glob("*.ts"), *(config.ROOT / "demo" / "src").glob("*.ts*"), config.ROOT / "dashboard" / "build.py"]
    for f in files:
        txt = f.read_text()
        assert not re.search(r"\b30000\b|\b30,000\b|[^.\d]0\.95\b", txt), f"hard-coded threshold in {f.name}"


def test_triggers_today_matches_the_readings():
    k = thesis.keys()
    assert k["triggers_today"].startswith("none") or "of the four" in k["triggers_today"]
