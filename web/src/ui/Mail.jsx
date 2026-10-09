import { api, PREVIEW } from '../api.js';

/** The mail terminal: what the team can see of your accounts. */
export function Mail({ state, notify }) {
  const c = state.integrations;
  const call = async (path, msg) => {
    try { await api(path, { method: 'POST' }); notify(msg); } catch (e) { notify(e.message); }
  };
  return (
    <div>
      <div className="dialog">
        {PREVIEW
          ? "This is the preview office. The team can't see your Gmail or calendar here. In your own office (the server version) Washington reads your inbox around the clock."
          : c.gmail
            ? 'Washington checks your inbox every 10 minutes and works a shift every few hours.'
            : 'Gmail is not connected yet. See SETUP.md, step 3.'}
      </div>
      <div className="conn"><span className={c.gmail ? 'ok' : 'no'} />Gmail (read-only)</div>
      <div className="conn"><span className={c.calendar ? 'ok' : 'no'} />Google Calendar (read-only)</div>
      {!PREVIEW && (
        <div className="row wrap">
          <button className="btn" disabled={!c.gmail} onClick={() => call('/inbox/sync', 'Inbox checked.')}>Check email now</button>
          <button className="btn" disabled={!c.ai} onClick={() => call('/shift/washington', 'Washington is starting a shift.')}>Run Washington's shift</button>
        </div>
      )}
      <p className="small muted">Nevermind can read, never send. Drafts always come to you at the Printer.</p>
    </div>
  );
}
