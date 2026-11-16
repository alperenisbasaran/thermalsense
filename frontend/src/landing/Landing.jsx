import { useEffect, useState, useCallback } from 'react';
import { useLang }  from '../i18n/LanguageContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { LANG_LABEL } from '../i18n/strings.js';
import { API_BASE } from '../config.js';
import { translateLanding } from './strings.js';
import ThermalField  from './ThermalField.jsx';
import Barogram      from './Barogram.jsx';
import IntervalTable from './IntervalTable.jsx';

// The map app lives at the site root; these are views of it people link to
// (see the ?compare and ?panel handling in App.jsx).
const MAP_URL      = '/';
const COMPARE_URL  = '/?compare=1';
const TRAINING_URL = '/?panel=training';

// Within-(day, cell, hour) ranking score, measured 27 Sep 2026 — the table in
// CLAUDE.md under "What the score actually is". Ordered worst to best so the
// served model reads as the bottom line.
const SCORES = [
  { key: 'rowAlt',     value: 0.473, lo: 0.440, hi: 0.512 },
  { key: 'rowTerrain', value: 0.519, lo: 0.484, hi: 0.556 },
  { key: 'rowSun',     value: 0.532, lo: 0.503, hi: 0.562 },
  { key: 'rowModel',   value: 0.542, lo: 0.519, hi: 0.567, emphasis: true },
];

// Paired deltas against the shipped setup, same groups, 1,500 resamples.
const TRIED = [
  { key: 'triedSun',   value: -0.019, lo: -0.051, hi: 0.010 },
  { key: 'triedRank',  value: -0.013, lo: -0.046, hi: 0.015 },
  { key: 'triedSix',   value:  0.010, lo: -0.009, hi: 0.027 },
  { key: 'triedPrior', value:  0.014, lo: -0.002, hi: 0.029 },
];

/**
 * How many thermals the feed is marking right now — the one live number on the
 * page. null means "do not show the line": the request failed, timed out, or
 * there is no backend behind this build. A landing page that explains the
 * project must never look broken because the API is busy.
 */
function useActiveThermals() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    fetch(`${API_BASE}/thermals/active`, { signal: ctl.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (Array.isArray(data?.thermals)) setCount(data.thermals.length); })
      .catch(() => { /* leave the line out */ })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); ctl.abort(); };
  }, []);
  return count;
}

export default function Landing() {
  const { lang, toggleLang, locale, t: tApp } = useLang();
  const { theme, toggleTheme } = useTheme();
  const t = useCallback((key, vars) => translateLanding(lang, key, vars), [lang]);
  const live = useActiveThermals();

  useEffect(() => { document.title = t('docTitle'); }, [t]);

  const langLabel  = lang === 'tr' ? tApp('switchToEnglish') : tApp('switchToTurkish');
  const themeLabel = theme === 'dark' ? tApp('switchToLight') : tApp('switchToDark');

  return (
    <>
      <a className="skip" href="#main">{t('skipToContent')}</a>

      <header className="hero">
        <div className="wrap nav">
          <a className="brand" href="#top" id="top">ThermalSense</a>
          <nav className="nav-links" aria-label={t('navLabel')}>
            <a href="#see">{t('navSee')}</a>
            <a href="#learn">{t('navLearn')}</a>
            <a href="#score">{t('navScore')}</a>
            <a href="#data">{t('navData')}</a>
          </nav>
          <div className="nav-tools">
            <button type="button" className="tool" onClick={toggleLang} title={langLabel} aria-label={langLabel}>
              {LANG_LABEL[lang]}
            </button>
            {/* Shows the mode the click leads to, as the app's own toggle does. */}
            <button type="button" className="tool" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            </button>
            <a className="btn primary small" href={MAP_URL}>{t('openMapShort')}</a>
          </div>
        </div>

        <div className="wrap hero-body">
          <h1 className="hero-title">
            <span className="unseen">{t('heroUnseen')}</span>{' '}
            <span className="seen">{t('heroSeen')}</span>
          </h1>
          <p className="lede">{t('heroLede')}</p>
          <div className="actions">
            <a className="btn primary" href={MAP_URL}>{t('openMap')}</a>
            <a className="btn quiet" href="#learn">{t('heroSecondary')}</a>
          </div>
        </div>

        <div className="wrap">
          <figure className="field-figure">
            <ThermalField t={t} />
            <figcaption>{t('simCaption')}</figcaption>
          </figure>
          {live != null && (
            <p className="live">
              <span className={`live-dot${live > 0 ? ' on' : ''}`} aria-hidden="true" />
              {live > 0 ? t('liveNow', { n: live }) : t('liveNone')}
            </p>
          )}
        </div>
      </header>

      <main id="main">
        <section className="band" id="see" aria-labelledby="see-h">
          <div className="wrap">
            <h2 id="see-h">{t('seeTitle')}</h2>
            <dl className="facts">
              <Fact figure="201 × 201" unit={t('seeCellsUnit')}>{t('seeCells')}</Fact>
              <Fact figure="50" unit={t('seePassesUnit')}>{t('seePasses')}</Fact>
              <Fact figure={t('seeAheadFig')} unit={t('seeAheadUnit')}>{t('seeAhead')}</Fact>
              <Fact figure={t('seeLiveFig')} unit={t('seeLiveUnit')}>{t('seeLive')}</Fact>
            </dl>
            <div className="notes">
              <div>
                <h3>{t('noteAltTitle')}</h3>
                <p>{t('noteAlt')}</p>
              </div>
              <div>
                <h3>{t('noteNightTitle')}</h3>
                <p>{t('noteNight')}</p>
              </div>
              <div>
                <h3>{t('noteRawTitle')}</h3>
                <p>{t('noteRaw')} <a href={COMPARE_URL}>{t('noteRawLink')}</a></p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="learn" aria-labelledby="learn-h">
          <div className="wrap">
            <h2 id="learn-h">{t('learnTitle')}</h2>
            <p className="intro">{t('learnIntro')}</p>

            <figure className="baro-figure">
              <Barogram t={t} />
              <figcaption>
                <ul className="labels">
                  <li>
                    <span className="swatch pos" aria-hidden="true" />
                    <strong>{t('labelPos')}</strong>
                    <span>{t('labelPosRule')}</span>
                  </li>
                  <li>
                    <span className="swatch neg" aria-hidden="true" />
                    <strong>{t('labelNeg')}</strong>
                    <span>{t('labelNegRule')}</span>
                  </li>
                  <li>
                    <span className="swatch drop" aria-hidden="true" />
                    <strong>{t('labelDrop')}</strong>
                    <span>{t('labelDropRule')}</span>
                  </li>
                </ul>
              </figcaption>
            </figure>

            <div className="split">
              <div>
                <h3>{t('whyDropTitle')}</h3>
                <p>{t('whyDrop')}</p>
              </div>
              <div>
                <h3>{t('stepsTitle')}</h3>
                {/* Numbered because it is a pipeline: each step only ever sees
                    what the one before it let through. */}
                <ol className="steps">
                  <li><strong>{t('stepFeed')}</strong><span>{t('stepFeedText')}</span></li>
                  <li><strong>{t('stepGate')}</strong><span>{t('stepGateText')}</span></li>
                  <li><strong>{t('stepLabel')}</strong><span>{t('stepLabelText')}</span></li>
                  <li><strong>{t('stepFit')}</strong><span>{t('stepFitText')}</span></li>
                  <li><strong>{t('stepQuality')}</strong><span>{t('stepQualityText')}</span></li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="score" aria-labelledby="score-h">
          <div className="wrap">
            <h2 id="score-h">{t('scoreTitle')}</h2>
            <p className="verdict">{t('scoreLead')}</p>
            <p className="intro">{t('scoreIntro')}</p>

            <IntervalTable
              caption={t('scoreCaption')}
              columns={{ label: t('colRanker'), value: t('colScore'), interval: t('colCi') }}
              rows={SCORES.map(r => ({ ...r, label: t(r.key) }))}
              domain={[0.42, 0.60]}
              reference={0.5}
              referenceLabel={t('chance')}
              ticks={[0.45, 0.5, 0.55, 0.6]}
              locale={locale}
            />
            <p className="meta">{t('scoreMeta')}</p>
            <p className="reading">{t('scoreRead')}</p>

            <h3 className="sub">{t('triedTitle')}</h3>
            <IntervalTable
              caption={t('triedCaption')}
              columns={{ label: t('colRanker'), value: t('colDelta'), interval: t('colCi') }}
              rows={TRIED.map(r => ({ ...r, label: t(r.key) }))}
              domain={[-0.06, 0.04]}
              reference={0}
              referenceLabel={t('noChange')}
              ticks={[-0.05, 0, 0.03]}
              locale={locale}
              signed
            />
            <p className="meta">{t('triedNote')}</p>

            <div className="notes three">
              <div>
                <h3>{t('nextTitle')}</h3>
                <p>{t('nextText')}</p>
              </div>
              <div>
                <h3>{t('useTitle')}</h3>
                <p>{t('useText')}</p>
              </div>
              <div>
                <h3>{t('turkiyeTitle')}</h3>
                <p>{t('turkiyeText')} <a href={TRAINING_URL}>{t('turkiyeLink')}</a></p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="data" aria-labelledby="data-h">
          <div className="wrap">
            <h2 id="data-h">{t('dataTitle')}</h2>
            <div className="split table-first">
              <table className="sources">
                <caption className="sr-only">{t('dataCaption')}</caption>
                <thead>
                  <tr><th scope="col">{t('colSource')}</th><th scope="col">{t('colUse')}</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row"><a href="https://www.glidernet.org/" rel="noopener">Open Glider Network</a></th>
                    <td>{t('srcOgnUse')}</td>
                  </tr>
                  <tr>
                    <th scope="row"><a href="https://open-meteo.com/" rel="noopener">Open-Meteo</a></th>
                    <td>{t('srcMeteoUse')}</td>
                  </tr>
                  <tr>
                    <th scope="row"><a href="https://registry.opendata.aws/copernicus-dem/" rel="noopener">Copernicus GLO-30</a></th>
                    <td>{t('srcDemUse')}</td>
                  </tr>
                </tbody>
              </table>
              <div>
                <h3>{t('machineTitle')}</h3>
                <p>{t('machineText')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="close">
        <div className="wrap">
          <p className="close-title">{t('closeTitle')}</p>
          <a className="btn primary" href={MAP_URL}>{t('openMap')}</a>
          <p className="disclaimer">{t('disclaimer')}</p>
          <p className="credits">
            {t('creditTerrain')} {t('creditWeather')} {t('creditTraffic')}
          </p>
        </div>
      </footer>
    </>
  );
}

function Fact({ figure, unit, children }) {
  return (
    <div className="fact">
      <dt>
        <span className="fact-figure">{figure}</span>
        <span className="fact-unit">{unit}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
