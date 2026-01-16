
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { 
  PricingVariant, 
  BillingCycle, 
  DecisionStatus, 
  GlobalAssumptions,
  VariantResult,
  SimulationOutput,
  VariantAssumptions
} from './types';
import SectionHeader from './components/SectionHeader';

const App: React.FC = () => {
  // --- State ---
  const [variants, setVariants] = useState<PricingVariant[]>([
    { id: 'v1', name: 'Control', price: 499, billingCycle: 'Monthly', notes: 'Current baseline', isControl: true },
    { id: 'v2', name: 'Test Variant 1', price: 349, billingCycle: 'Monthly', notes: 'Testing lower price point', isControl: false },
    { id: 'v3', name: 'Test Variant 2', price: 3990, billingCycle: 'Annual', notes: 'Testing annual commitment', isControl: false },
  ]);

  const [assumptions, setAssumptions] = useState<GlobalAssumptions>({
    monthlyTraffic: 25000,
    perVariantAssumptions: {
      'v1': { variantId: 'v1', trafficSplit: 34, convRate: 4.2, churnRate: 5 },
      'v2': { variantId: 'v2', trafficSplit: 33, convRate: 6.1, churnRate: 8 },
      'v3': { variantId: 'v3', trafficSplit: 33, convRate: 2.8, churnRate: 2 },
    }
  });

  const [decision, setDecision] = useState<DecisionStatus | null>(null);
  const [rationale, setRationale] = useState('');

  // --- Calculations ---
  const simulation: SimulationOutput = useMemo(() => {
    let trafficSplitTotal = 0;
    const results: VariantResult[] = variants.map(v => {
      const va = assumptions.perVariantAssumptions[v.id] || { variantId: v.id, trafficSplit: 0, convRate: 0, churnRate: 0 };
      trafficSplitTotal += va.trafficSplit;

      const visitors = assumptions.monthlyTraffic * (va.trafficSplit / 100);
      const conversions = visitors * (va.convRate / 100);
      
      // Calculate Normalized Monthly Revenue for fair comparison
      const rawRevenue = conversions * v.price;
      const normalizedMonthlyRevenue = v.billingCycle === 'Annual' ? rawRevenue / 12 : rawRevenue;
      
      const arpu = conversions > 0 ? (v.billingCycle === 'Annual' ? v.price / 12 : v.price) : 0;
      const rpv = visitors > 0 ? normalizedMonthlyRevenue / visitors : 0;

      return {
        variantId: v.id,
        name: v.name,
        visitors,
        conversions,
        revenue: normalizedMonthlyRevenue, 
        arpu,
        rpv,
        isRevenueLeader: false,
        isRPVLeader: false
      };
    });

    if (results.length > 0) {
      const maxRev = Math.max(...results.map(r => r.revenue));
      const maxRPV = Math.max(...results.map(r => r.rpv));
      results.forEach(r => {
        if (r.revenue === maxRev && maxRev > 0) r.isRevenueLeader = true;
        if (r.rpv === maxRPV && maxRPV > 0) r.isRPVLeader = true;
      });
    }

    return { results, trafficSplitTotal };
  }, [variants, assumptions]);

  // --- Insight Generation ---
  const experimentInsight = useMemo(() => {
    const leader = simulation.results.find(r => r.isRPVLeader);
    const control = simulation.results.find(r => r.variantId === 'v1');
    
    if (!leader || !control) return "Awaiting simulation data...";

    if (leader.variantId === 'v1') {
      return "The Control variant remains the most efficient strategy. Test variants have not yet demonstrated a significant uplift in Revenue Per Visitor (RPV).";
    }

    const lift = ((leader.rpv - control.rpv) / control.rpv) * 100;
    const convDiff = ((leader.conversions / leader.visitors) - (control.conversions / control.visitors)) * 100;

    let text = `${leader.name} is the winner with a ${lift.toFixed(1)}% efficiency lift over Control. `;
    
    if (convDiff > 0 && leader.arpu < control.arpu) {
      text += "It improves conversion volume significantly, successfully offsetting the lower price point/ARPU.";
    } else if (convDiff < 0 && leader.arpu > control.arpu) {
      text += "High ARPU is driving the success here, though it comes at the cost of a lower conversion rate compared to the baseline.";
    } else if (convDiff > 0 && leader.arpu >= control.arpu) {
      text += "It manages to increase both individual customer value and overall conversion—a highly efficient expansion strategy.";
    }

    return text;
  }, [simulation]);

  // --- Handlers ---
  const updateVariant = (id: string, field: keyof PricingVariant, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const updateAssumption = (vId: string, field: keyof VariantAssumptions, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      perVariantAssumptions: {
        ...prev.perVariantAssumptions,
        [vId]: { ...prev.perVariantAssumptions[vId], [field]: value }
      }
    }));
  };

  const controlResult = simulation.results.find(r => r.variantId === 'v1');
  const chartColors = ['#6366f1', '#10b981', '#f59e0b'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-24">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <i className="fa-solid fa-compass-drafting text-sm"></i>
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase italic">Pricing Architect</h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setup</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision</span>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-12">
        
        {/* FOLD 1: SETUP */}
        <section id="setup" className="space-y-12 animate-in fade-in duration-700">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Experiment Setup</h2>
            <p className="text-slate-500 text-sm max-w-xl">Define your baseline and test variants. All calculations normalize to monthly equivalents for comparative accuracy.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <SectionHeader title="Environment" icon="fa-globe" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Traffic Slider Card */}
                <div 
                  className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6 h-full"
                  data-tooltip-id="general-tooltip"
                  data-tooltip-content="Traffic defines the scale of the experiment simulation."
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Traffic (Monthly)</label>
                    <p className="text-2xl font-black text-indigo-600">{assumptions.monthlyTraffic.toLocaleString()}</p>
                  </div>
                  <input 
                    type="range" min="5000" max="250000" step="5000"
                    value={assumptions.monthlyTraffic}
                    onChange={(e) => setAssumptions(p => ({...p, monthlyTraffic: Number(e.target.value)}))}
                    className="w-full accent-indigo-600"
                  />
                  {simulation.trafficSplitTotal !== 100 && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-[9px] text-rose-600 font-bold flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      Traffic Split must total 100% (Current: {simulation.trafficSplitTotal}%)
                    </div>
                  )}
                </div>

                {/* Traffic Distribution Visualization Card */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6 h-full flex flex-col justify-between">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Traffic Allocation Overview</label>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${simulation.trafficSplitTotal === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {simulation.trafficSplitTotal === 100 ? 'Balanced' : 'Imbalanced'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Segmented Bar */}
                  <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner">
                    {variants.map((v, i) => {
                      const split = assumptions.perVariantAssumptions[v.id]?.trafficSplit || 0;
                      return (
                        <div 
                          key={v.id}
                          style={{ width: `${split}%`, backgroundColor: chartColors[i % chartColors.length] }}
                          className="h-full transition-all duration-500 ease-out border-r border-white/20 last:border-0 flex items-center justify-center overflow-hidden"
                          title={`${v.name}: ${split}%`}
                        >
                          {split > 10 && <span className="text-[9px] font-black text-white">{split}%</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4">
                    {variants.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }}></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap">{v.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {variants.map((v, i) => (
                <div key={v.id} className={`p-6 rounded-[32px] border-2 transition-all duration-300 ${v.isControl ? 'border-indigo-600 bg-white shadow-xl' : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${v.isControl ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {v.isControl ? 'Baseline' : `Variant ${i}`}
                    </span>
                    {v.isControl ? (
                      <span className="text-[10px] font-bold text-slate-800">Control Group</span>
                    ) : (
                      <input 
                        className="bg-slate-50 border-none font-bold text-[10px] text-slate-800 focus:outline-none w-1/2 px-2 py-0.5 rounded"
                        value={v.name} onChange={(e) => updateVariant(v.id, 'name', e.target.value)}
                      />
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">Price (₹)</label>
                        <input 
                          type="number" value={v.price} 
                          onChange={(e) => updateVariant(v.id, 'price', Number(e.target.value))}
                          className="w-full text-xs font-black text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">Cycle</label>
                        <select 
                          value={v.billingCycle}
                          onChange={(e) => updateVariant(v.id, 'billingCycle', e.target.value as BillingCycle)}
                          className="w-full text-xs font-black text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Annual">Annual</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Traffic Split (%)</label>
                          <span className="text-[10px] font-black text-slate-900">{assumptions.perVariantAssumptions[v.id]?.trafficSplit}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" step="1"
                          value={assumptions.perVariantAssumptions[v.id]?.trafficSplit}
                          onChange={(e) => updateAssumption(v.id, 'trafficSplit', Number(e.target.value))}
                          className="w-full accent-slate-400 h-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Conv. Rate (%)</label>
                          <span className="text-[10px] font-black text-indigo-600">{assumptions.perVariantAssumptions[v.id]?.convRate}%</span>
                        </div>
                        <input 
                          type="range" min="0.1" max="20" step="0.1"
                          value={assumptions.perVariantAssumptions[v.id]?.convRate}
                          onChange={(e) => updateAssumption(v.id, 'convRate', Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOLD 2: DASHBOARD */}
        <section id="dashboard" className="space-y-12">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Simulation Dashboard</h2>
            <p className="text-slate-500 text-sm">Real-time performance metrics normalized to Monthly Equivalent Revenue.</p>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {simulation.results.map((r, idx) => {
              const lift = controlResult && controlResult.rpv > 0 
                ? ((r.rpv - controlResult.rpv) / controlResult.rpv) * 100 
                : 0;

              return (
                <div key={r.variantId} className={`p-10 rounded-[40px] border-2 transition-all duration-500 relative overflow-hidden ${r.isRPVLeader ? 'bg-slate-900 text-white shadow-2xl scale-[1.02] border-slate-900' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {r.isRPVLeader && (
                    <div className="absolute top-0 right-0 p-8 opacity-20 text-7xl rotate-12 pointer-events-none">
                      <i className="fa-solid fa-trophy"></i>
                    </div>
                  )}
                  <div className="relative z-10 space-y-8">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${r.isRPVLeader ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {r.name}
                    </p>
                    
                    <div className="space-y-1 cursor-help" data-tooltip-id="metric-tooltip" data-tooltip-content="Normalized Monthly Revenue: For annual plans, this is (Revenue / 12). For monthly, it is direct revenue.">
                      <p className={`text-5xl font-black tracking-tighter ${r.isRPVLeader ? 'text-white' : 'text-slate-900'}`}>
                        ₹{Math.round(r.revenue).toLocaleString()}
                      </p>
                      <p className={`text-xs font-bold ${r.isRPVLeader ? 'text-slate-400' : 'text-slate-500'}`}>Total Revenue</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-t pt-8" style={{ borderColor: r.isRPVLeader ? '#334155' : '#f1f5f9' }}>
                      <div className="cursor-help" data-tooltip-id="metric-tooltip" data-tooltip-content="Revenue Per Visitor: Efficiency metric. Normalized Revenue / Total Visitors.">
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-2 ${r.isRPVLeader ? 'text-slate-500' : 'text-slate-400'}`}>Revenue per Visitor (RPV)</p>
                        <p className="text-xl font-black italic">₹{r.rpv.toFixed(2)}</p>
                      </div>
                      <div className="text-right cursor-help" data-tooltip-id="metric-tooltip" data-tooltip-content="Percentage improvement in RPV relative to the Baseline.">
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-2 ${r.isRPVLeader ? 'text-slate-500' : 'text-slate-400'}`}>Lift</p>
                        <p className={`text-xl font-black ${lift > 0 ? 'text-emerald-500' : lift < 0 ? 'text-rose-500' : ''}`}>
                          {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                        </p>
                      </div>
                      <div className="col-span-2 cursor-help" data-tooltip-id="metric-tooltip" data-tooltip-content="Average Revenue Per User (Monthly Equivalent): If Annual, this shows the per-month value.">
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-2 ${r.isRPVLeader ? 'text-slate-500' : 'text-slate-400'}`}>Monthly ARPU</p>
                        <p className="text-xl font-black">₹{Math.round(r.arpu).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DETAILED DATA & INSIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Efficiency Distribution (RPV)</h3>
                <div className="flex items-center gap-6">
                  {simulation.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i] }}></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simulation.results} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="rpv" radius={[16, 16, 16, 16]} barSize={60}>
                      {simulation.results.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} fillOpacity={0.9} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <div className="flex items-start gap-4 p-6 bg-slate-900 rounded-[32px] text-white">
                  <div className="mt-1 text-indigo-400">
                    <i className="fa-solid fa-chart-line text-lg"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-1">Experiment Insight</p>
                    <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                      “{experimentInsight}”
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FULL METRICS BREAKDOWN TABLE */}
            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 mb-8">Detailed Metrics Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variant</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Visitors</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Converted</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ARPU (Eq)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {simulation.results.map((r, i) => (
                      <tr key={r.variantId} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[i] }}></div>
                            <span className="text-xs font-bold text-slate-700">{r.name}</span>
                          </div>
                        </td>
                        <td className="py-5 text-right text-xs font-black text-slate-900">
                          {Math.round(r.visitors).toLocaleString()}
                        </td>
                        <td className="py-5 text-right text-xs font-black text-indigo-600">
                          {Math.round(r.conversions).toLocaleString()}
                        </td>
                        <td className="py-5 text-right text-xs font-black text-slate-900">
                          ₹{Math.round(r.arpu).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 bg-indigo-50/50 p-6 rounded-3xl">
                <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Calculation Logic</p>
                <p className="text-[11px] leading-relaxed text-indigo-900/70">
                  Visitors = Total Traffic × Traffic Split. Converted Users = Visitors × Conversion Rate. Total Revenue = Converted Users × (Price / normalized term).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOLD 3: DECISION */}
        <section id="decision" className="space-y-12">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Execution Plan</h2>
            <p className="text-slate-500 text-sm">Based on simulation data, document your final experimental verdict.</p>
          </div>

          <div className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experimental Verdict</p>
                <div className="flex flex-col gap-3">
                  {['SHIP', 'ITERATE', 'KILL'].map(s => (
                    <button 
                      key={s} onClick={() => setDecision(s as any)}
                      className={`flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${decision === s ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                    >
                      {s}
                      {decision === s && <i className="fa-solid fa-check text-indigo-400"></i>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rationale Summary</p>
                <textarea 
                  className="w-full h-full min-h-[180px] bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm focus:ring-4 focus:ring-indigo-50 outline-none resize-none placeholder:text-slate-300"
                  placeholder="Why did we reach this decision? (e.g., Variant 2 showed 15% RPV lift despite higher churn risk...)"
                  value={rationale} onChange={(e) => setRationale(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-12 border-t border-slate-100 flex flex-col items-center gap-6">
               <div className="w-16 h-1 bg-slate-100 rounded-full"></div>
               <p className="text-[11px] font-medium text-slate-400 text-center max-w-md italic">
                 "Profitability is the difference between revenue and the cost of capital. Pricing is the primary lever of growth."
               </p>
            </div>
          </div>
        </section>

      </main>

      {/* Tooltip Containers */}
      <ReactTooltip id="metric-tooltip" style={{ borderRadius: '16px', fontSize: '11px', maxWidth: '240px', fontWeight: '500', padding: '12px', background: '#0f172a' }} />
      <ReactTooltip id="general-tooltip" style={{ borderRadius: '16px', fontSize: '11px', maxWidth: '280px', fontWeight: '500', padding: '12px', background: '#0f172a' }} />
    </div>
  );
};

export default App;
