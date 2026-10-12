import { useEffect, useState } from 'react';
import { api, PREVIEW } from '../api.js';

const STAGES = [
  { id: 'new', label: 'New' },
  { id: 'drafted', label: 'Email drafted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'won', label: 'Won' },
  { id: 'dead', label: 'Not now' },
];
const NEXT = ['contacted', 'meeting', 'won', 'dead'];

function copy(text, notify) {
  navigator.clipboard?.writeText(text).then(() => notify('Copied.'), () => notify('Select the text to copy it.'));
}

function LeadCard({ lead, onStatus, notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card lead s-${lead.status}`}>
      <button className="lead-head" onClick={() => setOpen(!open)}>
        <span className="lead-name">{lead.business}</span>
        <span className="lead-meta">{[lead.business_type, lead.city].filter(Boolean).join(' · ')}</span>
        <span className="lead-row">
          <span className={`tag stage-${lead.status}`}>{STAGES.find((s) => s.id === lead.status)?.label}</span>
          <span className="stars" aria-label={`Fit ${lead.score} of 5`}>{'★'.repeat(lead.score)}{'☆'.repeat(5 - lead.score)}</span>
        </span>
      </button>
      {open && (
        <div className="lead-body">
          {lead.opportunity && <p><b>Opportunity.</b> {lead.opportunity}</p>}
          {lead.warm_paths && <p className="warm"><b>Meet them naturally.</b><br />{lead.warm_paths}</p>}
          <dl className="contact">
            {lead.contact_name && <><dt>Contact</dt><dd>{lead.contact_name}{lead.contact_role && `, ${lead.contact_role}`}</dd></>}
            {lead.phone && <><dt>Phone</dt><dd><button className="linkish" onClick={() => copy(lead.phone, notify)}>{lead.phone}</button></dd></>}
            {lead.email && <><dt>Email</dt><dd><button className="linkish" onClick={() => copy(lead.email, notify)}>{lead.email}</button></dd></>}
            {lead.website && <><dt>Website</dt><dd><a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">{lead.website.replace(/^https?:\/\//, '')}</a></dd></>}
            {lead.source_url && <><dt>Verified at</dt><dd><a href={lead.source_url} target="_blank" rel="noreferrer">source</a></dd></>}
          </dl>
          {lead.status !== 'new' && lead.status !== 'dead' && <p className="small muted">The cold email for this lead is at the Printer.</p>}
          <div className="row wrap">
            {NEXT.filter((s) => s !== lead.status).map((s) => (
              <button key={s} className={`btn small ${s === 'won' ? 'good' : ''}`} onClick={() => onStatus(lead, s)}>
                {STAGES.find((x) => x.id === s).label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Wren's lead board. */
export function Leads({ tick, notify }) {
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState('active');
  const load = () => api('/leads').then(setLeads).catch((e) => notify(e.message));
  useEffect(() => { load(); }, [tick]);

  const setStatus = async (lead, status) => {
    try { await api(`/leads/${lead.id}`, { method: 'PATCH', body: { status } }); notify(status === 'won' ? 'Won! +200 XP to Wren.' : 'Updated.'); load(); }
    catch (e) { notify(e.message); }
  };
  const prospect = async () => {
    try { await api('/shift/wren', { method: 'POST' }); notify('Wren is out hunting for leads.'); }
    catch (e) { notify(e.message); }
  };

  const count = (s) => leads?.filter((l) => l.status === s).length || 0;
  const shown = (leads || []).filter((l) => (filter === 'active' ? !['won', 'dead'].includes(l.status) : filter === 'all' || l.status === filter));

  return (
    <div>
      <div className="dialog">
        {PREVIEW
          ? "In the preview I can't search the web, so I won't invent leads. Tell me businesses you have in mind and I'll research angles and write the emails. In your own office I find and verify new leads every weekday."
          : 'Every weekday morning and afternoon I find new businesses whose marketing should be better, verify their details, draft a cold email for each and work out ways to meet them without one.'}
      </div>
      <div className="pipeline">
        {STAGES.slice(0, 5).map((s) => (
          <div key={s.id} className="pipe"><b>{count(s.id)}</b><span>{s.label}</span></div>
        ))}
      </div>
      {!PREVIEW && <button className="btn" onClick={prospect}>Send Wren prospecting now</button>}
      <div className="seg" style={{ marginTop: 12 }}>
        {[['active', 'Open'], ['meeting', 'Meetings'], ['won', 'Won'], ['all', 'All']].map(([id, label]) => (
          <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {leads && !shown.length && <p className="muted center">No leads here yet.</p>}
      {shown.map((l) => <LeadCard key={l.id} lead={l} onStatus={setStatus} notify={notify} />)}
    </div>
  );
}
