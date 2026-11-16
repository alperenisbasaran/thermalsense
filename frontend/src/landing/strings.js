// Copy for the landing page (/about) — Turkish is the default, English the
// fallback, same contract as i18n/strings.js: every key exists in both.
//
// A separate dictionary on purpose. This is long-form prose that only the
// landing entry needs; in i18n/strings.js it would ride along in the map app's
// bundle for nothing. The language itself is still the app's — the page reads
// `lang` from the shared LanguageProvider, so a choice made here follows the
// visitor into the map and back.
//
// Every number below is a measurement recorded in CLAUDE.md. When one of those
// is re-measured, change it here too: this page is the only place a visitor
// reads them.

import { DEFAULT_LANG } from '../i18n/strings.js';

const STRINGS = {
  tr: {
    docTitle:      'ThermalSense: planör pilotları için termal tahmini',
    skipToContent: 'İçeriğe geç',

    // nav
    navSee:        'Haritada ne var',
    navLearn:      'Nasıl öğrenir',
    navScore:      'Ne kadar iyi',
    navData:       'Veri',
    navLabel:      'Sayfa bölümleri',
    openMap:       'Canlı haritayı aç',
    openMapShort:  'Haritayı aç',

    // hero
    heroUnseen:    'Termal görünmez.',
    heroSeen:      'Planörler yerini gösterir.',
    heroLede:      'ThermalSense, haritada tıkladığınız noktanın çevresindeki '
                 + 'yaklaşık 11 km’lik alanı 50 metrelik hücrelere böler ve her '
                 + 'hücre için bir planörün orada tırmanış bulma olasılığını '
                 + 'tahmin eder. Modeli planörlerin kendisi eğitir: dünyanın '
                 + 'neresinde olursa olsun daire çizerek tırmanan her biri '
                 + 'etiketli bir örnektir.',
    heroSecondary: 'Nasıl öğrendiğine bakın',

    // hero simulation
    simAlt:        'Canlandırma: karanlık bir harita ızgarası üzerinde düz '
                 + 'uçan ve daire çizen planörler; daire çizilen yerlerde '
                 + 'hücreler ısınıyor',
    simCaption:    'Canlandırma, canlı veri değil. Göremediği bir termale giren '
                 + 'planör daire çizmeye başlar; altındaki hücreler de onun '
                 + 'bıraktığı kanıtla ısınır.',
    simReveal:     'Gizli termalleri göster',
    simHide:       'Termalleri gizle',
    simPause:      'Durdur',
    simPlay:       'Oynat',
    simCircling:   'daire çiziyor',
    simCruising:   'düz uçuş',
    simScale:      'termal olasılığı',
    low:           'düşük',
    high:          'yüksek',

    // live strip
    liveNow:       'Şu an OGN ağında {n} aktif termal işaretli.',
    liveNone:      'Şu an OGN ağında daire çizen planör kümesi yok. Gece ya da '
                 + 'sakin bir saat olabilir.',

    // what you see
    seeTitle:      'Haritada ne görürsünüz',
    seeCellsUnit:  'hücre',
    seeCells:      'Tıkladığınız noktanın çevresi yaklaşık 50 m’lik 40.401 '
                 + 'hücreye bölünür. Her hücre 22 girdiyle puanlanır: arazi, '
                 + 'hava durumu ve sorduğunuz irtifa.',
    seePassesUnit: 'geçiş',
    seePasses:     'Her tahmin, hava verisi hafifçe oynatılarak 50 kez '
                 + 'yinelenir. Harita ortalamayı çizer; yayılım, API yanıtında '
                 + 'belirsizlik olarak döner.',
    seeAheadFig:   '+23 sa',
    seeAheadUnit:  'ileri tahmin',
    seeAhead:      'Sürgüyü kaydırın; aynı alan Open-Meteo tahminiyle 23 saat '
                 + 'ileriye kadar yeniden hesaplanır: ilk üç saat 15 dakikada '
                 + 'bir (saatlik değerler arasında enterpolasyonla), sonrası '
                 + 'saat saat.',
    seeLiveFig:    '1 sn',
    seeLiveUnit:   'canlı trafik',
    seeLive:       'Planörler haritaya saniyede bir akar. Daire çizenler sarı '
                 + 'görünür; aynı yerde kümelenen tırmanışlar aktif termal '
                 + 'olarak işaretlenir.',
    noteAltTitle:  'İrtifaya göre yanıt verir',
    noteAlt:       'Bir planöre tıklarsanız tahmin onun irtifası için yapılır. '
                 + '900 m’de biten bir termal, 1.500 m’deki pilotun işine '
                 + 'yaramaz.',
    noteNightTitle:'Güneş yoksa tahmin de yok',
    noteNight:     'Yüzey ısınmıyorsa harita boş kalır ve nedenini söyler. '
                 + 'Model o koşulda hiç eğitilmedi; tahmin uydurmak yerine '
                 + 'tahmini olmadığını bildirir.',
    noteRawTitle:  'Ham veriyi yanında gösterir',
    noteRaw:       'Haritayı ikiye bölen ayırıcının solunda gelen veri, sağında '
                 + 'ondan kurulan durur.',
    noteRawLink:   'Karşılaştırmayı aç',

    // how it learns
    learnTitle:    'Model nasıl öğrenir',
    learnIntro:    'Bir planör uçuşunun barogramı testere dişine benzer: '
                 + 'termalde dönerek tırmanır, sonra düz süzülerek irtifa '
                 + 'harcar. ThermalSense bu izin yalnızca iki ucunu etiket '
                 + 'sayar, ortasını atar.',
    baroAlt:       'Şematik barogram: zamana karşı irtifa. Dönerek tırmanılan '
                 + 'bölümler pozitif, düz alçalınan bölümler negatif, aradaki '
                 + 'belirsiz bölüm ile 200 m altı ve termal tabanının 300 m '
                 + 'üstü atılan olarak işaretli.',
    baroAxisAlt:   'irtifa',
    baroAxisTime:  'zaman',
    baroCeil:      'termal tabanı + 300 m',
    baroFloor:     '200 m AGL',
    baroClimb:     '+2,4 m/s',
    baroSink:      '−0,9 m/s',
    baroWeak:      '+0,3 m/s',
    labelPos:      'Pozitif',
    labelPosRule:  'Daire çiziyor ve 1,5 m/s’den hızlı tırmanıyor.',
    labelNeg:      'Negatif',
    labelNegRule:  'Düz uçuyor ve 0,5 m/s’den hızlı alçalıyor.',
    labelDrop:     'Atılır',
    labelDropRule: 'İkisinin arası; ayrıca 200 m AGL altı ve termal tabanının '
                 + '300 m üstü.',
    whyDropTitle:  'Ortası neden atılıyor?',
    whyDrop:       'Dönmeden kaldırıcı havanın içinden geçen ya da yamaç '
                 + 'boyunca uçan planör de “termal dönmüyor” görünür. Onu '
                 + '“burada termal yok” diye etiketlemek, modele termalin tam '
                 + 'olduğu yerde olmadığını öğretir. Canlı akışın 24 '
                 + 'dakikasında, eski kuralın negatif saydığı 55.856 satırın '
                 + 'yalnızca 14.940’ı (%27) gerçek yokluktu.',
    stepsTitle:    'Bildirimden haritaya',
    stepFeed:      'Akış',
    stepFeedText:  'Open Glider Network’ün dünya çapındaki APRS akışı '
                 + 'kesintisiz dinlenir: günde yaklaşık 7,7 milyon konum '
                 + 'bildirimi.',
    stepGate:      'Eleme',
    stepGateText:  'Her bildirim önce akla yatkınlık kapısından geçer. '
                 + '15.000 m üstü irtifa, 400 km/sa üstü hız ve hiçbir uçağın '
                 + 'uçamayacağı sıçramalar atılır; üç kez yakalanan kimlik 30 '
                 + 'dakika karantinaya alınır.',
    stepLabel:     'Etiket',
    stepLabelText: 'Kalan bildirimler yukarıdaki kuralla etiketlenir. Güneş '
                 + 'ışınımı 50 W/m² altındaysa, yani yüzey ısınmıyorsa örnek '
                 + 'alınmaz.',
    stepFit:       'Eğitim',
    stepFitText:   'Her beş dakikada bir XGBoost modeli, en çok 200.000 '
                 + 'satırlık bir örnek havuzundan sıfırdan eğitilir. Havuz '
                 + 'dolunca her güne eşit yer ayrılır; model tek bir hava '
                 + 'dönemini ezberlemesin diye.',
    stepQuality:   'Kalite kapısı',
    stepQualityText: 'Yeni model, yayındakiyle aynı dondurulmuş sınav '
                 + 'verisinde karşılaştırılır. Farkın %95 güven aralığı '
                 + 'tümüyle sıfırın üstünde değilse yayına alınmaz. Üst üste '
                 + '12 retten sonra kapı yeni modeli referans alır; şanslı '
                 + 'tek bir skor modeli sonsuza dek donduramasın diye.',

    // how good
    scoreTitle:    'Ne kadar iyi',
    scoreLead:     'Şanstan biraz iyi. Daha fazlası değil.',
    scoreIntro:    'Aşağıdaki skorlar, tek bir ısı haritasının kapsadığı '
                 + 'birimin içinde ölçüldü: aynı gün, aynı bölge, aynı saat. '
                 + 'Modelin, planörün tırmandığı bir hücreyi tırmanmadığı bir '
                 + 'hücrenin üstüne ne sıklıkla koyduğunu söyler. 0,50 yazı '
                 + 'tura demektir.',
    colRanker:     'Sıralayıcı',
    colScore:      'Skor',
    colCi:         '%95 güven aralığı',
    colDelta:      'Fark',
    chance:        'şans',
    noChange:      'fark yok',
    rowAlt:        'Yalnızca yerden yükseklik',
    rowTerrain:    'Yalnızca arazi çarpanı',
    rowSun:        'Yalnızca güneş geliş açısı',
    rowModel:      'Yayındaki model, 22 sütun',
    scoreCaption:  'Sıralayıcıların grup içi skoru ve %95 güven aralığı',
    scoreMeta:     '27 Eylül 2026 ölçümü: 11.774 satır, 1.714 pozitif, 2.571 '
                 + 'puanlama birimi. Aralıklar bootstrap ile hesaplandı.',
    scoreRead:     'Okuması şu: bir grubun içinde değişen altı girdi konum, '
                 + 'konumdan türeyen arazi ve uçağın yüksekliğidir. Hiçbiri bu '
                 + 'toprağın şu an sıcak olup olmadığını ölçmez. Arazi ile '
                 + 'irtifanın götürebildiği yer yaklaşık 0,55.',
    triedTitle:    'Denendi, kanıtlanamadı',
    triedCaption:  'Denenen dört değişikliğin yayındaki kuruluma göre farkı ve '
                 + '%95 güven aralığı',
    triedSun:      'Güneş geliş açısı, 23. sütun olarak',
    triedRank:     'Çiftler üzerinden sıralama hedefi',
    triedSix:      'Yalnızca grup içinde değişen altı sütun',
    triedPrior:    'Hücrenin kendi geçmiş tırmanma kaydı',
    triedNote:     'Dört aralık da sıfırı içeriyor; hiçbiri sonuç vermedi. '
                 + 'Sonuncusu anlamlılığa en yakın aday.',
    nextTitle:     'Denenmemiş kaldıraç',
    nextText:      'Her hücre için toprağın o an ne kadar sıcak olduğunu ölçen '
                 + 'bir girdi: uydudan yer yüzeyi sıcaklığı ya da gün '
                 + 'doğumundan beri biriken güneşlenme.',
    useTitle:      'Peki harita ne işe yarar?',
    useText:       'Canlı trafik ve daire çizen planör kümeleri tahmin değil, '
                 + 'gözlemdir. Isı haritası ise bir model tahminidir: nereye '
                 + 'bakacağınıza dair bir ipucu olarak okuyun, vaat olarak '
                 + 'değil.',
    turkiyeTitle:  'Türkiye için not',
    turkiyeText:   'OGN akışında Türkiye trafiği çok seyrek; model ağırlıklı '
                 + 'olarak başka bölgelerdeki uçuşlardan öğreniyor. Güncel '
                 + 'dağılım eğitim durumu panelinde.',
    turkiyeLink:   'Eğitim durumunu aç',

    // data
    dataTitle:     'Hangi veriyle çalışır',
    dataCaption:   'Veri kaynakları ve kullanım amaçları',
    colSource:     'Kaynak',
    colUse:        'Ne için',
    srcOgnUse:     'Canlı konumlar ve eğitim etiketleri',
    srcMeteoUse:   'Sıcaklık, nem, rüzgâr, CAPE ve CIN, güneş ışınımı, sınır '
                 + 'tabaka yüksekliği',
    srcDemUse:     'Yükseklik, eğim ve bakı',
    machineTitle:  'Küçük bir sunucuda',
    machineText:   'Tamamı tek bir süreçte, 2 sanal çekirdekli ve 896 MB '
                 + 'bellekli bir sunucuda çalışır. Sıcak önbellekle bir tahmin '
                 + 'yaklaşık yarım saniye sürer.',

    // closing
    closeTitle:    'Bugün nerede tırmanılıyor?',
    disclaimer:    'ThermalSense deneysel bir projedir. Uçuş kararlarınızı '
                 + 'yalnızca buna dayandırmayın.',
    creditTerrain: 'Arazi: Copernicus DEM © DLR e.V. 2010–2014, © Airbus '
                 + 'Defence and Space GmbH 2014–2018; COPERNICUS kapsamında AB '
                 + 've ESA tarafından sağlanmıştır.',
    creditWeather: 'Hava verisi: Open-Meteo.com.',
    creditTraffic: 'Uçak konumları: Open Glider Network.',
  },

  en: {
    docTitle:      'ThermalSense: thermal prediction for glider pilots',
    skipToContent: 'Skip to content',

    navSee:        'On the map',
    navLearn:      'How it learns',
    navScore:      'How good it is',
    navData:       'Data',
    navLabel:      'Page sections',
    openMap:       'Open the live map',
    openMapShort:  'Open the map',

    heroUnseen:    'Thermals are invisible.',
    heroSeen:      'Gliders give them away.',
    heroLede:      'ThermalSense cuts the roughly 11 km around any point you '
                 + 'click into 50 m cells and estimates, for each one, the '
                 + 'chance that a glider finds a climb there. The gliders '
                 + 'train the model themselves: every one that circles and '
                 + 'climbs, anywhere in the world, is a labelled example.',
    heroSecondary: 'See how it learns',

    simAlt:        'Animation: gliders cruising and circling over a dark map '
                 + 'grid; cells warm up where they circle',
    simCaption:    'An illustration, not live data. A glider that flies into a '
                 + 'thermal it cannot see starts to circle, and the cells '
                 + 'beneath it warm with the evidence it leaves.',
    simReveal:     'Show the hidden thermals',
    simHide:       'Hide the thermals',
    simPause:      'Pause',
    simPlay:       'Play',
    simCircling:   'circling',
    simCruising:   'cruising',
    simScale:      'thermal probability',
    low:           'low',
    high:          'high',

    liveNow:       ({ n }) => `${n} active thermal${n === 1 ? ' is' : 's are'} `
                            + 'marked on the OGN network right now.',
    liveNone:      'No clusters of circling gliders on the OGN network right '
                 + 'now. It may be night, or a quiet hour.',

    seeTitle:      'What you see on the map',
    seeCellsUnit:  'cells',
    seeCells:      'The ground around your click is cut into 40,401 cells of '
                 + 'about 50 m. Each is scored from 22 inputs: terrain, '
                 + 'weather and the altitude you asked about.',
    seePassesUnit: 'passes',
    seePasses:     'Each prediction is repeated 50 times over slightly '
                 + 'perturbed weather. The map draws the mean; the spread '
                 + 'comes back in the API response as the uncertainty.',
    seeAheadFig:   '+23 h',
    seeAheadUnit:  'forecast',
    seeAhead:      'Drag the slider and the same patch is scored again, up to '
                 + '23 hours ahead, on Open-Meteo forecast fields: every 15 '
                 + 'minutes for the first three hours (interpolated between '
                 + 'the hourly values), then hour by hour.',
    seeLiveFig:    '1 s',
    seeLiveUnit:   'live traffic',
    seeLive:       'Gliders stream onto the map every second. Circling ones '
                 + 'turn gold; climbs that cluster in one place are marked as '
                 + 'an active thermal.',
    noteAltTitle:  'It answers for an altitude',
    noteAlt:       'Click a glider and the prediction is made for that '
                 + 'glider’s height. A thermal that tops out at 900 m is no '
                 + 'use to a pilot at 1,500 m.',
    noteNightTitle:'No sun, no forecast',
    noteNight:     'When nothing is heating the ground the map stays empty '
                 + 'and says why. The model was never trained in that regime, '
                 + 'so it reports having no forecast instead of inventing one.',
    noteRawTitle:  'It shows the raw data beside it',
    noteRaw:       'A divider splits the map: the data as it arrives on the '
                 + 'left, what is built from it on the right.',
    noteRawLink:   'Open the comparison',

    learnTitle:    'How the model learns',
    learnIntro:    'The barogram of a glider flight is a sawtooth: it circles '
                 + 'up in a thermal, then spends the height gliding straight. '
                 + 'ThermalSense takes only the two ends of that trace as '
                 + 'labels and throws the middle away.',
    baroAlt:       'Schematic barogram: altitude against time. Circling '
                 + 'climbs are marked positive, straight sinking glides '
                 + 'negative, and the ambiguous stretch between, everything '
                 + 'below 200 m and everything more than 300 m above the '
                 + 'thermal base are marked discarded.',
    baroAxisAlt:   'altitude',
    baroAxisTime:  'time',
    baroCeil:      'thermal base + 300 m',
    baroFloor:     '200 m AGL',
    baroClimb:     '+2.4 m/s',
    baroSink:      '−0.9 m/s',
    baroWeak:      '+0.3 m/s',
    labelPos:      'Positive',
    labelPosRule:  'Circling and climbing faster than 1.5 m/s.',
    labelNeg:      'Negative',
    labelNegRule:  'Flying straight and sinking faster than 0.5 m/s.',
    labelDrop:     'Discarded',
    labelDropRule: 'Everything between; also anything below 200 m AGL or more '
                 + 'than 300 m above the thermal base.',
    whyDropTitle:  'Why throw the middle away?',
    whyDrop:       'A glider dolphining through lift without turning, or '
                 + 'running a ridge, also looks like it is “not thermalling”. '
                 + 'Labelling it “no lift here” teaches the model that lift is '
                 + 'absent exactly where it is present. Over 24 minutes of '
                 + 'live feed, only 14,940 of the 55,856 rows the old rule '
                 + 'called negative (27%) were true absences.',
    stepsTitle:    'From a position report to the map',
    stepFeed:      'Feed',
    stepFeedText:  'The worldwide Open Glider Network APRS feed is read '
                 + 'continuously: about 7.7 million position reports a day.',
    stepGate:      'Screening',
    stepGateText:  'Every report passes a plausibility gate first. Altitudes '
                 + 'above 15,000 m, speeds above 400 km/h and jumps no '
                 + 'aircraft could fly are dropped; an id caught three times '
                 + 'is quarantined for 30 minutes.',
    stepLabel:     'Label',
    stepLabelText: 'What remains is labelled by the rule above. No sample is '
                 + 'taken when solar radiation is under 50 W/m², because '
                 + 'nothing is heating the ground.',
    stepFit:       'Training',
    stepFitText:   'Every five minutes an XGBoost model is refitted from '
                 + 'scratch on a pool of at most 200,000 rows. Once the pool '
                 + 'is full each day keeps an equal share, so the model does '
                 + 'not memorise one stretch of weather.',
    stepQuality:   'Quality gate',
    stepQualityText: 'The new model is scored against the serving one on the '
                 + 'same frozen benchmark. Unless the 95% confidence interval '
                 + 'of the difference lies entirely above zero, it is not '
                 + 'promoted. After 12 rejections in a row the gate takes the '
                 + 'new model as its baseline, so one lucky score cannot '
                 + 'freeze the model for good.',

    scoreTitle:    'How good it is',
    scoreLead:     'A little better than chance. Not more than that.',
    scoreIntro:    'The scores below are measured inside the unit one heatmap '
                 + 'covers: same day, same area, same hour. They say how '
                 + 'often the model ranks a cell where a glider climbed above '
                 + 'one where it did not. 0.50 is a coin toss.',
    colRanker:     'Ranker',
    colScore:      'Score',
    colCi:         '95% confidence interval',
    colDelta:      'Change',
    chance:        'chance',
    noChange:      'no change',
    rowAlt:        'Height above ground alone',
    rowTerrain:    'Terrain multiplier alone',
    rowSun:        'Sun incidence angle alone',
    rowModel:      'Served model, 22 columns',
    scoreCaption:  'Within-group score and 95% confidence interval per ranker',
    scoreMeta:     'Measured 27 September 2026 on 11,774 rows, 1,714 positives '
                 + 'and 2,571 scoring units. Intervals are bootstrap '
                 + 'confidence intervals.',
    scoreRead:     'The reading: the six inputs that vary inside a group are '
                 + 'position, the terrain derived from it, and the aircraft’s '
                 + 'height. None of them measures whether this ground is hot '
                 + 'right now. About 0.55 is where terrain and altitude run '
                 + 'out.',
    triedTitle:    'Tried, not proven',
    triedCaption:  'Change against the shipped setup, with 95% confidence '
                 + 'interval, for the four changes tried',
    triedSun:      'Sun incidence as a 23rd column',
    triedRank:     'A pairwise ranking objective',
    triedSix:      'Only the six columns that vary inside a group',
    triedPrior:    'Each cell’s own past climb record',
    triedNote:     'All four intervals include zero, so none is conclusive. '
                 + 'The last is the closest to significance.',
    nextTitle:     'The untried lever',
    nextText:      'A per-cell input that measures how hot the ground is '
                 + 'right now: land surface temperature from satellite, or '
                 + 'sunshine accumulated since sunrise.',
    useTitle:      'So what is the map good for?',
    useText:       'The live traffic and the clusters of circling gliders are '
                 + 'observations, not predictions. The heatmap is a model '
                 + 'estimate: read it as a hint about where to look, not as a '
                 + 'promise.',
    turkiyeTitle:  'A note for Türkiye',
    turkiyeText:   'Türkiye traffic on the OGN feed is very sparse, so the '
                 + 'model learns mostly from flights elsewhere. The training '
                 + 'status panel shows the current split.',
    turkiyeLink:   'Open training status',

    dataTitle:     'What it runs on',
    dataCaption:   'Data sources and what each is used for',
    colSource:     'Source',
    colUse:        'Used for',
    srcOgnUse:     'Live positions and training labels',
    srcMeteoUse:   'Temperature, humidity, wind, CAPE and CIN, solar '
                 + 'radiation, boundary-layer height',
    srcDemUse:     'Elevation, slope and aspect',
    machineTitle:  'On a small server',
    machineText:   'All of it runs in one process on a server with 2 virtual '
                 + 'cores and 896 MB of memory. On a warm cache a prediction '
                 + 'takes about half a second.',

    closeTitle:    'Where are they climbing today?',
    disclaimer:    'ThermalSense is an experimental project. Do not base '
                 + 'flight decisions on it alone.',
    creditTerrain: 'Terrain: Copernicus DEM © DLR e.V. 2010–2014, © Airbus '
                 + 'Defence and Space GmbH 2014–2018, provided under '
                 + 'COPERNICUS by the EU and ESA.',
    creditWeather: 'Weather data: Open-Meteo.com.',
    creditTraffic: 'Aircraft positions: Open Glider Network.',
  },
};

// Key parity is the contract, and nothing else enforces it: a key missing from
// one language silently falls back to the other, which reads as a stray
// sentence in the wrong language rather than as an error.
if (import.meta.env?.DEV) {
  const tr = Object.keys(STRINGS.tr);
  const en = new Set(Object.keys(STRINGS.en));
  const missing = [
    ...tr.filter(k => !en.has(k)).map(k => `en.${k}`),
    ...[...en].filter(k => !(k in STRINGS.tr)).map(k => `tr.${k}`),
  ];
  if (missing.length) console.warn('[landing] strings missing:', missing.join(', '));
}

/** Same lookup rules as i18n/strings.js `translate`, over the landing copy. */
export function translateLanding(lang, key, vars) {
  const entry = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  if (typeof entry === 'function') return entry(vars ?? {});
  if (!vars) return entry;
  return entry.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
}
