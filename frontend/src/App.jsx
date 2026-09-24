import { useState, useEffect, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceDot, ComposedChart, Bar, Line, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Settings2, Filter,
  Search, User, HelpCircle, Zap, BarChart2, GitCompare, ChevronDown
} from 'lucide-react';

const TICKERS = {
  "1155.KL": "Maybank",
  "6963.KL": "VS Industry",
  "6599.KL": "Aeon",
  "5347.KL": "Tenaga Nasional",
  "1023.KL": "CIMB Group",
  "7277.KL": "Dialog Group",
  "5248.KL": "Bermaz Auto (Bauto)",
  "3042.KL": "Petron Malaysia",
  "3034.KL": "Hap Seng",
  "5235.KL": "KLCC",
  "4197.KL": "Sime Darby",
  "5200.KL": "UOA Development",
  "5109.KL": "YTL REIT",
  "5123.KL": "Sentral REIT",
  "5258.KL": "Bank Islam (BIMB)",
  "5180.KL": "Capitaland Malaysia Trust (CLMT)",
  "3182.KL": "Genting",
  "4707.KL": "Nestle",
  "2429.KL": "Tanco",
  "5555.KL": "Sunway Medical (SUNMED)",
  "8664.KL": "SP Setia",
  "5263.KL": "Sunway Construction",
  "5309.KL": "ITMAX System",
  "5225.KL": "IHH Healthcare",
  "0128.KL": "Frontken",
  "0101.KL": "TMC Life Sciences",
  "5318.KL": "DXN Holdings",
  "5398.KL": "Gamuda",
  "5246.KL": "Westports",
  "6888.KL": "Axiata",
  "5352.KL": "MTTSL",
  "5024.KL": "Hup Seng",
  "5102.KL": "Guan Chong (GCB)",
  "0166.KL": "Inari Amertron",
  "7113.KL": "Top Glove",
  "7106.KL": "Supermax",
  "6742.KL": "YTL Power"
};

const PERIODS = [
  { label: '6 Months', value: '6mo' },
  { label: '1 Year', value: '1y' },
  { label: '3 Years', value: '3y' },
  { label: '5 Years', value: '5y' },
  { label: '10 Years', value: '10y' }
];

function detectByThreshold(chartData, threshold = 2) {
  const result = [];
  for (let i = 1; i < chartData.length; i++) {
    const prev = chartData[i - 1].price;
    const curr = chartData[i].price;
    const pct = ((curr - prev) / prev) * 100;
    if (Math.abs(pct) >= threshold) {
      result.push({ date: chartData[i].date, price: curr, pct });
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
    .filter(c => c.z >= zThreshold);
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
          {move.pct > 0 ? 'Up +' : 'Down '}{move.pct.toFixed(2)}% big move
        </div>
      )}
    </div>
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

function CustomSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-select-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative flex-1 custom-select-container">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded p-2 flex justify-between items-center cursor-pointer"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className="text-gray-500 flex-shrink-0 ml-2" />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`p-2 text-sm cursor-pointer hover:bg-gray-100 ${value === opt.value ? 'bg-blue-50 text-[#317EAC] font-medium' : 'text-gray-700'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TICKER_OPTIONS = Object.entries(TICKERS)
  .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
  .map(([ticker, name]) => ({ value: ticker, label: `${name} (${ticker})` }));

function App() {
  const [selectedTicker, setSelectedTicker] = useState("1155.KL");
  const [selectedPeriod, setSelectedPeriod] = useState("6mo");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Big moves controls
  const [thresholdPct, setThresholdPct] = useState(2);
  const [zScoreThreshold, setZScoreThreshold] = useState(1.5);
  const [activeTab, setActiveTab] = useState(null); // null = no dots shown

  useEffect(() => {
    setActiveTab(null); // reset dots when stock/period changes
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

  // Compute all three detection sets from main chart data
  const { thresholdHits, zscoreHits, consensus } = useMemo(() => {
    if (!data?.chartData) return { thresholdHits: [], zscoreHits: [], consensus: [] };
    const t = detectByThreshold(data.chartData, thresholdPct);
    const z = detectByZScore(data.chartData, zScoreThreshold);
    return { thresholdHits: t, zscoreHits: z, consensus: findConsensus(t, z) };
  }, [data, thresholdPct, zScoreThreshold]);

  // Active dots shown on the main chart
  const activeDots = activeTab === 'threshold' ? thresholdHits
    : activeTab === 'zscore' ? zscoreHits
    : activeTab === 'consensus' ? consensus
    : []; // null = no dots

  // Toggle tab — clicking active tab deselects it
  const handleTab = (tab) => setActiveTab(prev => prev === tab ? null : tab);

  const panelColor = selectedTicker === '6963.KL' ? '#8b5cf6' : '#317EAC';

  const tabStyle = (tab) => ({
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: '1px solid',
    borderColor: activeTab === tab ? panelColor : '#e2e8f0',
    background: activeTab === tab ? panelColor : '#fff',
    color: activeTab === tab ? '#fff' : '#64748b',
    transition: 'all 0.15s'
  });

  return (
    <div className="min-h-screen bg-background">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav className="bg-[#2E3E4E] text-white py-2 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-orange-400 rounded-sm flex items-center justify-center font-bold text-lg">📈</div>
            <div className="relative w-64">
              <input type="text" placeholder="Search ticker"
                className="w-full pl-3 pr-10 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none" />
              <Search className="absolute right-2 top-2 text-gray-500" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="flex items-center gap-1 hover:text-gray-300"><User size={16} /> Login</a>
            <a href="#" className="hover:text-gray-300"><HelpCircle size={18} /></a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#317EAC] mb-2">Stocks Dashboard</h1>
          <p className="text-gray-500 text-sm">Find and analyze the best stocks with your criteria.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">

            {/* Settings */}
            <div className="ui-card">
              <div className="ui-card-header"><Settings2 size={20} /> Dashboard Settings</div>
              <div className="ui-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Stock Name</label>
                    <CustomSelect
                      value={selectedTicker}
                      onChange={setSelectedTicker}
                      options={TICKER_OPTIONS}
                      placeholder="Select a stock"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-24 text-sm font-medium text-gray-700">Timeline</label>
                    <CustomSelect
                      value={selectedPeriod}
                      onChange={setSelectedPeriod}
                      options={PERIODS}
                      placeholder="Select a timeline"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Merged: Price History + Big Moves controls in one card */}
            <div className="ui-card">
              <div className="ui-card-header">
                <Activity size={20} /> Price History
                {activeTab && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: panelColor, fontWeight: 600 }}>
                    {activeDots.length} big move{activeDots.length !== 1 ? 's' : ''} shown
                  </span>
                )}
              </div>
              <div className="ui-card-body">
                {/* Chart */}
                <div style={{ height: 450 }}>
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
                            <stop offset="5%" stopColor="#317EAC" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#317EAC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => 'RM ' + v.toFixed(1)} domain={['auto', 'auto']} width={80} />
                        <Tooltip content={<CustomTooltip bigMoves={activeDots} />} />
                        <Area type="monotone" dataKey="price" stroke="#317EAC" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" dot={false} />
                        {activeDots.map((m, i) => (
                          <ReferenceDot key={i} x={m.date} y={m.price} r={6}
                            fill={m.pct >= 0 ? '#10b981' : '#ef4444'}
                            stroke="#ffffff" strokeWidth={2}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>

                {/* Divider */}
                {data && <div style={{ borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />}

                {/* Controls + Tabs + Table */}
                {data && (
                  <>
                    {/* Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={14} style={{ color: '#f59e0b' }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Daily Change:
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

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Show on chart:</span>
                      <button style={tabStyle('threshold')} onClick={() => handleTab('threshold')}>
                        Daily Change ({thresholdHits.length})
                      </button>
                      <button style={tabStyle('zscore')} onClick={() => handleTab('zscore')}>
                        Change in Difference ({zscoreHits.length})
                      </button>
                      <button style={tabStyle('consensus')} onClick={() => handleTab('consensus')}>
                        Both ({consensus.length})
                      </button>
                      {activeTab && (
                        <button onClick={() => setActiveTab(null)}
                          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', color: '#94a3b8' }}>
                          ✕ Clear
                        </button>
                      )}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Spike
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Drop
                      </span>
                      <span style={{ color: '#94a3b8' }}>Select a method above to highlight big moves on the chart</span>
                    </div>

                    {/* Table */}
                    {activeTab ? (
                      <BigMoveTable moves={activeDots} emptyMsg="No big moves found with current settings." />
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: 13 }}>Select a method above to see the list of big moves.</p>
                    )}
                  </>
                )}
              </div>
            </div>



          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80">
            <div className="ui-card sticky top-24">
              <div className="ui-card-header">
                <Filter size={20} /> Active Metrics
              </div>
              <div className="ui-card-body space-y-4">
                {loading ? (
                  <div className="text-sm text-gray-500 text-center py-4">Loading metrics...</div>
                ) : data ? (
                  <>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <TrendingUp size={16} className="text-emerald-500" /> Period High
                      </div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.highest)}</div>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <TrendingDown size={16} className="text-red-500" /> Period Low
                      </div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.lowest)}</div>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <DollarSign size={16} className="text-blue-500" /> Market Capital
                      </div>
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(data.marketCap)}</div>
                    </div>

                    {data.dividendYield != null && (
                      <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <DollarSign size={16} className="text-purple-500" /> Div Yield TTM
                        </div>
                        <div className="text-xl font-bold text-gray-900">{data.dividendYield.toFixed(2)}%</div>
                      </div>
                    )}

                    {data.recentDividends && data.recentDividends.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 border-b border-gray-200 pb-1">
                          Recent Dividends
                        </div>
                        <div className="space-y-2">
                          {data.recentDividends.map((div, i) => (
                            <div key={i} className="flex flex-col border-b border-gray-100 last:border-0 pb-1.5 last:pb-0">
                              <div className="flex justify-between items-center text-sm mb-1">
                                <span className="text-gray-500">{div.date}</span>
                                <span className="font-semibold text-gray-900">RM {div.amount.toFixed(4)}</span>
                              </div>
                              {div.revenue !== undefined && div.revenue !== null && (
                                <div className="flex justify-between text-[10px] text-gray-400">
                                  <span>Rev: <span className="text-blue-500 font-medium">{formatCurrency(div.revenue)}</span></span>
                                  <span>Profit: <span className="text-emerald-500 font-medium">{formatCurrency(div.netProfit)}</span></span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Big moves counter in sidebar */}
                    {activeTab && (
                      <div style={{ padding: '12px', background: '#fafafa', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Big Moves Shown
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{activeDots.filter(m => m.pct >= 0).length}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>spikes</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{activeDots.filter(m => m.pct < 0).length}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>drops</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#317EAC' }}>{activeDots.length}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>total</div>
                          </div>
                        </div>
                      </div>
                    )}

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
