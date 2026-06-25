import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useUserSessions } from '../hooks/useUserSessions';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { localizePrayerName } from '../../../shared/i18n/translations';
import css from './Dashboard.module.css';

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function accClass(acc: number) {
  if (acc >= 75) return css.high;
  if (acc >= 50) return css.mid;
  return css.low;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { sessions, stats, total, page, totalPages, goToPage, loading, error } =
    useUserSessions();
  const { t, lang } = useI18n();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  return (
    <div className={css.page}>
      {/* ── Header ── */}
      <div className={css.header}>
        <span className={css.eyebrow}>{t('dash.eyebrow')}</span>
        <h1 className={css.title}>{t('dash.welcome', { name: user?.name ?? '' })}</h1>
        <p className={css.subtitle}>{t('dash.subtitle')}</p>
      </div>

      {loading && total === 0 && <div className={css.loader}>{t('dash.loading')}</div>}
      {error   && <div className={css.empty}>{t('dash.loadError')}</div>}

      {!loading && !error && total === 0 && (
        <div className={css.empty}>
          {t('dash.emptyTitle')}
          <br /><br />
          <Link className="primary-link" to="/prayer">{t('dash.startSession')}</Link>
        </div>
      )}

      {!error && total > 0 && (
        <>
          {/* ── Overview cards ── */}
          <p className={css.sectionTitle}>{t('dash.overview')}</p>
          <div className={css.statsGrid}>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('dash.totalSessions')}</span>
              <span className={css.statValue}>{stats.totalSessions}</span>
              <span className={css.statSub}>{t('dash.totalSessionsSub')}</span>
            </div>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('dash.avgAccuracy')}</span>
              <span className={css.statValue}>{stats.avgAccuracy}%</span>
              <span className={css.statSub}>{t('dash.avgAccuracySub')}</span>
            </div>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('dash.totalMistakes')}</span>
              <span className={css.statValue}>{stats.totalMistakes}</span>
              <span className={css.statSub}>{t('dash.totalMistakesSub')}</span>
            </div>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('dash.avgDuration')}</span>
              <span className={css.statValue}>{stats.avgDurationMin} <small style={{ fontSize: '1rem' }}>{t('dash.min')}</small></span>
              <span className={css.statSub}>{t('dash.avgDurationSub')}</span>
            </div>
          </div>

          {/* ── Insights ── */}
          <p className={css.sectionTitle}>{t('dash.insights')}</p>
          <div className={css.insightGrid}>
            <div className={css.insightCard}>
              <span className={css.insightLabel}>{t('dash.mostMistakenPrayer')}</span>
              <span className={css.insightValue}>
                {stats.mostMistakenPrayer ? localizePrayerName(stats.mostMistakenPrayer, lang) : '—'}
              </span>
            </div>
            <div className={css.insightCard}>
              <span className={css.insightLabel}>{t('dash.mostMistakenMove')}</span>
              <span className={css.insightValue}>{stats.mostMistakenMove ?? '—'}</span>
            </div>
          </div>

          {/* ── Accuracy progress chart ── */}
          <p className={css.sectionTitle}>{t('dash.accuracyProgress')}</p>
          <div className={css.chartCard}>
            <p className={css.chartTitle}>{t('dash.accuracyPerSession')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.accuracyOverTime} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#304238" />
                <XAxis dataKey="label" tick={{ fill: '#a9b4ad', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#a9b4ad', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#15201b', border: '1px solid #304238', borderRadius: 8 }}
                  labelStyle={{ color: '#a9b4ad', fontSize: 11 }}
                  itemStyle={{ color: '#d4ae5c', fontWeight: 700 }}
                  formatter={(v) => [`${v}%`, t('dash.accuracy')]}
                />
                <ReferenceLine y={75} stroke="#3fb950" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#d4ae5c"
                  strokeWidth={2}
                  dot={{ fill: '#d4ae5c', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Per-prayer breakdown ── */}
          <p className={css.sectionTitle}>{t('dash.perPrayer')}</p>
          <div className={css.chartCard}>
            <table className={css.prayerTable}>
              <thead>
                <tr>
                  <th>{t('dash.colPrayer')}</th>
                  <th>{t('dash.colSessions')}</th>
                  <th style={{ width: '50%' }}>{t('dash.colAvgAccuracy')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.perPrayer.map((p) => (
                  <tr key={p.prayerName}>
                    <td className={css.prayerName}>{localizePrayerName(p.prayerName, lang)}</td>
                    <td>{p.count}</td>
                    <td>
                      <div className={css.accuracyBar}>
                        <div className={css.barTrack}>
                          <div
                            className={`${css.barFill} ${accClass(p.avgAccuracy)}`}
                            style={{ width: `${p.avgAccuracy}%` }}
                          />
                        </div>
                        <span className={`${css.barLabel} ${accClass(p.avgAccuracy)}`}>
                          {p.avgAccuracy}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Session history ── */}
          <p className={css.sectionTitle}>{t('dash.recentSessions')}</p>
          <div className={css.sessionList}>
            {sessions.map((s) => (
              <div key={s._id} className={css.sessionRow}>
                <div className={css.sessionIcon}>ص</div>
                <div className={css.sessionInfo}>
                  <div className={css.sessionName}>{localizePrayerName(s.prayerName, lang)}</div>
                  <div className={css.sessionMeta}>{s.rakas} {t('dash.rakasUnit')} · {s.duration}</div>
                </div>
                <div className={css.sessionStats}>
                  <span className={`${css.accuracy} ${accClass(s.accuracy)}`}>{s.accuracy}%</span>
                  <span className={css.sessionMistakes}>{s.mistakes} {t('dash.mistakesUnit')}</span>
                </div>
                <div className={css.sessionDate}>{formatDate(s.createdAt, locale)}</div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={css.pagination}>
              <button
                type="button"
                className={css.pageBtn}
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                {t('dash.prev')}
              </button>
              <span className={css.pageInfo}>
                {t('dash.pageInfo', { page, total: totalPages })}
              </span>
              <button
                type="button"
                className={css.pageBtn}
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                {t('dash.next')}
              </button>
            </div>
          )}

          <div className={css.cta}>
            <Link className="primary-link" to="/prayer">{t('dash.startSession')}</Link>
          </div>
        </>
      )}
    </div>
  );
}
