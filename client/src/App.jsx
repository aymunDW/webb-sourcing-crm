import React, { useEffect, useState, useCallback } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import { api, getStoredToken, setToken } from './api.js';

const CATEGORIES = ["Sapphire","Ruby","Emerald","Diamond","Mandarin Garnet","Pink Tourmaline","Rubellite","Pearl","Other"];
const STATUSES = ["Requested","Quoted","In Review","Approved","Rejected"];
const STATUS_CLASS = {"Requested":"st-requested","Quoted":"st-quoted","In Review":"st-review","Approved":"st-approved","Rejected":"st-rejected"};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [view, setView] = useState('dashboard');
  const [suppliers, setSuppliers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type, editing}
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sup, req, act] = await Promise.all([api.getSuppliers(), api.getRequests(), api.getActivity()]);
      setSuppliers(sup); setRequests(req); setActivity(act);
    } catch (e) {
      if (e.message === 'Invalid or expired token') { setToken(null); setUser(null); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setCheckedAuth(true); return; }
    // No /me endpoint kept minimal; rely on stored user in localStorage set at login/register.
    const stored = localStorage.getItem('webb_user');
    if (stored) setUser(JSON.parse(stored));
    setCheckedAuth(true);
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  function onAuthed(u) {
    localStorage.setItem('webb_user', JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('webb_user');
    setUser(null);
  }

  if (!checkedAuth) return <div className="dw-loading">Loading…</div>;
  if (!user) return <AuthPage onAuthed={onAuthed} />;

  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || 'Unassigned';

  async function refreshRequests() { setRequests(await api.getRequests()); }
  async function refreshSuppliers() { setSuppliers(await api.getSuppliers()); }
  async function refreshActivity() { setActivity(await api.getActivity()); }

  return (
    <div className="dw-app">
      <div className="dw-side">
        <div className="dw-brand">
          <div className="dw-brand-name">The Webb Sourcing</div>
          <div className="dw-brand-sub">Sourcing CRM</div>
        </div>
        <div className="dw-nav">
          {[['dashboard','Dashboard'],['suppliers','Suppliers'],['pipeline','Sourcing Pipeline'],['activity','Activity Log']].map(([k,l]) => (
            <button key={k} className={`dw-nav-btn ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <div className="dw-side-foot">
          <div className="dw-me">Signed in as<br /><b>{user.name}</b> · {user.role === 'admin' ? 'Admin' : 'Member'}</div>
          <button className="dw-relink" onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="dw-main">
        {loading ? <div className="dw-loading">Loading data…</div> : (
          <>
            {view === 'dashboard' && (
              <Dashboard suppliers={suppliers} requests={requests} activity={activity} />
            )}
            {view === 'suppliers' && (
              <Suppliers
                suppliers={suppliers} search={search} setSearch={setSearch}
                catFilter={catFilter} setCatFilter={setCatFilter}
                onAdd={() => setModal({ type: 'supplier', editing: null })}
                onEdit={(s) => setModal({ type: 'supplier', editing: s })}
                onDelete={async (s) => {
                  if (!confirm(`Delete supplier ${s.name}?`)) return;
                  await api.deleteSupplier(s.id);
                  await refreshSuppliers(); await refreshActivity();
                }}
              />
            )}
            {view === 'pipeline' && (
              <Pipeline
                requests={requests} supplierName={supplierName}
                onAdd={() => setModal({ type: 'request', editing: null })}
                onEdit={(r) => setModal({ type: 'request', editing: r })}
                onDelete={async (r) => {
                  if (!confirm(`Delete request "${r.title}"?`)) return;
                  await api.deleteRequest(r.id);
                  await refreshRequests(); await refreshActivity();
                }}
                onStatusChange={async (r, status) => {
                  await api.updateRequest(r.id, {
                    title: r.title, supplierId: r.supplier_id, stoneType: r.stone_type,
                    status, priority: r.priority, notes: r.notes
                  });
                  await refreshRequests(); await refreshActivity();
                }}
              />
            )}
            {view === 'activity' && (
              <ActivityView
                activity={activity}
                onAddNote={async (text) => { await api.addNote(text); await refreshActivity(); }}
              />
            )}
          </>
        )}
      </div>
      {modal && modal.type === 'supplier' && (
        <SupplierModal
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal.editing) await api.updateSupplier(modal.editing.id, data);
            else await api.createSupplier(data);
            await refreshSuppliers(); await refreshActivity();
            setModal(null);
          }}
        />
      )}
      {modal && modal.type === 'request' && (
        <RequestModal
          editing={modal.editing}
          suppliers={suppliers}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal.editing) await api.updateRequest(modal.editing.id, data);
            else await api.createRequest(data);
            await refreshRequests(); await refreshActivity();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function Dashboard({ suppliers, requests, activity }) {
  const openReqs = requests.filter(r => r.status !== 'Approved' && r.status !== 'Rejected').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Dashboard</h1>
      <p className="dw-sub">Overview of suppliers, sourcing pipeline, and recent activity.</p>
      <div className="dw-stats">
        <Stat num={suppliers.length} label="Suppliers" />
        <Stat num={requests.length} label="Sourcing Requests" />
        <Stat num={openReqs} label="Open in Pipeline" />
        <Stat num={approved} label="Approved" />
      </div>
      <div className="dw-panel">
        <div className="dw-panel-title">Recent Activity</div>
        <div className="dw-feed">
          {activity.length ? activity.slice(0, 8).map(a => (
            <div className="dw-feed-item" key={a.id}>
              <div className="dw-feed-dot"></div>
              <div><div>{a.text}</div><div className="dw-feed-meta">{a.author_name} · {timeAgo(a.created_at)}</div></div>
            </div>
          )) : <div className="dw-empty">No activity yet. Add a supplier or sourcing request to get started.</div>}
        </div>
      </div>
    </>
  );
}

function Stat({ num, label }) {
  return <div className="dw-stat"><div className="dw-stat-num">{num}</div><div className="dw-stat-label">{label}</div></div>;
}

function Suppliers({ suppliers, search, setSearch, catFilter, setCatFilter, onAdd, onEdit, onDelete }) {
  const list = suppliers.filter(s => {
    const matchQ = !search || `${s.name}${s.company}${s.country}`.toLowerCase().includes(search.toLowerCase());
    const matchC = catFilter === 'all' || s.category === catFilter;
    return matchQ && matchC;
  });
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Suppliers</h1>
      <p className="dw-sub">Contacts across your gemstone and materials supplier network.</p>
      <div className="dw-toolbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="dw-btn dw-btn-gold" onClick={onAdd}>+ Add Supplier</button>
      </div>
      <div className="dw-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="dw-table">
          <thead><tr><th>Name</th><th>Company</th><th>Category</th><th>Country</th><th>Contact</th><th>Last Contact</th><th></th></tr></thead>
          <tbody>
            {list.length ? list.map(s => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td>
                <td>{s.company}</td>
                <td><span className="dw-tag">{s.category}</span></td>
                <td>{s.country}</td>
                <td>{s.email}{s.phone ? <><br />{s.phone}</> : null}</td>
                <td>{s.last_contact ? new Date(s.last_contact).toLocaleDateString() : '—'}</td>
                <td>
                  <div className="dw-row-actions">
                    <button className="dw-link-btn" onClick={() => onEdit(s)}>Edit</button>
                    <button className="dw-link-btn" onClick={() => onDelete(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={7}><div className="dw-empty">No suppliers yet. Click "Add Supplier" to add your first contact.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pipeline({ requests, supplierName, onAdd, onEdit, onDelete, onStatusChange }) {
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Sourcing Pipeline</h1>
      <p className="dw-sub">Track sourcing requests from ask to approval.</p>
      <div className="dw-toolbar">
        <div></div>
        <button className="dw-btn dw-btn-gold" onClick={onAdd}>+ New Sourcing Request</button>
      </div>
      <div className="dw-pipeline">
        {STATUSES.map(st => {
          const cards = requests.filter(r => r.status === st);
          return (
            <div className="dw-col" key={st}>
              <div className="dw-col-head"><span>{st}</span><span>{cards.length}</span></div>
              {cards.length ? cards.map(r => (
                <div className="dw-card" key={r.id}>
                  <div className="dw-card-title">{r.title}</div>
                  <div className="dw-card-meta">
                    {r.stone_type} · {supplierName(r.supplier_id)}
                    {r.priority === 'High' ? <> · <b style={{ color: 'var(--danger)' }}>High</b></> : null}
                  </div>
                  <select value={r.status} onChange={e => onStatusChange(r, e.target.value)}>
                    {STATUSES.map(s2 => <option key={s2} value={s2}>{s2}</option>)}
                  </select>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <button className="dw-link-btn" onClick={() => onEdit(r)}>Edit</button>
                    <button className="dw-link-btn" onClick={() => onDelete(r)}>Delete</button>
                  </div>
                </div>
              )) : <div className="dw-empty" style={{ padding: '4px 0' }}>Empty</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ActivityView({ activity, onAddNote }) {
  const [note, setNote] = useState('');
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Activity Log</h1>
      <p className="dw-sub">Full history across suppliers and sourcing requests.</p>
      <div className="dw-panel">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)}
            style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 6, padding: '9px 10px', fontSize: 13 }} />
          <button className="dw-btn dw-btn-gold" onClick={() => { if (note.trim()) { onAddNote(note.trim()); setNote(''); } }}>Add Note</button>
        </div>
        <div className="dw-feed">
          {activity.length ? activity.map(a => (
            <div className="dw-feed-item" key={a.id}>
              <div className="dw-feed-dot"></div>
              <div><div>{a.text}</div><div className="dw-feed-meta">{a.author_name} · {new Date(a.created_at).toLocaleString()}</div></div>
            </div>
          )) : <div className="dw-empty">No activity yet.</div>}
        </div>
      </div>
    </>
  );
}

function SupplierModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    name: editing.name, company: editing.company || '', category: editing.category || CATEGORIES[0],
    country: editing.country || '', email: editing.email || '', phone: editing.phone || '',
    lastContact: editing.last_contact ? editing.last_contact.slice(0, 10) : '', notes: editing.notes || ''
  } : { name: '', company: '', category: CATEGORIES[0], country: '', email: '', phone: '', lastContact: '', notes: '' });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
        <div className="dw-field"><label>Contact Name</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="dw-field"><label>Company</label><input value={form.company} onChange={e => set('company', e.target.value)} /></div>
        <div className="dw-field"><label>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="dw-field"><label>Country</label><input value={form.country} onChange={e => set('country', e.target.value)} /></div>
        <div className="dw-field"><label>Email</label><input value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="dw-field"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div className="dw-field"><label>Last Contact Date</label><input type="date" value={form.lastContact} onChange={e => set('lastContact', e.target.value)} /></div>
        <div className="dw-field"><label>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => { if (!form.name.trim()) return alert('Name is required'); onSave(form); }}>
            {editing ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestModal({ editing, suppliers, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    title: editing.title, supplierId: editing.supplier_id || '', stoneType: editing.stone_type || '',
    status: editing.status, priority: editing.priority, notes: editing.notes || ''
  } : { title: '', supplierId: '', stoneType: '', status: 'Requested', priority: 'Normal', notes: '' });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>{editing ? 'Edit Sourcing Request' : 'New Sourcing Request'}</h3>
        <div className="dw-field"><label>Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Mandarin Garnet cabochons, 8x6mm" />
        </div>
        <div className="dw-field"><label>Supplier</label>
          <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
            <option value="">Unassigned</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company})</option>)}
          </select>
        </div>
        <div className="dw-field"><label>Stone / Material Type</label><input value={form.stoneType} onChange={e => set('stoneType', e.target.value)} /></div>
        <div className="dw-field"><label>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s2 => <option key={s2}>{s2}</option>)}
          </select>
        </div>
        <div className="dw-field"><label>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option>Normal</option><option>High</option>
          </select>
        </div>
        <div className="dw-field"><label>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => { if (!form.title.trim()) return alert('Title is required'); onSave(form); }}>
            {editing ? 'Save Changes' : 'Create Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
