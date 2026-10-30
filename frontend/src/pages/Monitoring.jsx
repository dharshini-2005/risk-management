import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle, TrendingDown, CheckCircle, BrainCircuit,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Zap, FlaskConical,
} from 'lucide-react';
import axios from 'axios';

// ─── Monitoring dataset ────────────────────────────────────────────────────────
const MONITORING_DATA = {
  financial: {
    title: 'Financial Metrics',
    color: '#3b82f6',
    metrics: [
      { name: 'Revenue (₹ Cr)', value: 42.5, target: 50, unit: '₹ Cr', alert: false },
      { name: 'Expenses (₹ Cr)', value: 38.2, target: 35, unit: '₹ Cr', alert: true, alertMsg: 'Expenses exceeding target budget' },
      { name: 'Profit (₹ Cr)', value: 4.3, target: 15, unit: '₹ Cr', alert: true, alertMsg: 'Profit margin is significantly below target' },
      { name: 'Cash Flow (₹ Cr)', value: 6.8, target: 10, unit: '₹ Cr', alert: false },
    ],
    chartData: [
      { month: 'Apr', Revenue: 48, Expenses: 35 },
      { month: 'May', Revenue: 45, Expenses: 36 },
      { month: 'Jun', Revenue: 43, Expenses: 37 },
      { month: 'Jul', Revenue: 44, Expenses: 38 },
      { month: 'Aug', Revenue: 41, Expenses: 38 },
      { month: 'Sep', Revenue: 42.5, Expenses: 38.2 },
    ],
    chartKeys: ['Revenue', 'Expenses'],
    chartColors: ['#10b981', '#ef4444'],
  },
  market: {
    title: 'Market Metrics',
    color: '#8b5cf6',
    metrics: [
      { name: 'Customer Demand', value: 68, target: 85, unit: '%', alert: true, alertMsg: 'Customer demand has fallen below threshold' },
      { name: 'Customer Churn', value: 7.2, target: 3, unit: '%', alert: true, alertMsg: 'Churn rate significantly exceeds acceptable limit' },
      { name: 'Monthly Sales', value: 1240, target: 1500, unit: 'units', alert: false },
    ],
    chartData: [
      { month: 'Apr', Demand: 82, Churn: 3.1 },
      { month: 'May', Demand: 80, Churn: 4.2 },
      { month: 'Jun', Demand: 75, Churn: 5.0 },
      { month: 'Jul', Demand: 72, Churn: 6.1 },
      { month: 'Aug', Demand: 70, Churn: 6.8 },
      { month: 'Sep', Demand: 68, Churn: 7.2 },
    ],
    chartKeys: ['Demand'],
    chartColors: ['#8b5cf6'],
  },
  operational: {
    title: 'Operational Metrics',
    color: '#f59e0b',
    metrics: [
      { name: 'System Downtime', value: 8.5, target: 2, unit: 'hrs/month', alert: true, alertMsg: 'System downtime is critically high this month' },
      { name: 'Production Delays', value: 12, target: 5, unit: 'incidents', alert: true, alertMsg: 'Production delays exceeding acceptable threshold' },
      { name: 'Failed Processes', value: 3, target: 1, unit: 'incidents', alert: true, alertMsg: 'Multiple process failures detected' },
    ],
    chartData: [
      { month: 'Apr', Downtime: 2.1, Delays: 4 },
      { month: 'May', Downtime: 3.5, Delays: 6 },
      { month: 'Jun', Downtime: 4.2, Delays: 7 },
      { month: 'Jul', Downtime: 5.8, Delays: 9 },
      { month: 'Aug', Downtime: 7.2, Delays: 11 },
      { month: 'Sep', Downtime: 8.5, Delays: 12 },
    ],
    chartKeys: ['Downtime', 'Delays'],
    chartColors: ['#f59e0b', '#ef4444'],
  },
  cybersecurity: {
    title: 'Cybersecurity Metrics',
    color: '#ef4444',
    metrics: [
      { name: 'Failed Login Attempts', value: 547, target: 20, unit: 'attempts', alert: true, alertMsg: '⚠️ Possible brute-force attack detected — Failed logins: 547' },
      { name: 'Security Incidents', value: 3, target: 0, unit: 'incidents', alert: true, alertMsg: 'Multiple security incidents reported this month' },
      { name: 'Unauthorized Access', value: 12, target: 0, unit: 'attempts', alert: true, alertMsg: 'Unauthorized access attempts detected on admin panel' },
    ],
    chartData: [
      { month: 'Apr', Failed: 12, Unauthorized: 1 },
      { month: 'May', Failed: 45, Unauthorized: 3 },
      { month: 'Jun', Failed: 78, Unauthorized: 4 },
      { month: 'Jul', Failed: 210, Unauthorized: 7 },
      { month: 'Aug', Failed: 380, Unauthorized: 10 },
      { month: 'Sep', Failed: 547, Unauthorized: 12 },
    ],
    chartKeys: ['Failed', 'Unauthorized'],
    chartColors: ['#ef4444', '#f97316'],
  },
};

// ─── Shared constants ─────────────────────────────────────────────────────────
const FEATURE_META = [
  { key: 'revenue_change_pct',          label: 'Revenue Change %',           placeholder: '-15',   hint: 'Percentage change in revenue. Negative = decline.' },
  { key: 'profit_change_pct',           label: 'Profit Change %',            placeholder: '-20',   hint: 'Percentage change in profit.' },
  { key: 'expense_change_pct',          label: 'Expense Change %',           placeholder: '10',    hint: 'Percentage change in operating expenses.' },
  { key: 'debt_ratio',                  label: 'Debt Ratio',                 placeholder: '0.45',  hint: 'Total debt / total assets (0–1).' },
  { key: 'customer_demand_change_pct',  label: 'Customer Demand Change %',   placeholder: '-12',   hint: 'Percentage change in customer demand volume.' },
  { key: 'customer_churn_pct',          label: 'Customer Churn %',           placeholder: '7',     hint: 'Monthly customer churn rate (%).' },
  { key: 'sales_change_pct',            label: 'Sales Change %',             placeholder: '-8',    hint: 'Percentage change in sales volume.' },
  { key: 'downtime_hours',              label: 'Downtime Hours',             placeholder: '8',     hint: 'Unplanned system downtime hours this month.' },
  { key: 'operational_incidents',       label: 'Operational Incidents',      placeholder: '12',    hint: 'Number of operational failure incidents.' },
  { key: 'delivery_delay_pct',          label: 'Delivery Delay %',           placeholder: '15',    hint: 'Percentage of deliveries delayed.' },
  { key: 'failed_login_attempts',       label: 'Failed Login Attempts',      placeholder: '547',   hint: 'Total failed login attempts detected.' },
  { key: 'security_incidents',          label: 'Security Incidents',         placeholder: '3',     hint: 'Number of confirmed security incidents.' },
  { key: 'vulnerability_count',         label: 'Vulnerability Count',        placeholder: '12',    hint: 'Number of unpatched vulnerabilities detected.' },
  { key: 'negative_feedback_pct',       label: 'Negative Feedback %',        placeholder: '35',    hint: 'Percentage of negative customer feedback.' },
  { key: 'average_rating',             label: 'Average Customer Rating',    placeholder: '3.2',   hint: 'Average product/service rating (1–5).' },
  { key: 'sentiment_score',             label: 'Sentiment Score',            placeholder: '-0.3',  hint: 'NLP sentiment score (−1 very negative → +1 very positive).' },
];

const CATEGORY_GROUPS = [
  { label: 'Financial',     keys: ['revenue_change_pct', 'profit_change_pct', 'expense_change_pct', 'debt_ratio'] },
  { label: 'Market',        keys: ['customer_demand_change_pct', 'customer_churn_pct', 'sales_change_pct'] },
  { label: 'Operational',   keys: ['downtime_hours', 'operational_incidents', 'delivery_delay_pct'] },
  { label: 'Cybersecurity', keys: ['failed_login_attempts', 'security_incidents', 'vulnerability_count'] },
  { label: 'Reputation',    keys: ['negative_feedback_pct', 'average_rating', 'sentiment_score'] },
];

const INITIAL_FORM = Object.fromEntries(FEATURE_META.map(f => [f.key, '']));

const LEVEL_STYLES = {
  Low:      { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  badge: 'bg-green-500/20 text-green-300',  bar: 'bg-green-500' },
  Medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300', bar: 'bg-yellow-500' },
  High:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', bar: 'bg-orange-500' },
  Critical: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',       bar: 'bg-red-500'    },
};

// ─── Shared sub-components ────────────────────────────────────────────────────
const MetricCard = ({ name, value, target, unit, alert, alertMsg }) => (
  <div className={`p-4 rounded-xl border transition-all ${alert ? 'bg-red-500/5 border-red-500/30' : 'bg-[#252840] border-[#2a2d3e]'}`}>
    <div className="flex items-start justify-between mb-2">
      <p className="text-xs text-slate-400">{name}</p>
      {alert ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0" /> : <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
    </div>
    <p className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>
      {value}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
    </p>
    <p className="text-xs text-slate-500 mt-1">Target: {target} {unit}</p>
    {alert && alertMsg && <p className="text-xs text-red-400 mt-2 font-medium">{alertMsg}</p>}
  </div>
);

const Section = ({ sectionKey, data }) => (
  <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] overflow-hidden">
    <div className="px-5 py-4 border-b border-[#2a2d3e] flex items-center gap-3">
      <div className="w-3 h-3 rounded-full" style={{ background: data.color }} />
      <h2 className="font-semibold text-white">{data.title}</h2>
    </div>
    <div className="p-5 space-y-5">
      <div className={`grid gap-4 ${data.metrics.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
        {data.metrics.map(m => <MetricCard key={m.name} {...m} />)}
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">6-Month Trend</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0' }} />
            {data.chartKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={data.chartColors[i]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

// ─── SHAP contribution bar ────────────────────────────────────────────────────
const ContributionBar = ({ feature, value, shapValue, direction }) => {
  const maxShap = 0.8; // visual scale cap
  const pct = Math.min(Math.abs(shapValue) / maxShap * 100, 100).toFixed(1);
  const isRisk = direction === 'increases_risk';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2a2d3e] last:border-0">
      <div className="w-40 flex-shrink-0">
        <p className="text-xs font-medium text-slate-300 truncate">{feature}</p>
        <p className="text-xs text-slate-500">{value}</p>
      </div>
      <div className="flex-1">
        <div className="w-full bg-[#252840] rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${isRisk ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="w-20 text-right flex-shrink-0">
        <span className={`text-xs font-semibold ${isRisk ? 'text-red-400' : 'text-green-400'}`}>
          {isRisk ? '▲' : '▼'} {Math.abs(shapValue).toFixed(3)}
        </span>
      </div>
    </div>
  );
};

// ─── Panel: ML Predict + Explain (SHAP) ──────────────────────────────────────
function ExplainPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    const payload = {};
    for (const { key, label } of FEATURE_META) {
      const num = Number(form[key]);
      if (form[key] === '' || !isFinite(num)) { setError(`"${label}" must be a valid number.`); return; }
      payload[key] = num;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ml/explain', payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unexpected error.');
    } finally { setLoading(false); }
  };

  const levelStyle = result ? (LEVEL_STYLES[result.predicted_risk_level] || LEVEL_STYLES.Medium) : null;
  const contributors = result?.explanation?.all_contributions || [];
  const displayed = showAll ? contributors : contributors.slice(0, 5);

  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <BrainCircuit size={18} className="text-indigo-400" />
          <span className="font-semibold text-white">ML Risk Prediction & Explainability</span>
          <span className="text-xs text-slate-400 bg-[#252840] px-2 py-0.5 rounded-full">SVM + SHAP</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-[#2a2d3e] p-5 space-y-6">
          <p className="text-sm text-slate-400">
            Enter the 16 organisational metrics. The SVM model predicts the risk level and SHAP explains
            which indicators drove the classification.
          </p>

          <form onSubmit={handleSubmit}>
            {CATEGORY_GROUPS.map(group => (
              <div key={group.label} className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{group.label}</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.keys.map(key => {
                    const meta = FEATURE_META.find(f => f.key === key);
                    return (
                      <div key={key} className="group relative">
                        <label className="block text-xs text-slate-400 mb-1">{meta.label}</label>
                        <input
                          type="number" step="any" name={key} value={form[key]}
                          onChange={handleChange} placeholder={meta.placeholder} required
                          className="w-full px-3 py-2 bg-[#252840] border border-[#2a2d3e] rounded-lg text-white text-sm
                            focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
                            placeholder:text-slate-600 transition-colors"
                        />
                        <div className="absolute bottom-full left-0 mb-1.5 z-10 hidden group-hover:block">
                          <div className="bg-[#0f1117] text-slate-300 text-xs rounded-lg px-3 py-2 max-w-[200px] border border-[#2a2d3e] shadow-xl">
                            {meta.hint}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 mt-2">
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                  disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Analysing…' : 'Predict & Explain'}
              </button>
              <button type="button" onClick={() => { setForm(INITIAL_FORM); setResult(null); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white border border-[#2a2d3e] hover:border-slate-500 rounded-lg transition-colors">
                Reset
              </button>
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {result && levelStyle && (
            <div className={`rounded-xl border p-5 space-y-5 ${levelStyle.bg} ${levelStyle.border}`}>
              {/* Prediction header */}
              <div className="flex items-center gap-3">
                <BrainCircuit size={18} className={levelStyle.text} />
                <p className="font-semibold text-white">Prediction Result</p>
                <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-full ${levelStyle.badge}`}>
                  {result.predicted_risk_level}
                </span>
              </div>

              {/* AI Summary */}
              {result.explanation?.summary && (
                <div className="bg-[#1e2130]/80 rounded-lg p-4 border border-[#2a2d3e]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">AI Summary</p>
                  <p className="text-sm text-slate-200">{result.explanation.summary}</p>
                </div>
              )}

              {/* Class probabilities */}
              {result.class_probabilities && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Class Probabilities</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(result.class_probabilities)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cls, prob]) => {
                        const s = LEVEL_STYLES[cls] || LEVEL_STYLES.Medium;
                        const pct = (prob * 100).toFixed(1);
                        return (
                          <div key={cls} className="bg-[#1e2130] rounded-lg p-3">
                            <p className={`text-xs font-medium mb-1 ${s.text}`}>{cls}</p>
                            <div className="w-full bg-[#2a2d3e] rounded-full h-1.5 mb-1">
                              <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-white text-sm font-semibold">{pct}%</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* SHAP feature contributions */}
              {contributors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Feature Contributions (SHAP)</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Increases risk</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Decreases risk</span>
                    </div>
                  </div>
                  <div className="bg-[#1e2130] rounded-lg border border-[#2a2d3e] px-4 py-2">
                    {displayed.map(c => (
                      <ContributionBar key={c.key} feature={c.feature} value={c.value} shapValue={c.shap_value} direction={c.direction} />
                    ))}
                  </div>
                  {contributors.length > 5 && (
                    <button onClick={() => setShowAll(v => !v)}
                      className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      {showAll ? 'Show top 5 only' : `Show all ${contributors.length} features`}
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500">
                SHAP values explain the model's decision for this specific input relative to a baseline average scenario.
                Bar length shows relative importance; colour shows direction of influence.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel: What-if Simulator ─────────────────────────────────────────────────
const SIMULATE_PRESETS = {
  'Current (Adverse)': {
    revenue_change_pct: -15, profit_change_pct: -20, expense_change_pct: 10,
    debt_ratio: 0.45, customer_demand_change_pct: -12, customer_churn_pct: 7.2,
    sales_change_pct: -8, downtime_hours: 8.5, operational_incidents: 12,
    delivery_delay_pct: 15, failed_login_attempts: 547, security_incidents: 3,
    vulnerability_count: 12, negative_feedback_pct: 35, average_rating: 3.2,
    sentiment_score: -0.3,
  },
  'Recovery Scenario': {
    revenue_change_pct: 5, profit_change_pct: 3, expense_change_pct: -5,
    debt_ratio: 0.30, customer_demand_change_pct: 8, customer_churn_pct: 3.5,
    sales_change_pct: 6, downtime_hours: 2, operational_incidents: 3,
    delivery_delay_pct: 4, failed_login_attempts: 25, security_incidents: 0,
    vulnerability_count: 2, negative_feedback_pct: 12, average_rating: 4.2,
    sentiment_score: 0.4,
  },
};

function WhatIfPanel() {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState(
    Object.fromEntries(FEATURE_META.map(f => [f.key, SIMULATE_PRESETS['Current (Adverse)'][f.key]?.toString() ?? '']))
  );
  const [overrides, setOverrides] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPreset = (name) => {
    const preset = SIMULATE_PRESETS[name];
    setBase(Object.fromEntries(FEATURE_META.map(f => [f.key, preset[f.key]?.toString() ?? ''])));
    setOverrides({});
    setResult(null);
    setError('');
  };

  const handleOverrideChange = (key, val) => {
    setOverrides(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);

    const basePayload = {};
    for (const { key, label } of FEATURE_META) {
      const num = Number(base[key]);
      if (base[key] === '' || !isFinite(num)) { setError(`Base "${label}" must be a valid number.`); return; }
      basePayload[key] = num;
    }

    const overridePayload = {};
    for (const [key, val] of Object.entries(overrides)) {
      if (val === '') continue;
      const num = Number(val);
      if (!isFinite(num)) { setError(`Override "${key}" must be a valid number.`); return; }
      overridePayload[key] = num;
    }

    if (Object.keys(overridePayload).length === 0) {
      setError('Change at least one metric in the "What-if adjustments" section below.'); return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/ml/simulate', { base: basePayload, overrides: overridePayload });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unexpected error.');
    } finally { setLoading(false); }
  };

  const baseLevel = result?.base?.predicted_risk_level;
  const simLevel = result?.simulated?.predicted_risk_level;
  const baseStyle = baseLevel ? (LEVEL_STYLES[baseLevel] || LEVEL_STYLES.Medium) : null;
  const simStyle = simLevel ? (LEVEL_STYLES[simLevel] || LEVEL_STYLES.Medium) : null;
  const improved = result && baseLevel !== simLevel && ['Critical', 'High', 'Medium', 'Low'].indexOf(simLevel) > ['Critical', 'High', 'Medium', 'Low'].indexOf(baseLevel);
  const worsened = result && baseLevel !== simLevel && !improved;

  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <FlaskConical size={18} className="text-cyan-400" />
          <span className="font-semibold text-white">What-if Risk Simulator</span>
          <span className="text-xs text-slate-400 bg-[#252840] px-2 py-0.5 rounded-full">Scenario analysis</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-[#2a2d3e] p-5 space-y-6">
          <p className="text-sm text-slate-400">
            Start from a base scenario, adjust individual metrics, and see how the risk prediction changes.
            Use this to model mitigation strategies before implementing them.
          </p>

          {/* Preset loader */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500 flex-shrink-0">Load preset:</p>
            {Object.keys(SIMULATE_PRESETS).map(name => (
              <button key={name} onClick={() => loadPreset(name)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#252840] border border-[#2a2d3e] text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors">
                {name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Base scenario */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-3">Base scenario</p>
              {CATEGORY_GROUPS.map(group => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{group.label}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.keys.map(key => {
                      const meta = FEATURE_META.find(f => f.key === key);
                      return (
                        <div key={key}>
                          <label className="block text-xs text-slate-400 mb-1">{meta.label}</label>
                          <input type="number" step="any" value={base[key]}
                            onChange={e => setBase(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={meta.placeholder}
                            className="w-full px-3 py-2 bg-[#252840] border border-[#2a2d3e] rounded-lg text-white text-sm
                              focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-600" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* What-if overrides */}
            <div className="border-t border-[#2a2d3e] pt-5">
              <p className="text-sm font-semibold text-cyan-300 mb-1">What-if adjustments</p>
              <p className="text-xs text-slate-500 mb-4">Only fill in the metrics you want to change. Leave the rest blank.</p>
              {CATEGORY_GROUPS.map(group => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{group.label}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.keys.map(key => {
                      const meta = FEATURE_META.find(f => f.key === key);
                      const changed = overrides[key] !== undefined && overrides[key] !== '';
                      return (
                        <div key={key}>
                          <label className={`block text-xs mb-1 ${changed ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}>
                            {meta.label}{changed ? ' ✎' : ''}
                          </label>
                          <input type="number" step="any" value={overrides[key] ?? ''}
                            onChange={e => handleOverrideChange(key, e.target.value)}
                            placeholder={`e.g. ${meta.placeholder}`}
                            className={`w-full px-3 py-2 bg-[#252840] rounded-lg text-white text-sm
                              focus:outline-none focus:ring-1 placeholder:text-slate-600 transition-colors border
                              ${changed ? 'border-cyan-500/60 focus:ring-cyan-500' : 'border-[#2a2d3e] focus:ring-cyan-500 focus:border-cyan-500'}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50
                  disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Simulating…' : 'Run Simulation'}
              </button>
              <button type="button" onClick={() => { setOverrides({}); setResult(null); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white border border-[#2a2d3e] hover:border-slate-500 rounded-lg transition-colors">
                Clear overrides
              </button>
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${baseStyle.bg} ${baseStyle.border}`}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Base scenario</p>
                  <p className={`text-2xl font-bold ${baseStyle.text}`}>{baseLevel}</p>
                  {result.base.class_probabilities && (
                    <p className="text-xs text-slate-500 mt-1">
                      Confidence: {(result.base.class_probabilities[baseLevel] * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className={`rounded-xl border p-4 ${simStyle.bg} ${simStyle.border}`}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Simulated scenario</p>
                  <p className={`text-2xl font-bold ${simStyle.text}`}>{simLevel}</p>
                  {result.simulated.class_probabilities && (
                    <p className="text-xs text-slate-500 mt-1">
                      Confidence: {(result.simulated.class_probabilities[simLevel] * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {/* Outcome banner */}
              {result.risk_changed ? (
                <div className={`rounded-lg px-4 py-3 flex items-center gap-2 border ${improved ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <span className="text-lg">{improved ? '✅' : '⚠️'}</span>
                  <p className={`text-sm font-medium ${improved ? 'text-green-300' : 'text-red-300'}`}>
                    {improved
                      ? `Risk level improved from ${baseLevel} → ${simLevel} with these changes.`
                      : `Risk level worsened from ${baseLevel} → ${simLevel} with these changes.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg px-4 py-3 flex items-center gap-2 border bg-slate-500/10 border-slate-500/30">
                  <span className="text-lg">➡️</span>
                  <p className="text-sm font-medium text-slate-300">
                    Risk level remains <strong>{baseLevel}</strong> — changes were insufficient to shift the classification.
                  </p>
                </div>
              )}

              {/* Changed metrics */}
              {result.changes?.length > 0 && (
                <div className="bg-[#252840] rounded-xl border border-[#2a2d3e] p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Modified metrics</p>
                  <div className="space-y-2">
                    {result.changes.map(c => (
                      <div key={c.key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{c.feature}</span>
                        <span className="text-slate-500">
                          <span className="text-slate-400">{c.from}</span>
                          <span className="mx-2 text-slate-600">→</span>
                          <span className="text-cyan-300 font-semibold">{c.to}</span>
                          <span className={`ml-2 text-xs ${c.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ({c.delta > 0 ? '+' : ''}{c.delta})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Original predict panel (kept for backward compat, now labelled clearly) ──
function PredictRiskPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    const payload = {};
    for (const { key, label } of FEATURE_META) {
      const num = Number(form[key]);
      if (form[key] === '' || !isFinite(num)) { setError(`"${label}" must be a valid number.`); return; }
      payload[key] = num;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ml/predict', payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unexpected error.');
    } finally { setLoading(false); }
  };

  const levelStyle = result ? (LEVEL_STYLES[result.predicted_risk_level] || LEVEL_STYLES.Medium) : null;

  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-yellow-400" />
          <span className="font-semibold text-white">Quick ML Prediction</span>
          <span className="text-xs text-slate-400 bg-[#252840] px-2 py-0.5 rounded-full">SVM model</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-[#2a2d3e] p-5">
          <p className="text-sm text-slate-400 mb-5">
            Quick classification without SHAP explanation. Use "Predict &amp; Explain" above for full analysis.
          </p>
          <form onSubmit={handleSubmit}>
            {CATEGORY_GROUPS.map(group => (
              <div key={group.label} className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{group.label}</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.keys.map(key => {
                    const meta = FEATURE_META.find(f => f.key === key);
                    return (
                      <div key={key} className="group relative">
                        <label className="block text-xs text-slate-400 mb-1">{meta.label}</label>
                        <input type="number" step="any" name={key} value={form[key]}
                          onChange={handleChange} placeholder={meta.placeholder} required
                          className="w-full px-3 py-2 bg-[#252840] border border-[#2a2d3e] rounded-lg text-white text-sm
                            focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-slate-600" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2">
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50
                  disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Predicting…' : 'Predict Risk'}
              </button>
              <button type="button" onClick={() => { setForm(INITIAL_FORM); setResult(null); setError(''); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white border border-[#2a2d3e] hover:border-slate-500 rounded-lg transition-colors">
                Reset
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {result && levelStyle && (
            <div className={`mt-5 rounded-xl border p-5 ${levelStyle.bg} ${levelStyle.border}`}>
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit size={18} className={levelStyle.text} />
                <p className="font-semibold text-white">Prediction Result</p>
                <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-full ${levelStyle.badge}`}>
                  {result.predicted_risk_level}
                </span>
              </div>
              {result.class_probabilities && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(result.class_probabilities).sort((a, b) => b[1] - a[1]).map(([cls, prob]) => {
                    const s = LEVEL_STYLES[cls] || LEVEL_STYLES.Medium;
                    const pct = (prob * 100).toFixed(1);
                    return (
                      <div key={cls} className="bg-[#1e2130] rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${s.text}`}>{cls}</p>
                        <div className="w-full bg-[#2a2d3e] rounded-full h-1.5 mb-1">
                          <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-white text-sm font-semibold">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Monitoring() {
  const allAlerts = Object.values(MONITORING_DATA)
    .flatMap(s => s.metrics.filter(m => m.alert).map(m => ({ ...m, section: s.title })));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Monitoring</h1>
        <p className="text-slate-400 text-sm">Real-time organisational metrics across all risk categories</p>
      </div>

      {allAlerts.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-red-400" />
            <p className="font-semibold text-red-400">{allAlerts.length} Active Threshold Warnings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {allAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-slate-400"><span className="text-red-400 font-medium">{a.section}:</span> {a.alertMsg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.entries(MONITORING_DATA).map(([key, data]) => (
        <Section key={key} sectionKey={key} data={data} />
      ))}

      {/* ── ML Intelligence panels ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">ML Risk Intelligence</h2>
        <p className="text-slate-400 text-sm mb-4">
          Three tools powered by the trained SVM model — quick prediction, explainable AI, and scenario simulation.
        </p>
        <div className="space-y-4">
          <ExplainPanel />
          <WhatIfPanel />
          <PredictRiskPanel />
        </div>
      </div>
    </div>
  );
}
