"""
The frontend builds two pages, and the second one has to be reachable.

`frontend/dist` holds the map app (`index.html`) and the landing page
(`about.html`).  The catch-all route used to serve a file only under its exact
name and answer everything else with the map app, so `/about` — the URL the
Vite dev server gives the landing page, and the one the app links to — would
have opened the map instead, silently.  `_static_file` is the lookup behind
that route; these tests pin the three things it has to get right: the
extensionless page, the unchanged fallback, and the traversal guard that the
old inline check carried.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main


def _dist(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("map app", encoding="utf-8")
    (dist / "about.html").write_text("landing page", encoding="utf-8")
    (dist / "assets" / "main-abc123.js").write_text("js", encoding="utf-8")
    return dist


def test_extensionless_path_finds_the_built_page(tmp_path):
    dist = _dist(tmp_path)
    assert main._static_file(dist, "about") == (dist / "about.html").resolve()
    # A trailing slash is the same page, not a directory lookup.
    assert main._static_file(dist, "about/") == (dist / "about.html").resolve()


def test_exact_names_still_resolve(tmp_path):
    dist = _dist(tmp_path)
    assert main._static_file(dist, "about.html") == (dist / "about.html").resolve()
    assert main._static_file(dist, "assets/main-abc123.js") == \
        (dist / "assets" / "main-abc123.js").resolve()


def test_unknown_path_is_none_so_the_route_falls_back_to_the_app(tmp_path):
    dist = _dist(tmp_path)
    # A client-side path nothing was built for: the caller serves index.html.
    assert main._static_file(dist, "some/app/route") is None
    assert main._static_file(dist, "") is None
    # A directory is not a file, with or without the suffix.
    assert main._static_file(dist, "assets") is None


def test_traversal_cannot_leave_the_static_root(tmp_path):
    dist = _dist(tmp_path)
    (tmp_path / "secret.html").write_text("outside", encoding="utf-8")
    (tmp_path / ".env").write_text("ADMIN_TOKEN=x", encoding="utf-8")

    assert main._static_file(dist, "../secret.html") is None
    # The .html suffix must not become a way round the guard either.
    assert main._static_file(dist, "../secret") is None
    assert main._static_file(dist, "assets/../../.env") is None
