"""
The plausibility gate at the feed boundary (ogn_client._admit).

Every scenario here was taken from the feed, not imagined: ids shared by
several aircraft that hop between countries (FLR1900FF, 253 jumps of up to
628 km in four hours), "hang gliders" reporting 1,333 km/h (FLR18008D), a
two-fix GPS fault that put an aircraft 3,329 km away and back (ICA3FF433),
altitudes of 65,505 m (FLRDB02DF), and a second receiver delivering fixes a few
seconds behind the first (ICA7C1E9A via YPIP/YPIP2).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import data.ogn_client as oc
from data.ogn_client import _admit, _parse_beacon


@pytest.fixture(autouse=True)
def clean_gate():
    def _reset():
        oc._tracks.clear()
        oc._gate_counts.update(rejected=0, quarantines=0)
        oc._last_track_prune = 0.0
        with oc._lock:
            oc._live_gliders.clear()
        with oc._bbuf_lock:
            oc._beacon_buffers.clear()
    _reset()
    yield
    _reset()


def _b(lat, lon, tod=None, gid="FLR000001", speed=100, alt=1000):
    return {"id": gid, "lat": lat, "lon": lon, "alt": alt,
            "speed_kmh": speed, "fix_tod": tod}


# One step of a glider at ~100 km/h reporting every 2 s: ~55 m north.
STEP = 0.0005
# Somewhere a glider cannot be a few seconds later: ~330 km east at 47 N.
FAR = 4.4


def _fly(n, t0=1000.0, lat0=47.0, lon0=8.0, tod0=36000, gid="FLR000001", dt=2.0):
    """Feed n ordinary fixes; return (results, next t, next lat, next tod)."""
    out = []
    for i in range(n):
        out.append(_admit(_b(lat0 + i * STEP, lon0, tod0 + int(i * dt), gid),
                          t0 + i * dt))
    return out, t0 + n * dt, lat0 + n * STEP, tod0 + int(n * dt)


# --- ordinary traffic ---------------------------------------------------------

def test_an_ordinary_track_is_admitted_whole():
    results, *_ = _fly(50)
    assert all(results)
    assert oc.gate_stats()["rejected_beacons"] == 0


def test_a_slow_reporter_is_admitted_across_long_gaps():
    """The slowest tenth of the fleet reports every 45 s; a gap is not a jump."""
    assert _admit(_b(47.0, 8.0, 36000), 1000.0)
    # 45 s at 150 km/h is 1.9 km.
    assert _admit(_b(47.017, 8.0, 36045), 1045.0)
    # Ten minutes out of coverage, 25 km on.
    assert _admit(_b(47.24, 8.0, 36645), 1645.0)


def test_parser_reads_the_fix_time():
    line = ("FLR3E2D1A>APRS,qAS,EGNH:/120800h5115.26N/00203.13W'"
            "182/067/A=002516 !W51! id063E2D1A +156fpm +2.5rot 7.5dB 1e gps3x5")
    assert _parse_beacon(line)["fix_tod"] == 12 * 3600 + 8 * 60


def test_fix_time_never_reaches_the_wire():
    import main
    line = ("FLR3E2D1A>APRS,qAS,EGNH:/120800h5115.26N/00203.13W'"
            "182/067/A=002516 !W51! id063E2D1A +156fpm +2.5rot 7.5dB 1e gps3x5")
    assert "fix_tod" not in main._to_wire([_parse_beacon(line)])[0]


# --- corrupt fields -----------------------------------------------------------

def test_impossible_altitude_is_dropped():
    """65,505 m is a negative altitude wrapped through an unsigned field."""
    assert not _admit(_b(35.698, 139.755, 36000, alt=65505), 1000.0)
    # ...and it did not become the track's reference: the next good fix shows.
    assert _admit(_b(35.698, 139.755, 36002, alt=12), 1002.0)


def test_impossible_speed_is_dropped():
    assert _admit(_b(47.0, 8.0, 36000), 1000.0)
    assert not _admit(_b(47.0005, 8.0, 36002, speed=1333), 1002.0)
    assert _admit(_b(47.001, 8.0, 36004), 1004.0)


def test_repeated_impossible_speed_quarantines_the_id():
    """FLR18008D: 'hang glider', 537-1,333 km/h on 13 of 15 beacons."""
    t = 1000.0
    for i in range(oc._STRIKES_TO_QUARANTINE):
        assert not _admit(_b(47.0 + i * 0.01, 8.0, 36000 + i, speed=900), t + i)
    assert oc.gate_stats(now=t + 5)["quarantined_now"] == 1
    # A believable beacon from it is still refused while it is held.
    assert not _admit(_b(47.05, 8.0, 36010, speed=76), t + 10)


def test_quarantine_takes_the_id_off_the_map_at_once():
    gid = "FLR18008D"
    with oc._lock:
        oc._live_gliders[gid] = {"id": gid, "seen_at": 1000.0}
    oc._buffer_position({"id": gid, "lat": 47.0, "lon": 8.0, "alt": 5000})
    for i in range(oc._STRIKES_TO_QUARANTINE):
        _admit(_b(47.0, 8.0, 36000 + i, gid=gid, speed=900), 1000.0 + i)
    assert gid not in oc._live_gliders
    assert gid not in oc._beacon_buffers


def test_quarantine_lapses_once_the_id_behaves():
    t = 1000.0
    for i in range(oc._STRIKES_TO_QUARANTINE):
        _admit(_b(47.0, 8.0, 36000 + i, speed=900), t + i)
    later = t + oc._QUARANTINE_S + 60
    assert _admit(_b(47.0, 8.0, 40000), later)


# --- jumps --------------------------------------------------------------------

def test_a_lone_outlier_never_shows_and_the_track_carries_on():
    """ICA44A015: one fix 7 km off, back on track two seconds later."""
    _, t, lat, tod = _fly(10)
    assert not _admit(_b(lat, 8.0 + FAR, tod), t)           # the outlier
    assert _admit(_b(lat + STEP, 8.0, tod + 2), t + 2)       # back on the track
    assert oc.gate_stats()["quarantines"] == 0


def test_a_two_fix_fault_on_an_established_track_never_shows():
    """ICA3FF433 went 3,329 km and came back inside 20 s."""
    _, t, lat, tod = _fly(10)
    assert not _admit(_b(lat, 8.0 + 40, tod), t)
    assert not _admit(_b(lat, 8.0 + 40, tod + 5), t + 5)     # second fix agrees
    assert _admit(_b(lat + 2 * STEP, 8.0, tod + 10), t + 10)  # and the track stands
    assert oc._tracks["FLR000001"]["strikes"] == []


def test_a_bad_first_fix_is_recovered_from():
    """Nothing vouches for a one-fix track, so two agreeing fixes replace it."""
    assert _admit(_b(47.0, 8.0 + FAR, 36000), 1000.0)        # the bad first fix
    assert not _admit(_b(47.0, 8.0, 36002), 1002.0)           # held as candidate
    assert _admit(_b(47.0005, 8.0, 36004), 1004.0)            # confirmed
    assert _admit(_b(47.001, 8.0, 36006), 1006.0)
    assert len(oc._tracks["FLR000001"]["strikes"]) == 1


def test_the_same_fix_heard_twice_confirms_nothing():
    """17% of consecutive beacons are one fix relayed by a second receiver."""
    assert _admit(_b(47.0, 8.0, 36000), 1000.0)
    assert not _admit(_b(47.0, 8.0 + FAR, 36002), 1002.0)
    assert not _admit(_b(47.0, 8.0 + FAR, 36002), 1002.3)     # same fix again
    assert oc._tracks["FLR000001"]["strikes"] == []
    assert _admit(_b(47.0005, 8.0, 36004), 1004.0)            # the track resumes


# --- shared ids ---------------------------------------------------------------

def test_two_aircraft_on_one_id_show_as_one_steady_track():
    """The second aircraft is refused for as long as the first keeps reporting."""
    _, t, lat, tod = _fly(5)
    shown_far = 0
    for i in range(30):
        assert _admit(_b(lat + i * STEP, 8.0, tod + 2 * i), t + 2 * i)
        shown_far += _admit(_b(45.0 + i * STEP, 8.0 + FAR, tod + 2 * i + 1),
                            t + 2 * i + 1)
    assert shown_far == 0
    assert oc.gate_stats()["quarantines"] == 0


def test_the_other_aircraft_takes_over_only_after_the_first_goes_quiet():
    _, t, lat, tod = _fly(5)
    quiet = t + oc._HANDOVER_S + 5
    tod2 = tod + int(oc._HANDOVER_S) + 5
    assert not _admit(_b(45.0, 8.0 + FAR, tod2), quiet)
    assert _admit(_b(45.0005, 8.0 + FAR, tod2 + 2), quiet + 2)
    assert len(oc._tracks["FLR000001"]["strikes"]) == 1


def test_an_id_that_keeps_hopping_is_quarantined_and_stays_out():
    """FLR1900FF: short bursts from a different place every few seconds."""
    gid, t, tod, shown = "FLR1900FF", 1000.0, 36000, 0
    spots = [(45.37, 6.20), (45.35, 3.80), (45.06, 5.03), (47.48, 8.41),
             (45.37, 5.92), (45.06, 7.25)]
    for hop in range(40):
        lat, lon = spots[hop % len(spots)]
        # two fixes per burst; bursts 90 s apart, so no track is ever "live"
        for k in range(2):
            shown += _admit(_b(lat, lon + k * 0.001, tod, gid), t)
            t += 3; tod += 3
        t += 90; tod += 90
    assert oc.gate_stats(now=t)["quarantined_now"] == 1
    # Everything it showed, it showed before the third strike landed.
    assert shown <= 2 * oc._STRIKES_TO_QUARANTINE
    # 40 bursts span more than twice the quarantine; it is still held because
    # every further hop pushed the release out.
    assert t - 1000.0 > 2 * oc._QUARANTINE_S
    assert not _admit(_b(45.37, 6.20, tod, gid), t)


# --- replayed history ---------------------------------------------------------

def test_a_fix_older_than_the_track_is_dropped():
    """A lagging receiver must not walk the icon backwards."""
    assert _admit(_b(47.0000, 8.0, 36000), 1000.0)
    assert _admit(_b(47.0010, 8.0, 36002), 1002.0)
    assert not _admit(_b(47.0005, 8.0, 36001), 1002.3)        # fix from before
    assert _admit(_b(47.0020, 8.0, 36004), 1004.0)


def test_fix_order_wraps_at_midnight():
    assert _admit(_b(47.0000, 8.0, 86399), 1000.0)            # 23:59:59
    assert _admit(_b(47.0005, 8.0, 1), 1002.0)                # 00:00:01 is later
    assert not _admit(_b(47.0003, 8.0, 86398), 1002.5)        # 23:59:58 is not


def test_a_stale_track_does_not_veto_by_fix_time():
    """A track whose own clock was wrong must not lock the aircraft out."""
    assert _admit(_b(47.0, 8.0, 50000), 1000.0)               # clock ran ahead
    late = 1000.0 + oc._HANDOVER_S + 10
    assert _admit(_b(47.01, 8.0, 36000), late)                # "older", accepted


# --- housekeeping -------------------------------------------------------------

def test_idle_tracks_are_forgotten():
    _fly(3, gid="FLR00000A")
    assert "FLR00000A" in oc._tracks
    _admit(_b(50.0, 10.0, 40000, gid="FLR00000B"), 1000.0 + oc._TRACK_IDLE_S + 120)
    assert "FLR00000A" not in oc._tracks


def test_a_quarantined_id_is_not_forgotten_early():
    gid = "FLR18008D"
    for i in range(oc._STRIKES_TO_QUARANTINE):
        _admit(_b(47.0, 8.0, 36000 + i, gid=gid, speed=900), 1000.0 + i)
    # Pruning runs, but the hold has not expired yet.
    oc._tracks[gid]["seen"] = 1000.0 - oc._TRACK_IDLE_S - 1
    _admit(_b(50.0, 10.0, 40000, gid="FLR00000B"), 1100.0)
    assert gid in oc._tracks
