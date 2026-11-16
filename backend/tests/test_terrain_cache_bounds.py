"""
The two terrain caches are bounded, and the point cache is journalled.

Both were plain dicts with no limit.  Between 7 and 15 Nov 2026 that was 28 OOM
kills on the training node: a 316 KB grid kept for every centre ever asked
about, 770,770 point elevations restored at every start, and the whole point
cache re-serialised every 50 new points.  See TERRAIN_GRID_CACHE in config.py.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json

import numpy as np
import pytest

import data.terrain_client as tc
from data.terrain_client import (
    cached_elevation, fetch_elevation_batch, fetch_elevation_grid, snap_grid_centre,
)

REC = tc._POINT_REC.itemsize


def _elev_at(lat: float, lon: float) -> int:
    """A plausible elevation that still identifies the point it belongs to."""
    return int(round(abs(lat) * 37 + abs(lon) * 11)) % 4000


@pytest.fixture(autouse=True)
def _empty_caches():
    tc._elev_cache.clear()
    tc._grid_cache.clear()
    yield
    tc._elev_cache.clear()
    tc._grid_cache.clear()


@pytest.fixture
def api(monkeypatch):
    """Answer every elevation request from _elev_at and record the URLs."""
    urls = []

    class _R:
        status_code = 200

        def __init__(self, pts):
            self._pts = pts

        def raise_for_status(self):
            pass

        def json(self):
            return {"results": [{"elevation": _elev_at(la, lo)} for la, lo in self._pts]}

    async def fake_get(client, url, max_retries=3):
        urls.append(url)
        raw = url.split("locations=")[1]
        return _R([tuple(float(v) for v in p.split(",")) for p in raw.split("|")])

    async def no_sleep(_):
        pass

    monkeypatch.setattr(tc, "_get_with_retry", fake_get)
    monkeypatch.setattr(tc, "_get_client", lambda: None)
    monkeypatch.setattr(tc.asyncio, "sleep", no_sleep)
    return urls


def _restart():
    """What a new process starts with: nothing in memory, whatever is on disk."""
    tc._elev_cache.clear()
    tc._grid_cache.clear()
    tc._point_unsaved.clear()
    tc._journal_records = 0
    tc._journal_clean = True


def _journal() -> np.ndarray:
    return np.fromfile(tc._journal_path(), dtype=tc._POINT_REC)


# --- grid cache --------------------------------------------------------------

CENTRES = [(40.0 + i, 30.0) for i in range(5)]      # a degree apart: nothing shared


async def test_grid_cache_holds_no_more_than_its_bound(api, monkeypatch):
    """The leak itself: one 316 KB array per centre, for as long as the process lived."""
    monkeypatch.setattr(tc, "TERRAIN_GRID_CACHE", 3)
    for lat, lon in CENTRES:
        await fetch_elevation_grid(lat, lon)

    assert len(tc._grid_cache) == 3
    kept = {key[:2] for key in tc._grid_cache}
    assert kept == {snap_grid_centre(*c) for c in CENTRES[-3:]}, "the newest three stay"


async def test_an_evicted_grid_comes_back_from_disk_unchanged(api, monkeypatch):
    """What makes the bound free: falling out costs a file read, not a fetch."""
    monkeypatch.setattr(tc, "TERRAIN_GRID_CACHE", 2)
    first = (await fetch_elevation_grid(*CENTRES[0])).copy()
    for lat, lon in CENTRES[1:]:
        await fetch_elevation_grid(lat, lon)
    assert snap_grid_centre(*CENTRES[0]) not in {k[:2] for k in tc._grid_cache}

    tc._elev_cache.clear()          # so only the grid file can answer
    fetched = len(api)
    again = await fetch_elevation_grid(*CENTRES[0])

    assert len(api) == fetched, "an evicted grid went back to the network"
    assert np.array_equal(again, first)


async def test_a_grid_that_is_read_is_not_the_next_to_go(api, monkeypatch):
    """Least recently *used*.  /predict on one area while the sampler walks the
    world must not have its grid aged out by fetch order."""
    monkeypatch.setattr(tc, "TERRAIN_GRID_CACHE", 2)
    a, b, c = CENTRES[:3]
    await fetch_elevation_grid(*a)
    await fetch_elevation_grid(*b)
    await fetch_elevation_grid(*a)      # read, not fetched
    await fetch_elevation_grid(*c)

    kept = {key[:2] for key in tc._grid_cache}
    assert kept == {snap_grid_centre(*a), snap_grid_centre(*c)}


async def test_the_same_array_is_returned_while_it_is_cached(api):
    """Callers get the cached object, not a copy — a hit must stay allocation-free."""
    one = await fetch_elevation_grid(*CENTRES[0])
    two = await fetch_elevation_grid(*CENTRES[0])
    assert one is two


# --- point cache: the bound --------------------------------------------------

def _points(n: int, start: int = 0) -> list[tuple[float, float]]:
    return [(round(10.0 + (start + i) * 0.01, 2), 20.0) for i in range(n)]


async def test_point_cache_holds_no_more_than_its_bound(api, monkeypatch):
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 100)
    pts = _points(250)
    out = await fetch_elevation_batch(pts, max_requests=10)

    assert all(out[p] == _elev_at(*p) for p in pts), "the bound must not cost the caller an answer"
    assert len(tc._elev_cache) == 100
    assert list(tc._elev_cache) == pts[-100:], "the oldest go first"


async def test_a_point_that_is_read_outlives_points_that_are_not(api, monkeypatch):
    """The ground under an airfield is fetched once and read every frame."""
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 5)
    first = _points(5)
    await fetch_elevation_batch(first)
    assert cached_elevation(*first[0]) == _elev_at(*first[0])     # the read

    await fetch_elevation_batch(_points(4, start=5))

    assert cached_elevation(*first[0]) == _elev_at(*first[0]), "the point in use was evicted"
    assert cached_elevation(*first[1]) is None, "an unused point outlived a used one"


async def test_sea_level_is_a_cache_hit(monkeypatch):
    """0 m is an elevation.  Tested by truthiness it would be refetched forever."""
    calls = []

    class _R:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"results": [{"elevation": 0}]}

    async def fake_get(client, url, max_retries=3):
        calls.append(url)
        return _R()

    monkeypatch.setattr(tc, "_get_with_retry", fake_get)
    monkeypatch.setattr(tc, "_get_client", lambda: None)

    assert (await fetch_elevation_batch([(52.0, 4.0)]))[(52.0, 4.0)] == 0
    assert (await fetch_elevation_batch([(52.0, 4.0)]))[(52.0, 4.0)] == 0
    assert len(calls) == 1
    assert cached_elevation(52.0, 4.0) == 0


# --- point cache: the journal ------------------------------------------------

async def test_a_flush_appends_only_the_new_points(api):
    """The old flush rewrote every point it had ever seen, every 50 points."""
    await fetch_elevation_batch(_points(60))
    assert tc._journal_path().stat().st_size == 60 * REC
    before = tc._journal_path().read_bytes()

    await fetch_elevation_batch(_points(60, start=60))

    after = tc._journal_path().read_bytes()
    assert len(after) == 120 * REC
    assert after[: len(before)] == before, "the existing records were rewritten"


async def test_fewer_than_a_batch_waits_for_the_forced_flush(api):
    await fetch_elevation_batch(_points(10))
    assert not tc._journal_path().exists()

    tc.flush_point_cache(force=True)        # what the lifespan does on shutdown
    assert tc._journal_path().stat().st_size == 10 * REC
    assert tc._point_unsaved == []


async def test_points_survive_a_restart_exactly(api):
    """Keys are the coordinates that were sampled, at whatever precision, so
    they have to come back as the same floats or every lookup misses."""
    coarse = [(39.81, 30.52), (-33.9, 18.4), (0.0, -0.01), (64.13, -21.94)]
    fine   = [(39.8123, 30.5187), (-33.9249, 18.4241)]
    await fetch_elevation_batch(coarse)
    await fetch_elevation_batch(fine, dp=4)
    tc.flush_point_cache(force=True)

    _restart()
    tc.load_caches()

    for lat, lon in coarse:
        assert cached_elevation(lat, lon) == _elev_at(lat, lon)
    for lat, lon in fine:
        assert cached_elevation(lat, lon, 4) == _elev_at(lat, lon)
    fetched = len(api)
    await fetch_elevation_batch(coarse)
    assert len(api) == fetched, "a restored point was fetched again"


async def test_restart_keeps_the_most_recent_when_the_journal_holds_more(api, monkeypatch):
    await fetch_elevation_batch(_points(60))
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 20)

    _restart()
    tc.load_caches()

    assert list(tc._elev_cache) == _points(60)[-20:]
    assert tc._journal_records == 60, "the file still holds all sixty"


async def test_the_journal_is_replaced_once_it_outgrows_the_cache(api, monkeypatch):
    """Append-only would be the same leak moved to the disk."""
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 10)
    monkeypatch.setattr(tc, "_POINT_FLUSH_EVERY", 5)
    for batch in range(4):                              # 5, 10, 15, 20 records
        await fetch_elevation_batch(_points(5, start=batch * 5))
    assert tc._journal_path().stat().st_size == 20 * REC, "up to twice the cache is appended"

    await fetch_elevation_batch(_points(5, start=20))   # 25 would be over

    rec = _journal()
    assert len(rec) == 10
    assert list(zip(rec["lat"].tolist(), rec["lon"].tolist())) == _points(25)[-10:]
    assert rec["elev"].tolist() == [_elev_at(*p) for p in _points(25)[-10:]]
    assert not tc._journal_path().with_suffix(".bin.tmp").exists()


async def test_a_torn_record_is_ignored_and_never_appended_after(api):
    """A kill mid-append leaves part of a record.  It must not be read as a
    shorter number, and nothing may be written after it out of alignment."""
    await fetch_elevation_batch(_points(60))
    whole = tc._journal_path().read_bytes()
    tc._journal_path().write_bytes(whole + whole[:7])           # 60 records and 7 bytes

    _restart()
    tc.load_caches()
    assert len(tc._elev_cache) == 60
    assert tc._journal_clean is False

    await fetch_elevation_batch([(55.5, 5.5)])
    tc.flush_point_cache(force=True)

    assert tc._journal_path().stat().st_size == 61 * REC, "the torn tail is still in the file"
    _restart()
    tc.load_caches()
    assert len(tc._elev_cache) == 61
    assert cached_elevation(55.5, 5.5) == _elev_at(55.5, 5.5)


def test_records_that_name_no_place_are_dropped(tmp_path):
    rec = np.array([(39.81, 30.52, 850), (float("nan"), 30.52, 1), (120.0, 30.52, 2),
                    (39.82, 400.0, 3), (-33.9, 18.4, 12)], dtype=tc._POINT_REC)
    tc._CACHE_DIR.mkdir(parents=True)
    tc._journal_path().write_bytes(rec.tobytes())

    tc.load_caches()

    assert dict(tc._elev_cache) == {(39.81, 30.52): 850, (-33.9, 18.4): 12}


async def test_a_failed_flush_keeps_the_points_for_the_next_one(api, monkeypatch, tmp_path):
    """A full disk must not cost the fetch its answer, nor lose what was fetched."""
    good = tc._CACHE_DIR
    blocker = tmp_path / "not-a-directory"
    blocker.write_text("x")
    monkeypatch.setattr(tc, "_CACHE_DIR", blocker / "cache")

    out = await fetch_elevation_batch(_points(60))
    assert all(v is not None for v in out.values())
    assert len(tc._point_unsaved) == 60

    monkeypatch.setattr(tc, "_CACHE_DIR", good)
    tc.flush_point_cache(force=True)
    assert tc._journal_path().stat().st_size == 60 * REC
    assert tc._point_unsaved == []


def test_no_elevation_can_make_a_flush_raise():
    """Persistence sits inside fetch_elevation_batch.  A nodata sentinel wider
    than the record's field must cost that one value, not the fetch."""
    tc._cache_point((10.0, 20.0), 10**40)
    tc._cache_point((10.01, 20.0), -(10**40))
    tc._cache_point((10.02, 20.0), 850)

    tc.flush_point_cache(force=True)        # the append
    tc._rewrite_journal()                   # and the replacement

    assert _journal()["elev"].tolist() == [2**31 - 1, -2**31, 850]


# --- carrying the old cache over ---------------------------------------------

def _write_legacy(entries: dict) -> bytes:
    """points.json exactly as the code being replaced wrote it."""
    tc._CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = tc._legacy_points_path()
    path.write_text(json.dumps({f"{la},{lo}": v for (la, lo), v in entries.items()}),
                    encoding="utf-8")
    return path.read_bytes()


LEGACY = {(39.81, 30.52): 850, (-33.9, 18.4): 12, (0.0, -0.01): 0, (52.0, 4.0): -3,
          (39.8123, 30.5187): 846, (64.13, -21.94): 37, (1e-05, 2.5): 5}


def test_the_old_points_file_is_carried_over_once():
    original = _write_legacy(LEGACY)

    tc.load_caches()

    assert dict(tc._elev_cache) == LEGACY
    assert list(tc._elev_cache) == list(LEGACY), "fetch order is the only recency it had"
    assert len(_journal()) == len(LEGACY)
    assert tc._legacy_points_path().read_bytes() == original, \
        "the previous image still reads this file; a rollback must find it as it was"

    # From now on the journal answers, whatever the old file says.
    _write_legacy({(39.81, 30.52): 1})
    _restart()
    tc.load_caches()
    assert dict(tc._elev_cache) == LEGACY


def test_the_import_passes_through_the_bound(monkeypatch):
    """770,770 points were on the node.  Loading them all to keep 200,000 is
    the startup cost this exists to remove."""
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 3)
    _write_legacy(LEGACY)

    tc.load_caches()

    assert list(tc._elev_cache) == list(LEGACY)[-3:]
    assert len(_journal()) == 3


def test_the_import_never_parses_the_file_as_one_object(monkeypatch):
    """json.loads builds the whole dict of strings before the first entry can
    be bounded; that transient is what took the node to its limit at startup."""
    _write_legacy(LEGACY)

    def refuse(*a, **k):
        raise AssertionError("the old point cache was parsed whole")

    monkeypatch.setattr(json, "loads", refuse)
    monkeypatch.setattr(json, "load", refuse)
    tc.load_caches()

    assert dict(tc._elev_cache) == LEGACY


@pytest.mark.parametrize("name, content", [
    ("points.bin", b""),                                # created, never written
    ("points.json", b"\xff\xfe not json at all"),       # not even text
    ("points.json", b'{"39.81,30.52": 850, "39.8'),     # cut off mid-entry
])
def test_an_unreadable_cache_costs_a_cold_start_not_the_start(name, content):
    """load_caches runs in the lifespan: raising here is a restart loop."""
    tc._CACHE_DIR.mkdir(parents=True)
    (tc._CACHE_DIR / name).write_bytes(content)

    tc.load_caches()

    # The one whole entry before the cut is still worth having.
    assert dict(tc._elev_cache) in ({}, {(39.81, 30.52): 850})


def test_a_start_with_nothing_on_disk_is_empty_and_quiet():
    tc.load_caches()
    assert len(tc._elev_cache) == 0
    assert tc._journal_clean is True
    assert not tc._CACHE_DIR.exists(), "loading must not create anything"


# --- the gauge ---------------------------------------------------------------

async def test_cache_sizes_are_reported_against_their_bounds(api, monkeypatch):
    """Nothing reported these, so the growth was found in kernel OOM records."""
    monkeypatch.setattr(tc, "TERRAIN_POINT_CACHE", 500)
    await fetch_elevation_grid(*CENTRES[0])

    cached = tc.source_usage()["cached"]
    assert cached["grids"] == 1 and cached["grids_max"] == tc.TERRAIN_GRID_CACHE
    assert cached["points"] == 121 and cached["points_max"] == 500
    # The API answers 100 points a request and each request ends in a flush: the
    # first hundred are on disk, the last 21 are under a batch and wait.
    assert cached["points_unsaved"] == 21
    assert tc._journal_path().stat().st_size == 100 * REC
