import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import RiskBadge from '../components/RiskBadge';
import { ShieldAlert, TrendingUp, AlertTriangle, CheckCircle, Activity, BrainCircuit, RefreshCw, Clock } from 'lucide-react';

const ScoreGauge = ({ score, level }) => {
  const color = level === 'Critical' ? '#ef4444' : level === 'High' ? '#f97316' : level === 'Medium' ? '#f59e0b' : '#10b981';
  return (
    <div className="flex flex-col items-center">
      <div className={`relative w-36 h-36 rounded-full flex items-center justify-center ${level === 'Critical' ? 'pulse-critical' : ''}`}
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #252840 0deg)` }}>
        <div className="w-28 h-28 rounded-full bg-[#1e2130] flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>
      <RiskBadge level={level} />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-5 hover:border-[#3a3d4e] transition-all duration-200">
    <div className="flex items-start justify-between mb-3">
      <p className="text-sm text-slate-400">{title}</p>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const CategoryCard = ({ name, score }) => {
  const level = score <= 30 ? 'Low' : score <= 60 ? 'Medium' : score <= 80 ? 'High' : 'Critical';
  const color = level === 'Critical' ? '#ef4444' : level === 'High' ? '#f97316' : level === 'Medium' ? '#f59e0b' : '#10b981';
  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4 hover:border-[#3a3d4e] transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-300">{name}</p>
        <RiskBadge level={level} />
      </div>
      <p className="text-2xl font-bold text-white mb-2">{score}</p>
      <div className="w-full bg-[#252840] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ── Auto-Assessment Panel ─────────────────────────────────────────────────────
const LEVEL_STYLES = {
  Low:      { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  badge: 'bg-green-500/20 text-green-300',  bar: 'bg-green-500' },
  Medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300', bar: 'bg-yellow-500' },
  High:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', bar: 'bg-orange-500' },
  Critical: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',       bar: 'bg-red-500'   },
};

function AutoAssessPanel() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState('');

  const fetchAssessment = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/ml/auto-assess');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 503) {
        setError('Assessment initialising — ML service may still be starting up. Refresh in a moment.');
      } else {
        setError(err.response?.data?.message || err.message || 'Could not load assessment.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssessment(); }, [fetchAssessment]);

  const triggerRun = async () => {
    setRunning(true);
    setError('');
    try {
      await axios.post('/api/ml/auto-assess/run');
      // Poll until the new result arrives (max ~15 s)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await fetchAssessment(true);
        if (attempts >= 15) clearInterval(poll);
      }, 1000);
      setTimeout(() => clearInterval(poll), 16000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger assessment.');
    } finally {
      setTimeout(() => setRunning(false), 3000);
    }
  };

  const level = data?.predicted_risk_level;
  const ls    = level ? (LEVEL_STYLES[level] || LEVEL_STYLES.Medium) : null;
  const top5  = data?.top_contributors || [];

  const assessedAt = data?.assessed_at
    ? new Date(data.assessed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2a2d3e] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BrainCircuit size={18} className="text-indigo-400" />
          <h3 className="font-semibold text-white">Automated ML Risk Assessment</h3>
          <span className="text-xs text-slate-400 bg-[#252840] px-2 py-0.5 rounded-full">Runs every 60 min</span>
        </div>
        <div className="flex items-center gap-2">
          {assessedAt && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} /> Last run: {assessedAt}
            </span>
          )}
          <button
            onClick={triggerRun}
            disabled={running || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-600/20 border border-indigo-500/30
              text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
            {running ? 'Running…' : 'Run now'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm py-4">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading latest assessment…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
            <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-300">{error}</p>
          </div>
        )}

        {!loading && data && ls && (
          <div className="space-y-5">
            {/* Predicted level + probabilities */}
            <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${ls.bg} ${ls.border}`}>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Predicted Risk Level</p>
                <p className={`text-3xl font-bold ${ls.text}`}>{level}</p>
              </div>
              {data.class_probabilities && (
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(data.class_probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cls, prob]) => {
                      const s = LEVEL_STYLES[cls] || LEVEL_STYLES.Medium;
                      const pct = (prob * 100).toFixed(1);
                      return (
                        <div key={cls} className="bg-[#1e2130] rounded-lg p-2.5">
                          <p className={`text-xs font-medium ${s.text}`}>{cls}</p>
                          <div className="w-full bg-[#2a2d3e] rounded-full h-1.5 my-1">
                            <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-white text-sm font-semibold">{pct}%</p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top 5 SHAP contributors */}
            {top5.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">
                  Top Risk Drivers <span className="normal-case text-slate-600">(SHAP — based on current monitoring snapshot)</span>
                </p>
                <div className="space-y-2">
                  {top5.map((c, i) => {
                    const isRisk = c.direction === 'increases_risk';
                    const maxShap = top5[0] ? Math.abs(top5[0].shap_value) : 1;
                    const pct = Math.min((Math.abs(c.shap_value) / maxShap) * 100, 100).toFixed(1);
                    return (
                      <div key={c.key} className="flex items-center gap-3 bg-[#252840] rounded-lg px-4 py-3">
                        <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                        <div className="w-44 flex-shrink-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{c.feature}</p>
                          <p className="text-xs text-slate-500">value: {c.value}</p>
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-[#1e2130] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${isRisk ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right flex-shrink-0">
                          <span className={`text-xs font-semibold ${isRisk ? 'text-red-400' : 'text-green-400'}`}>
                            {isRisk ? '▲ increases' : '▼ decreases'}
                          </span>
                          <p className="text-xs text-slate-500">{Math.abs(c.shap_value).toFixed(3)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  SHAP values are relative to an average-organisation baseline. Red = pushes toward higher risk, green = mitigates risk.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-6 text-red-400">Failed to load dashboard data.</div>;

  const radarData = Object.entries(data.categoryScores).map(([name, score]) => ({ subject: name, score }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Risk Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Corporate Risk Assessment Overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Overall Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Corporate Score */}
        <div className="lg:col-span-1 bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-6 flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Corporate Risk Score</p>
          <ScoreGauge score={data.overallScore} level={data.overallLevel} />
          <p className="text-xs text-slate-500 text-center">Average across all 5 risk categories</p>
        </div>

        {/* Stat Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Total Risks" value={data.totalRisks} icon={ShieldAlert} color="#3b82f6" subtitle="All categories" />
          <StatCard title="Open Risks" value={data.openRisks} icon={AlertTriangle} color="#f97316" subtitle="Require attention" />
          <StatCard title="Resolved" value={data.resolvedRisks} icon={CheckCircle} color="#10b981" subtitle="Mitigated risks" />
          <StatCard title="Unread Alerts" value={data.recentAlerts.filter(a => a.status === 'Unread').length} icon={Activity} color="#ef4444" subtitle="High/Critical" />
          <StatCard title="Neg. Feedback" value={`${data.negativePercent}%`} icon={TrendingUp} color="#8b5cf6" subtitle="Customer sentiment" />
          <StatCard title="Risk Level" value={data.overallLevel} icon={ShieldAlert} color={data.overallLevel === 'Critical' ? '#ef4444' : data.overallLevel === 'High' ? '#f97316' : '#f59e0b'} subtitle="Current status" />
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Risk Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(data.categoryScores).map(([name, score]) => (
            <CategoryCard key={name} name={name} score={score} />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Chart */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Risk Score Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Risk Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a2d3e" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Top Risks + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Risks */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Top Risks</h3>
          <div className="space-y-3">
            {data.topRisks.map((risk, i) => (
              <div key={risk._id} className="flex items-center gap-3 p-3 rounded-lg bg-[#252840] hover:bg-[#2a2d3e] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-red-500/20 text-red-400' : i === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{risk.name}</p>
                  <p className="text-xs text-slate-400">{risk.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-white">{risk.score}</span>
                  <RiskBadge level={risk.level} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {data.recentAlerts.length === 0 && <p className="text-slate-500 text-sm">No alerts at this time.</p>}
            {data.recentAlerts.map((alert) => (
              <div key={alert._id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.status === 'Unread' ? 'border-red-500/20 bg-red-500/5' : 'border-[#2a2d3e] bg-[#252840]'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.level === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                  <p className="text-xs text-slate-400">{alert.category} · Score: {alert.riskScore}</p>
                </div>
                <RiskBadge level={alert.level} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automated ML Assessment */}
      <AutoAssessPanel />
    </div>
  );
}
