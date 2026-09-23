import { useState, useEffect, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceDot
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Settings2, Filter,
  Search, ChevronDown, Globe, BookOpen, MessageSquare, User, HelpCircle,
  Zap, BarChart2, GitCompare
} from 'lucide-react';

const TICKERS = {
  "1155.KL": "Maybank",
  "6963.KL": "VS Industry",
  "6599.KL": "Aeon",
  "5347.KL": "Tenaga Nasional",
  "1023.KL": "CIMB Group"
};

const PERIODS = [
  { label: '1 Month', value: '1mo' },
  { label: '6 Months', value: '6mo' },
  { label: '1 Year', value: '1y' }
];

function detectByThreshold(chartData, threshold = 2) {
  const result = [];
  for (let i = 1; i < chartData.length; i++) {
    const prev = chartData[i - 1].price;
    const curr = chartData[i].price;
    const pct = ((curr - prev) / prev) * 100;
    if (Math.abs(pct) >= threshold) {
      result.push({ date: chartData[i].date, price: curr, pct, method: 'threshold' });
    }
  }
  return result;
}

function detectByZScore(chartData, zThreshold = 1.5) {
  const changes = [];
  for (let i = 1; i < chartData.length; i++) {
    const prev = chartData[i - 1].price;
    const curr = chartData[i].price;
    changes.push({ date: chartData[i].date, price: curr, pct: ((curr - prev) / prev) * 100 });
  }
  if (changes.length === 0) return [];
  const mean = changes.reduce((s, c) => s + c.pct, 0) / changes.length;
  const variance = changes.reduce((s, c) => s + Math.pow(c.pct - mean, 2), 0) / changes.length;
  const std = Math.sqrt(variance);
  return changes
    .map(c => ({ ...c, z: std > 0 ? Math.abs(c.pct - mean) / std : 0 }))
    .filter(c => c.z >= zThreshold)
    .map(c => ({ ...c, method: 'zscore' }));
}

function findConsensus(thresholdHits, zscoreHits) {
  const zDates = new Set(zscoreHits.map(d => d.date));
  return thresholdHits.filter(d => zDates.has(d.date));
}

function CustomTooltip({ active, payload, label, bigMoves }) {
  if (!active || !payload || !payload.length) return null;
  const price = payload[0]?.value;
  const move = bigMoves?.find(m => m.date === label);
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#317EAC', fontWeight: 600 }}>RM {price?.toFixed(3)}</div>
      {move && (
        <div style={{ marginTop: 6, padding: '3px 6px', borderRadius: 4, background: move.pct >= 0 ? '#ecfdf5' : '#fef2f2', color: move.pct >= 0 ? '#059669' : '#dc2626', fontWeight: 700, fontSize: 12 }}>
          {move.pct > 0 ? 'Up' : 'Down'} {move.pct > 0 ? '+' : ''}{move.pct.toFixed(2)}% big move
        </div>
      )}
    </div>
  );
}

function MiniStockChart({ chartData, bigMoves, color = '#317EAC', gradientId }) {
  const dotData = useMemo(() => {
    if (!bigMoves || !chartData) return [];
    return bigMoves.map(m => ({ date: m.date, price: m.price, pct: m.pct }));
  }, [bigMoves, chartData]);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={30} tickMargin={6} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => 'RM ' + v.toFixed(2)} width={72} domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip bigMoves={dotData} />} />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill={'url(#' + gradientId + ')'} dot={false} />
        {dotData.map((m, i) => (
          <ReferenceDot key={i} x={m.date} y={m.price} r={6} fill={m.pct >= 0 ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BigMoveTable({ moves, emptyMsg }) {
  if (!moves || moves.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>{emptyMsg || 'No big moves detected.'}</p>;
  }
  return (
    <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Date</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Change</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {[...moves].reverse().map((m, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{m.date}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700, color: m.pct >= 0 ? '#059669' : '#dc2626' }}>
                {m.pct > 0 ? 'Up +' : 'Down '}{m.pct.toFixed(2)}%
              </td>
              <td style={{ padding: '8px 12px', color: '#64748b' }}>RM {m.price.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonPanel({ tickerKey, name, period, color, gradientId, thresholdPct, zScoreThreshold }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('threshold');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('https://trading-dashboard-api-fsbx.onrender.com/api/stock/' + tickerKey + '?period=' + period)
      .then(r => r.json())
      .then(result => {
        if (result.error) setError(result.error);
        else setData(result);
      })
      .catch(() => setError('Failed to fetch data.'))
      .finally(() => setLoading(false));
  }, [tickerKey, period]);

  const { thresholdHits, zscoreHits, consensus } = useMemo(() => {
    if (!data?.chartData) return { thresholdHits: [], zscoreHits: [], consensus: [] };
    const t = detectByThreshold(data.chartData, thresholdPct);
    const z = detectByZScore(data.chartData, zScoreThreshold);
    return { thresholdHits: t, zscoreHits: z, consensus: findConsensus(t, z) };
  }, [data, thresholdPct, zScoreThreshold]);

  const activeHits = activeTab === 'threshold' ? thresholdHits : activeTab === 'zscore' ? zscoreHits : consensus;

  const tabStyle = (tab) => ({
    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: activeTab === tab ? color : '#f1f5f9',
    color: activeTab === tab ? '#fff' : '#64748b', transition: 'all 0.15s'
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{name}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{tickerKey}</span>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span>Up <b style={{ color: '#10b981' }}>{activeHits.filter(m => m.pct >= 0).length}</b></span>
            <span>Down <b style={{ color: '#ef4444' }}>{activeHits.filter(m => m.pct < 0).length}</b></span>
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220 }}>
            <div style={{ width: 32, height: 32, border: '3px solid ' + color, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>Error: {error}</div>}
        {!loading && !error && data && (
          <>
            <MiniStockChart chartData={data.chartData} bigMoves={activeHits} color={color} gradientId={gradientId} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <button style={tabStyle('threshold')} onClick={() => setActiveTab('threshold')}>Daily Change ({thresholdHits.length})</button>
              <button style={tabStyle('zscore')} onClick={() => setActiveTab('zscore')}>Change in Difference ({zscoreHits.length})</button>
              <button style={tabStyle('consensus')} onClick={() => setActiveTab('consensus')}>Both ({consensus.length})</button>
            </div>
            <BigMoveTable moves={activeHits} emptyMsg="No big moves found with current settings." />
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [selectedTicker, setSelectedTicker] = useState("1155.KL");
  const [selectedPeriod, setSelectedPeriod] = useState("1mo");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compPeriod, setCompPeriod] = useState('3mo');
  const [thresholdPct, setThresholdPct] = useState(2);
  const [zScoreThreshold, setZScoreThreshold] = useState(1.5);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://trading-dashboard-api-fsbx.onrender.com/api/stock/' + selectedTicker + '?period=' + selectedPeriod);
        const result = await response.json();
        if (result.error) setError(result.error);
        else setData(result);
      } catch (err) {
        setError("Failed to fetch data from the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTicker, selectedPeriod]);

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    if (value >= 1e9) return 'RM ' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return 'RM ' + (value / 1e6).toFixed(2) + 'M';
    return 'RM ' + value.toFixed(2);
  };

  const mainBigMoves = useMemo(() => {
    if (!data?.chartData) return [];
    return detectByThreshold(data.chartData, thresholdPct);
  }, [data, thresholdPct]);

  const panelColor = selectedTicker === '6963.KL' ? '#8b5cf6' : '#317EAC';

  return (
    <div className="min-h-screen bg-background">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <nav className="bg-[#2E3E4E] text-white py-2 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-8 h-8 bg-orange-400 rounded-sm flex items-center justify-center font-bold text-lg">📈</div>
            <div className="relative flex-grow md:w-64">
              <input type="text" placeholder="Search ticker" className="w-full pl-3 pr-10 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none" />
              <Search className="absolute right-2 top-2 text-gray-500" size={16} />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm whitespace-nowrap">
            <a href="#" className="flex items-center gap-1 hover:text-gray-300"><User size={16} /> Login</a>
            <a href="#" className="hover:text-gray-300"><HelpCircle size={18} /></a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#317EAC] mb-2">Stocks Dashboard</h1>
          <p className="text-gray-500 text-sm">Find and analyze the best stocks with your criteria.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">

            <div className="ui-card">
              <div className="ui-card-header"><Settings2 size={20} /> Dashboard Settings</div>
              <div className="ui-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Stock Name</label>
                    <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}
                      className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                      {Object.entries(TICKERS).map(([ticker, name]) => (
                        <option key={ticker} value={ticker}>{name} ({ticker})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Timeline</label>
                    <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                      {PERIODS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-card">
              <div className="ui-card-header"><Activity size={20} /> Price History</div>
              <div className="ui-card-body h-[450px]">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#317EAC]"></div>
                  </div>
                ) : error ? (
                  <div className="p-4 text-sm text-red-600 rounded bg-red-50 border border-red-200"><span className="font-medium">Error:</span> {error}</div>
                ) : data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#317EAC" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#317EAC" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => 'RM ' + v.toFixed(1)} domain={['auto', 'auto']} width={80} />
                      <Tooltip content={<CustomTooltip bigMoves={mainBigMoves} />} />
                      <Area type="monotone" dataKey="price" stroke="#317EAC" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" dot={false} />
                      {mainBigMoves.map((m, i) => (
                        <ReferenceDot key={i} x={m.date} y={m.price} r={6} fill={m.pct >= 0 ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>

            <div className="ui-card">
              <div className="ui-card-header" style={{ color: '#7c3aed' }}>
                <GitCompare size={20} style={{ color: '#7c3aed' }} />
                Big Moves Summary — {TICKERS[selectedTicker]} ({selectedTicker})
              </div>
              <div className="ui-card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Period</label>
                    <select value={compPeriod} onChange={e => setCompPeriod(e.target.value)}
                      style={{ fontSize: 13, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', background: '#fff', cursor: 'pointer' }}>
                      <option value="1mo">1 Month</option>
                      <option value="3mo">3 Months</option>
                      <option value="6mo">6 Months</option>
                      <option value="1y">1 Year</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} style={{ color: '#f59e0b' }} />
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Daily Change threshold:
                      <span style={{ color: '#1e293b', display: 'inline-block', minWidth: '2.8rem', textAlign: 'right' }}>{thresholdPct}%</span>
                    </label>
                    <input type="range" min={0.5} max={10} step={0.5} value={thresholdPct}
                      onChange={e => setThresholdPct(Number(e.target.value))}
                      style={{ width: 100, accentColor: '#317EAC', flexShrink: 0 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={14} style={{ color: '#8b5cf6' }} />
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Change in Difference:
                      <span style={{ color: '#1e293b', display: 'inline-block', minWidth: '2.2rem', textAlign: 'right' }}>{zScoreThreshold}x</span>
                    </label>
                    <input type="range" min={0.5} max={4} step={0.5} value={zScoreThreshold}
                      onChange={e => setZScoreThreshold(Number(e.target.value))}
                      style={{ width: 100, accentColor: '#8b5cf6', flexShrink: 0 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Price spike (green dot)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Price drop (red dot)
                  </span>
                  <span>Both tab = flagged by both methods (high confidence)</span>
                </div>

                <ComparisonPanel
                  tickerKey={selectedTicker}
                  name={TICKERS[selectedTicker]}
                  period={compPeriod}
                  color={panelColor}
                  gradientId="mainGrad"
                  thresholdPct={thresholdPct}
                  zScoreThreshold={zScoreThreshold}
                />
              </div>
            </div>

          </div>

          <div className="w-full lg:w-80">
            <div className="ui-card sticky top-24">
              <div className="ui-card-header flex justify-between">
                <div className="flex items-center gap-2"><Filter size={20} /> Active Metrics</div>
              </div>
              <div className="ui-card-body space-y-4">
                {loading ? (
                  <div className="text-sm text-gray-500 text-center py-4">Loading metrics...</div>
                ) : data ? (
                  <>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><TrendingUp size={16} className="text-emerald-500" /> Period High</div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.highest)}</div>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><TrendingDown size={16} className="text-red-500" /> Period Low</div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.lowest)}</div>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><DollarSign size={16} className="text-blue-500" /> Market Capital</div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.marketCap)}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#fafafa', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Big Moves (main chart)
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{mainBigMoves.filter(m => m.pct >= 0).length}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>spikes</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{mainBigMoves.filter(m => m.pct < 0).length}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>drops</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#317EAC' }}>{mainBigMoves.length}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>total</div>
                        </div>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-[#317EAC] hover:bg-[#226a9a] text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                      onClick={() => window.location.reload()}>
                      <Search size={16} /> Update Data
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
