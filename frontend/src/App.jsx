import { useState, useEffect, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceDot
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Settings2, Filter,
  Search, User, HelpCircle, Zap, BarChart2
} from 'lucide-react';

const TICKERS = {
  "1155.KL": "Maybank",
  "6963.KL": "VS Industry",
  "6599.KL": "Aeon",
  "5347.KL": "Tenaga Nasional",
  "1023.KL": "CIMB Group",
  "3182.KL": "Genting",
  "5258.KL": "BIMB",
  "0101.KL": "TMCLife",
  "5318.KL": "DXN",
  "5123.KL": "Sentral REIT",
  "6888.KL": "Axiata",
  "5246.KL": "Wprts",
  "5024.KL": "Hupseng",
  "8664.KL": "SP Setia",
  "5200.KL": "UOA Dev",
  "3042.KL": "PetronM",
  "5199.KL": "Hibiscus",
  "7277.KL": "Dialog",
  "5099.KL": "Capital A",
  "4677.KL": "YTL",
  "5555.KL": "Sunmed",
  "5263.KL": "Suncon",
  "5225.KL": "IHH",
  "0128.KL": "Frontkn",
  "5398.KL": "Gamuda",
  "5309.KL": "Itmax",
  "8869.KL": "PMetal",
  "5292.KL": "UWC",
  "1961.KL": "IOI Corp"
};

const PERIODS = [
  { label: '6 Months', value: '6mo' },
  { label: '1 Year',   value: '1y'  },
  { label: '3 Years',  value: '3y'  },
  { label: '5 Years',  value: '5y'  },
  { label: '10 Years', value: '10y' }
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

function App() {
  const [selectedTicker, setSelectedTicker] = useState('1155.KL');
  const [selectedPeriod, setSelectedPeriod] = useState('6mo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Analysis controls
  const [activeTab, setActiveTab] = useState('none'); // 'none' | 'threshold' | 'zscore' | 'consensus'
  const [thresholdPct, setThresholdPct] = useState(2);
  const [zScoreThreshold, setZScoreThreshold] = useState(1.5);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${API}/api/stock/${selectedTicker}?period=${selectedPeriod}`
        );
        const result = await response.json();
        if (result.error) setError(result.error);
        else setData(result);
      } catch {
        setError('Failed to fetch data from the server.');
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

  const { thresholdHits, zscoreHits, consensus } = useMemo(() => {
    if (!data?.chartData) return { thresholdHits: [], zscoreHits: [], consensus: [] };
    const t = detectByThreshold(data.chartData, thresholdPct);
    const z = detectByZScore(data.chartData, zScoreThreshold);
    return { thresholdHits: t, zscoreHits: z, consensus: findConsensus(t, z) };
  }, [data, thresholdPct, zScoreThreshold]);

  const activeDots =
    activeTab === 'threshold' ? thresholdHits :
    activeTab === 'zscore'    ? zscoreHits    :
    activeTab === 'consensus' ? consensus      : [];

  const spikeCount = activeDots.filter(m => m.pct >= 0).length;
  const dropCount  = activeDots.filter(m => m.pct < 0).length;

  const tabStyle = (tab) => ({
    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1.5px solid',
    borderColor: activeTab === tab ? '#317EAC' : '#e2e8f0',
    background: activeTab === tab ? '#317EAC' : '#fff',
    color: activeTab === tab ? '#fff' : '#64748b',
    transition: 'all 0.15s'
  });

  return (
    <div className="min-h-screen bg-background">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
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

      {/* Page body */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#317EAC] mb-2">Stocks Dashboard</h1>
          <p className="text-gray-500 text-sm">Find and analyze the best stocks with your criteria.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main column */}
          <div className="flex-1 space-y-6">

            {/* Dashboard Settings */}
            <div className="ui-card">
              <div className="ui-card-header"><Settings2 size={20} /> Dashboard Settings</div>
              <div className="ui-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Stock Name</label>
                    <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}
                      className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                      {Object.entries(TICKERS).sort(([, a], [, b]) => a.localeCompare(b)).map(([ticker, name]) => (
                        <option key={ticker} value={ticker}>{name} ({ticker})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Timeline</label>
                    <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                      {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Price History + Analysis card */}
            <div className="ui-card">
              <div className="ui-card-header"><Activity size={20} /> Price History &amp; Analysis</div>
              <div className="ui-card-body">

                {/* Chart */}
                <div style={{ height: 420 }}>
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#317EAC]"></div>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-sm text-red-600 rounded bg-red-50 border border-red-200">
                      <span className="font-medium">Error:</span> {error}
                    </div>
                  ) : data ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#317EAC" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#317EAC" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => 'RM ' + v.toFixed(1)} domain={['auto', 'auto']} width={80} />
                        <Tooltip content={<CustomTooltip bigMoves={activeDots} />} />
                        <Area type="monotone" dataKey="price" stroke="#317EAC" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" dot={false} />
                        {activeDots.map((m, i) => (
                          <ReferenceDot key={i} x={m.date} y={m.price} r={6}
                            fill={m.pct >= 0 ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>

                {/* Analysis controls — only shown when data is loaded */}
                {!loading && !error && data && (
                  <div style={{ marginTop: 20 }}>

                    {/* Tabs + sliders bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>

                      {/* Tab buttons — clicking same tab again deselects it */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button style={tabStyle('threshold')}
                          onClick={() => setActiveTab(activeTab === 'threshold' ? 'none' : 'threshold')}>
                          Daily Change ({thresholdHits.length})
                        </button>
                        <button style={tabStyle('zscore')}
                          onClick={() => setActiveTab(activeTab === 'zscore' ? 'none' : 'zscore')}>
                          Change in Difference ({zscoreHits.length})
                        </button>
                        <button style={tabStyle('consensus')}
                          onClick={() => setActiveTab(activeTab === 'consensus' ? 'none' : 'consensus')}>
                          Both ({consensus.length})
                        </button>
                      </div>

                      {/* Vertical divider */}
                      <div style={{ width: 1, height: 28, background: '#e2e8f0', flexShrink: 0 }} />

                      {/* Daily Change threshold slider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Daily Change: <span style={{ color: '#1e293b', display: 'inline-block', minWidth: '2.8rem', textAlign: 'right' }}>{thresholdPct}%</span>
                        </span>
                        <input type="range" min={0.5} max={10} step={0.5} value={thresholdPct}
                          onChange={e => setThresholdPct(Number(e.target.value))}
                          style={{ width: 90, accentColor: '#317EAC', flexShrink: 0 }} />
                      </div>

                      {/* Z-score slider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart2 size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Diff: <span style={{ color: '#1e293b', display: 'inline-block', minWidth: '2.2rem', textAlign: 'right' }}>{zScoreThreshold}x</span>
                        </span>
                        <input type="range" min={0.5} max={4} step={0.5} value={zScoreThreshold}
                          onChange={e => setZScoreThreshold(Number(e.target.value))}
                          style={{ width: 90, accentColor: '#8b5cf6', flexShrink: 0 }} />
                      </div>
                    </div>

                    {/* Legend — only shown when a tab is active */}
                    {activeTab !== 'none' && (
                      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Price spike (green dot)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Price drop (red dot)
                        </span>
                        {activeTab === 'consensus' && <span>Both = flagged by both methods (high confidence)</span>}
                      </div>
                    )}

                    {/* Moves table — only shown when a tab is active */}
                    {activeTab !== 'none' && (
                      <BigMoveTable moves={activeDots} emptyMsg="No big moves found with current settings." />
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
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
                        Big Moves {activeTab !== 'none'
                          ? `(${activeTab === 'threshold' ? 'Daily Change' : activeTab === 'zscore' ? 'Diff' : 'Both'})`
                          : '(none selected)'}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{spikeCount}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>spikes</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{dropCount}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>drops</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#317EAC' }}>{activeDots.length}</div>
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
