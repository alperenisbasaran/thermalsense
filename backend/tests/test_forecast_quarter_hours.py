"""
The forecast slider steps every 15 minutes over the first three hours.

Open-Meteo answers hourly, so a quarter-hour offset is interpolated between the
two hours either side of it.  What these tests pin:

- a whole-hour offset reads exactly the slot it always read — in particular
  forecast_h = 0 is still the current hour, which is what the live sampler
  pairs its training labels with;
- wind direction is interpolated round the shorter arc;
- /predict rounds the offset to a quarter hour once, so the weather lookup and
  the time-of-day columns describe the same moment and the meteo cache sees a
  bounded set of keys.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timedelta, timezone

import numpy as np
import pytest
from fastapi.testclient import TestClient

import main
from data import meteo_client as mc
from data.meteo_client import _hour_slots, _interp


def _times(hours: int = 48) -> list[str]:
    base = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    return [(base + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00")
            for h in range(hours)]


# ---------------------------------------------------------------------------
# Slot arithmetic
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("offset", [0, 1, 3, 12])
def test_a_whole_offset_reads_one_slot(offset):
    now = datetime.now(timezone.utc)
    assert _hour_slots(_times(), offset) == (now.hour + offset, now.hour + offset, 0.0)


@pytest.mark.parametrize("offset,whole,w", [(0.25, 0, 0.25), (0.5, 0, 0.5),
                                            (1.75, 1, 0.75), (2.25, 2, 0.25)])
def test_a_quarter_offset_sits_between_two_slots(offset, whole, w):
    now = datetime.now(timezone.utc)
    i0, i1, got = _hour_slots(_times(), offset)
    assert (i0, i1) == (now.hour + whole, now.hour + whole + 1)
    assert got == pytest.approx(w)


def test_past_the_end_of_the_array_it_clamps_rather_than_reading_off_it():
    times = _times(hours=24)
    i0, i1, w = _hour_slots(times, 500.5)
    assert i0 == i1 == len(times) - 1 and w == 0.0


# ---------------------------------------------------------------------------
# Interpolation
# ---------------------------------------------------------------------------

def test_w_zero_returns_the_first_value_untouched():
    assert _interp(17.3, 99.0, 0.0, -1) == 17.3
    # Including a missing one: that went to _FALLBACK before, and still does.
    assert _interp(None, 99.0, 0.0, -1) == -1


def test_one_missing_side_uses_the_other_not_the_fallback():
    assert _interp(10.0, None, 0.5, -1) == 10.0
    assert _interp(None, 20.0, 0.5, -1) == 20.0
    assert _interp(None, None, 0.5, -1) == -1


def test_linear_between_two_values():
    assert _interp(10.0, 20.0, 0.25, -1) == pytest.approx(12.5)


@pytest.mark.parametrize("a,b,w,want", [
    (350.0, 10.0, 0.5, 0.0),     # through north, not through south
    (10.0, 350.0, 0.5, 0.0),
    (350.0, 10.0, 0.25, 355.0),
    (90.0, 180.0, 0.5, 135.0),
])
def test_wind_direction_takes_the_short_way_round(a, b, w, want):
    assert _interp(a, b, w, -1, circular=True) == pytest.approx(want)


# ---------------------------------------------------------------------------
# fetch_meteo_features over a real-shaped response
# ---------------------------------------------------------------------------

class _Ramp:
    """Every variable equals its own slot index, so a value says where it came from.
    Wind direction alternates 350 / 10 so each step crosses north."""
    status_code = 200
    def raise_for_status(self): pass
    def json(self):
        t = _times()
        n = len(t)
        ramp = [float(i) for i in range(n)]
        hourly = {k: list(ramp) for k in mc.HOURLY_VARS}
        hourly["time"] = t
        hourly["relativehumidity_2m"] = [50.0 + i for i in range(n)]
        hourly["winddirection_10m"] = [350.0 if i % 2 == 0 else 10.0 for i in range(n)]
        return {"hourly": hourly}


@pytest.fixture
def ramp(monkeypatch):
    calls = []

    class Client:
        async def get(self, url, params=None):
            calls.append(params)
            return _Ramp()

    monkeypatch.setattr(mc, "_get_client", lambda: Client())
    monkeypatch.setattr(mc, "_live_cache", {})
    monkeypatch.setattr(mc, "_live_hour", "")
    monkeypatch.setattr(mc, "_live_usage", {"day": "", "requests": 0, "cache_hits": 0,
                                            "historical_requests": 0,
                                            "historical_cache_hits": 0})
    return calls


async def test_now_is_still_the_current_hour(ramp):
    """The live sampler trains on forecast_h = 0; it must read what it always read."""
    out = await mc.fetch_meteo_features(39.8, 30.1, 0, strict=True)
    assert out["temp_2m"] == datetime.now(timezone.utc).hour


async def test_a_quarter_hour_moves_a_quarter_of_the_way(ramp):
    h = datetime.now(timezone.utc).hour
    q1 = await mc.fetch_meteo_features(39.8, 30.1, 0.25)
    q3 = await mc.fetch_meteo_features(39.8, 30.1, 2.75)
    assert q1["temp_2m"] == pytest.approx(h + 0.25)
    assert q1["solar_ghi"] == pytest.approx(h + 0.25)
    assert q1["humidity"] == pytest.approx((50.0 + h + 0.25) / 100)
    assert q3["temp_2m"] == pytest.approx(h + 2.75)


async def test_derived_values_follow_the_interpolated_temperatures(ramp):
    out = await mc.fetch_meteo_features(39.8, 30.1, 0.5)
    assert out["lapse_rate"] == pytest.approx((out["temp_850"] - out["temp_500"]) / 3.5)


async def test_a_whole_hour_matches_the_slot_exactly(ramp):
    h = datetime.now(timezone.utc).hour
    out = await mc.fetch_meteo_features(39.8, 30.1, 1)
    assert out["temp_2m"] == h + 1
    assert out["wind_dir"] == (10.0 if (h + 1) % 2 else 350.0)


async def test_halfway_between_350_and_10_is_north(ramp):
    out = await mc.fetch_meteo_features(39.8, 30.1, 0.5)
    assert out["wind_dir"] == pytest.approx(0.0)


async def test_each_quarter_is_its_own_cache_entry(ramp):
    a = await mc.fetch_meteo_features(39.8, 30.1, 0.25)
    b = await mc.fetch_meteo_features(39.8, 30.1, 0.25)
    c = await mc.fetch_meteo_features(39.8, 30.1, 0.5)
    assert a is b and a["temp_2m"] != c["temp_2m"]
    assert len(ramp) == 2


# ---------------------------------------------------------------------------
# /predict
# ---------------------------------------------------------------------------

def _meteo():
    return {
        "temp_2m": 24.0, "humidity": 0.4, "wind_speed": 6.0, "wind_dir": 270.0,
        "cape": 400.0, "cin": 5.0, "solar_ghi": 650.0,
        "temp_850": 12.0, "temp_500": -14.0, "lapse_rate": 7.5,
        "cape_base": 2200, "pbl_height": 1800.0, "soil_temp": 26.0,
    }


@pytest.fixture
def predict_deps(monkeypatch):
    seen = {}

    async def meteo(lat, lon, forecast_h):
        seen["forecast_h"] = forecast_h
        return _meteo()

    async def elev(lat, lon):
        return np.full((201, 201), 900.0)

    async def gliders():
        return []

    real_build = main.build_feature_matrix

    def build(*a, **k):
        seen["dt"] = k["dt"]
        return real_build(*a, **k)

    class _Model:
        def predict(self, features):
            n = features.shape[0]
            return np.full(n, 0.4), np.full(n, 0.1)

    monkeypatch.setattr(main, "fetch_meteo_features", meteo)
    monkeypatch.setattr(main, "fetch_elevation_grid", elev)
    monkeypatch.setattr(main, "fetch_ogn_gliders", gliders)
    monkeypatch.setattr(main, "build_feature_matrix", build)
    monkeypatch.setattr(main, "model", _Model())
    return seen


@pytest.mark.parametrize("asked,used", [(0.3, 0.25), (1.6, 1.5), (2.75, 2.75), (5, 5)])
async def test_predict_rounds_to_the_quarter_and_uses_it_for_both_clocks(
        predict_deps, asked, used):
    before = datetime.now(timezone.utc)
    await main.predict(lat=39.8, lon=30.1, forecast_h=asked)
    after = datetime.now(timezone.utc)
    assert predict_deps["forecast_h"] == used
    # The time-of-day columns describe the same moment the weather was read for.
    assert (before + timedelta(hours=used)
            <= predict_deps["dt"]
            <= after + timedelta(hours=used))


@pytest.mark.parametrize("bad", ["-1", "24.5", "nan"])
def test_predict_refuses_an_offset_outside_the_forecast_window(bad):
    res = TestClient(main.app).get(f"/predict?lat=39.8&lon=30.1&forecast_h={bad}")
    assert res.status_code == 422


def test_predict_accepts_a_quarter_hour_over_http(predict_deps):
    res = TestClient(main.app).get("/predict?lat=39.8&lon=30.1&forecast_h=0.75")
    assert res.status_code == 200
    assert predict_deps["forecast_h"] == 0.75
