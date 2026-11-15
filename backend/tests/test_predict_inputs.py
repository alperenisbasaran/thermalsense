"""
/predict says what its heatmap was built from.

The map has a raw-data / product comparison, and the raw half is only worth
looking at if it shows what the model was really given.  For terrain that is
121 fetched elevations: the other 40,280 cells of the grid are interpolated
between them.  So the wire carries the fetched samples themselves, and these
tests pin that it is those samples — in the heatmap's own row order, on the
heatmap's own patch of ground — rather than something that merely has the
right length.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np

import main
from config import GRID_RADIUS, GRID_RES, TERRAIN_RES
from pipeline.feature_engineering import FEATURE_COUNT


def _meteo():
    return {
        "temp_2m": 24.0, "humidity": 0.4, "wind_speed": 6.0, "wind_dir": 270.0,
        "cape": 400.0, "cin": 5.0, "solar_ghi": 650.0,
        "temp_850": 12.0, "temp_500": -14.0, "lapse_rate": 7.5,
        "cape_base": 2200, "pbl_height": 1800.0, "soil_temp": 26.0,
    }


def _patch_predict_deps(monkeypatch, terrain):
    async def meteo(lat, lon, forecast_h):
        return _meteo()

    async def elev(lat, lon):
        return terrain

    async def gliders():
        return []

    class _Model:
        def predict(self, features):
            n = features.shape[0]
            return np.full(n, 0.4), np.full(n, 0.1)

    monkeypatch.setattr(main, "fetch_meteo_features", meteo)
    monkeypatch.setattr(main, "fetch_elevation_grid", elev)
    monkeypatch.setattr(main, "fetch_ogn_gliders", gliders)
    monkeypatch.setattr(main, "model", _Model())


def _position_coded_grid():
    """Every cell holds its own (row, col), so a value says where it came from."""
    n = round(2 * GRID_RADIUS / GRID_RES) + 1
    rows, cols = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    return (rows * 1_000 + cols).astype(float)


async def test_predict_reports_the_samples_the_terrain_was_built_on(monkeypatch):
    _patch_predict_deps(monkeypatch, _position_coded_grid())
    out = await main.predict(lat=47.1, lon=13.1)
    inputs = out["inputs"]

    step = round(TERRAIN_RES / GRID_RES)
    n = round(2 * GRID_RADIUS / TERRAIN_RES) + 1
    assert (inputs["elevation_rows"], inputs["elevation_cols"]) == (n, n)
    # Row-major from the south-west corner, exactly as heatmap is: the client
    # places sample k with the same index arithmetic it uses for a cell.
    assert inputs["elevation"] == [
        i * step * 1_000 + j * step for i in range(n) for j in range(n)
    ]


async def test_raw_samples_span_the_same_ground_as_the_heatmap(monkeypatch):
    """First and last sample are the grid's own corners — the raw view and the
    heatmap are drawn from one centre and one radius, so they must cover one
    patch."""
    terrain = _position_coded_grid()
    _patch_predict_deps(monkeypatch, terrain)
    out = await main.predict(lat=47.1, lon=13.1)

    elevation = out["inputs"]["elevation"]
    assert elevation[0] == terrain[0, 0]
    assert elevation[-1] == terrain[-1, -1]
    assert (out["rows"], out["cols"]) == terrain.shape


async def test_feature_count_is_read_off_the_matrix(monkeypatch):
    """The client shows this number, and it changes whenever the pipeline does —
    which is exactly when a copy kept anywhere else would go stale."""
    _patch_predict_deps(monkeypatch, _position_coded_grid())
    out = await main.predict(lat=47.1, lon=13.1)
    assert out["inputs"]["feature_count"] == FEATURE_COUNT


async def test_raw_samples_are_plain_ints_on_the_wire(monkeypatch):
    """The interpolation leaves ~1e-12 of float noise on the values it passes
    through; a sample must go out as the metre that was fetched, and as a JSON
    number rather than a numpy scalar the encoder would reject."""
    _patch_predict_deps(monkeypatch, _position_coded_grid() + 1e-9)
    out = await main.predict(lat=47.1, lon=13.1)
    elevation = out["inputs"]["elevation"]
    assert all(type(v) is int for v in elevation)
    assert elevation[1] == round(TERRAIN_RES / GRID_RES)
