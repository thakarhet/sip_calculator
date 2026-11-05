import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, ChevronDown, CircleHelp, Clock3, Coins, Download, Menu, Plus, ShieldCheck, Sparkles, TrendingUp, Wallet, X } from 'lucide-react';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const money = (n) => inr.format(Math.round(n || 0));
const initial = { amount: 10000, years: 15, rate: 12, stepUp: 10, frequency: 'monthly' };

function calculate({ amount, years, rate, stepUp, frequency }, calculatorType = 'SIP') {
  const periods = Math.max(1, Math.round(years * (frequency === 'monthly' ? 12 : 4)));
  if (calculatorType === 'Lump sum') {
    const yearly = Array.from({ length: years }, (_, index) => ({ year: index + 1, invested: amount, value: amount * Math.pow(1 + rate / 100, index + 1) }));
    const value = amount * Math.pow(1 + rate / 100, years);
    return { invested: amount, value, gains: value - amount, yearly };
  }
  const ratePer = Math.pow(1 + rate / 100, 1 / (frequency === 'monthly' ? 12 : 4)) - 1;
  const perYear = frequency === 'monthly' ? 12 : 4;
  let invested = 0, value = 0;
  const yearly = [];
  for (let year = 1; year <= years; year++) {
    const contribution = amount * Math.pow(1 + stepUp / 100, year - 1);
    for (let p = 0; p < perYear && (year - 1) * perYear + p < periods; p++) {
      invested += contribution;
      value = (value + contribution) * (1 + ratePer);
    }
    yearly.push({ year, invested, value });
  }
  return { invested, value, gains: value - invested, yearly };
}

function App() {
  const [inputs, setInputs] = useState(initial);
  const [activeTab, setActiveTab] = useState('SIP');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('growwise_user') || 'null'));
  const [token, setToken] = useState(() => sessionStorage.getItem('growwise_token'));
  const [saved, setSaved] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const result = useMemo(() => calculate(inputs, activeTab), [inputs, activeTab]);
  const max = result.value || 1;

  function update(key, value) { setInputs((old) => ({ ...old, [key]: Number(value) })); setSaved(false); }
  async function authenticate(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const mode = authMode === 'signup' ? 'register' : 'login';
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not sign in');
      setToken(data.token); setUser(data.user); sessionStorage.setItem('growwise_token', data.token); sessionStorage.setItem('growwise_user', JSON.stringify(data.user)); setShowAuth(false);
      const action = pendingAction; setPendingAction(null);
      if (action === 'download') await downloadSummary(data.token);
    } catch (err) { window.alert(err.message); }
  }
  async function savePlan() {
    if (!token) { setAuthMode('login'); setShowAuth(true); return; }
    try {
      const response = await fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: `${inputs.years}-year ${activeTab} plan`, calculatorType: activeTab.toLowerCase(), inputs, result: { invested: result.invested, futureValue: result.value, returns: result.gains } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save plan');
      setSaved(true);
    } catch (err) { window.alert(err.message); }
  }
  function logout() { setUser(null); setToken(null); setSaved(false); sessionStorage.removeItem('growwise_token'); sessionStorage.removeItem('growwise_user'); }
  async function downloadSummary(authTokenOverride) {
    const authToken = typeof authTokenOverride === 'string' ? authTokenOverride : (sessionStorage.getItem('growwise_token') || token);
    if (!authToken) { setPendingAction('download'); setAuthMode('login'); setShowAuth(true); return; }
    try {
      const response = await fetch('/api/plans/export', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ calculatorType: activeTab.toLowerCase(), inputs }) });
      if (response.status === 401) { logout(); setPendingAction('download'); setAuthMode('login'); setShowAuth(true); return; }
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'Could not download projection'); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'growwise-projection.txt'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { window.alert(err.message); }
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-icon"><TrendingUp size={19} /></span><span>growwise<span className="brand-dot">.</span></span></a><nav className="nav-links"><a className="active" href="#calculator">Calculators</a><a href="#how-it-works">How it works</a><a href="/learn.html">Learn</a></nav><div className="top-actions"><button className="icon-button menu-button" aria-label="Open menu"><Menu size={20}/></button>{user ? <div className="user-chip"><span className="avatar">{user.name?.[0]?.toUpperCase() || 'G'}</span><span>{user.name?.split(' ')[0]}</span><button onClick={logout}>Sign out</button></div> : <button className="sign-in" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Sign in <ArrowRight size={15}/></button>}</div></header>
    <main id="top"><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> YOUR MONEY, WITH A PLAN</div><h1>Make your future<br/>feel <em>closer.</em></h1><p>A clearer way to see what consistent investing could do. Start with a number, explore the possibilities.</p><a className="hero-link" href="#calculator">Explore your numbers <ArrowDownRight size={17}/></a></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sun-disc"><Sparkles size={28}/></div><div className="float-card"><span className="float-label">YOUR MONEY AT WORK</span><strong>{money(result.value)}</strong><span className="float-growth"><ArrowUpRight size={14}/> projected value</span></div><div className="art-caption"><span className="caption-dot"/> SMALL STEPS. LONG HORIZONS.</div></div></section>
    <section className="calculator-section" id="calculator"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> THE CALCULATOR</div><h2>See what adds up.</h2></div><div className="section-note"><CircleHelp size={15}/> Estimates are illustrative, not guaranteed.</div></div>
      <div className="calculator-card"><div className="controls-panel"><div className="tabs" role="tablist"><button className={activeTab === 'SIP' ? 'selected' : ''} onClick={() => setActiveTab('SIP')}>SIP</button><button className={activeTab === 'Lump sum' ? 'selected' : ''} onClick={() => setActiveTab('Lump sum')}>Lump sum</button></div><div className="control-intro"><span className="control-icon"><Coins size={17}/></span><div><strong>{activeTab === 'SIP' ? 'Build it, bit by bit.' : 'Start with what you have.'}</strong><span>{activeTab === 'SIP' ? 'A regular investment, growing over time.' : 'A one-time investment, compounding over time.'}</span></div></div>
        <div className="field-block"><div className="field-label"><label htmlFor="amount">{activeTab === 'SIP' ? 'Investment amount' : 'Investment amount'}</label><span>INR</span></div><div className="amount-input"><span>₹</span><input id="amount" type="number" min="500" step="500" value={inputs.amount} onChange={(e) => update('amount', e.target.value)}/>{activeTab === 'SIP' && <div className="frequency-wrap"><select aria-label="Investment frequency" value={inputs.frequency} onChange={(e) => setInputs((old) => ({ ...old, frequency: e.target.value }))}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select><ChevronDown size={14}/></div>}</div><input className="range" aria-label="Investment amount slider" type="range" min="500" max="100000" step="500" value={Math.min(inputs.amount,100000)} onChange={(e) => update('amount', e.target.value)}/><div className="range-labels"><span>₹500</span><span>₹1,00,000+</span></div></div>
        <div className="field-block"><div className="field-label"><label htmlFor="years">Investment period</label><span>YEARS</span></div><div className="number-display"><input id="years" type="number" min="1" max="40" value={inputs.years} onChange={(e) => update('years', Math.max(1, Math.min(40, Number(e.target.value))))}/><span>years</span><Clock3 size={16}/></div><input className="range" aria-label="Investment period slider" type="range" min="1" max="40" value={inputs.years} onChange={(e) => update('years', e.target.value)}/><div className="range-labels"><span>1 year</span><span>40 years</span></div></div>
        <div className="field-block compact-field"><div className="field-label"><label htmlFor="rate">Expected annual return</label><span>% P.A.</span></div><div className="number-display"><input id="rate" type="number" min="1" max="30" step="0.5" value={inputs.rate} onChange={(e) => update('rate', e.target.value)}/><span>%</span><TrendingUp size={16}/></div><input className="range" aria-label="Expected annual return slider" type="range" min="1" max="30" step="0.5" value={inputs.rate} onChange={(e) => update('rate', e.target.value)}/><div className="range-labels"><span>1%</span><span>30%</span></div></div>
        {activeTab === 'SIP' && <div className="stepup-row"><div><strong>Annual contribution increase</strong><span>Raise your SIP each year</span></div><div className="stepup-control"><button aria-label="Decrease step up" onClick={() => update('stepUp', Math.max(0, inputs.stepUp - 1))}>−</button><b>{inputs.stepUp}%</b><button aria-label="Increase step up" onClick={() => update('stepUp', Math.min(30, inputs.stepUp + 1))}>+</button></div></div>}
        <div className="control-actions"><button className="save-button" onClick={savePlan}><Plus size={16}/>{saved ? 'Plan saved' : 'Save this plan'}</button><button className="download-button" onClick={() => downloadSummary()} aria-label={token ? 'Download projection' : 'Sign in to download projection'} title={token ? 'Download projection' : 'Sign in to download'}><Download size={17}/></button></div><p className="secure-note"><ShieldCheck size={14}/> Sign in to download or save plans privately.</p></div>
      <div className="results-panel"><div className="results-topline"><span className="results-tag"><span/> YOUR PROJECTION</span><span className="assumption">At {inputs.rate}% assumed return</span></div><div className="result-total"><span>Estimated future value</span><strong>{money(result.value)}</strong><div className="result-gain"><span><ArrowUpRight size={14}/>{money(result.gains)} potential growth</span><span className="result-divider"/> <span>over {inputs.years} years</span></div></div><div className="chart-area"><div className="chart-y-labels"><span>{money(result.value)}</span><span>{money(result.value * .66)}</span><span>{money(result.value * .33)}</span><span>₹0</span></div><div className="chart"><div className="chart-grid"><i/><i/><i/><i/></div><div className="chart-bars">{result.yearly.filter((_, i) => i % Math.ceil(result.yearly.length / 10) === 0 || i === result.yearly.length - 1).map((point, i, arr) => <div className="bar-group" key={point.year}><div className="bar-pair"><span className="bar-invested" style={{ height: `${Math.max(2, point.invested / max * 100)}%` }}/><span className="bar-value" style={{ height: `${Math.max(3, point.value / max * 100)}%` }}/></div><small>{i === 0 || i === arr.length-1 || i % 3 === 0 ? `Y${point.year}` : ''}</small></div>)}</div></div></div><div className="chart-legend"><span><i className="legend-invested"/> Amount invested <b>{money(result.invested)}</b></span><span><i className="legend-growth"/> Estimated growth <b>{money(result.gains)}</b></span></div><div className="breakdown"><div><span><Wallet size={15}/> Your investment</span><strong>{money(result.invested)}</strong></div><div><span><BarChart3 size={15}/> Estimated returns</span><strong className="green-text">{money(result.gains)}</strong></div><div><span><Coins size={15}/> Total value</span><strong>{money(result.value)}</strong></div></div><div className="disclaimer"><ShieldCheck size={16}/><p><strong>A projection, not a promise.</strong> Mutual fund investments are subject to market risks. Actual returns may vary from this illustration.</p></div></div></div>
    </section>
    <section className="bottom-strip" id="how-it-works"><div className="strip-icon"><BadgeCheck size={19}/></div><div><strong>Built for better money conversations.</strong><span>Explore a range of outcomes, then decide what feels right for you.</span></div><a href="/learn.html">A little more about SIPs <ArrowRight size={15}/></a></section>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-icon"><TrendingUp size={17}/></span><span>growwise<span className="brand-dot">.</span></span></a><span>Planning tools for the long view.</span><span className="footer-legal">For educational use only · Mutual fund investments are subject to market risks.</span></footer>
    </main>{showAuth && <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setShowAuth(false); setPendingAction(null); } }}><section className="auth-modal"><button className="modal-close" aria-label="Close" onClick={() => { setShowAuth(false); setPendingAction(null); }}><X size={19}/></button><div className="eyebrow"><span className="eyebrow-line"/> ACCOUNT ACCESS</div><h2>{authMode === 'signup' ? 'Create your account.' : 'Sign in to continue.'}</h2><p>Sign in to download your projection or save your plans.</p><form onSubmit={authenticate}>{authMode === 'signup' && <label>Your name<input name="name" autoComplete="name" required minLength="2" maxLength="80"/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required/></label><button className="save-button modal-submit" type="submit">{authMode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={15}/></button></form><div className="auth-switch">{authMode === 'signup' ? 'Already have an account?' : 'New to Growwise?'} <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>{authMode === 'signup' ? 'Sign in' : 'Create account'}</button></div></section></div>}</div>;
}

export default App;
