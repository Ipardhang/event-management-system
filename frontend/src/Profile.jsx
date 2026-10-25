import { useState } from "react";
import "./profile.css";

export default function Profile({ user, request, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const dirty = form.name.trim() !== user.name || emailChanged;

  function change(event) {
    setFeedback(null);
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function reset() {
    setForm({ name: user.name, email: user.email, currentPassword: "" });
    setFeedback(null);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const data = await request("/auth/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify({ name: form.name, email: form.email, ...(emailChanged ? { currentPassword: form.currentPassword } : {}) })
      });
      onSaved(data.user);
      setForm({ name: data.user.name, email: data.user.email, currentPassword: "" });
      setFeedback({ error: false, message: "Your profile has been updated." });
    } catch (error) {
      setFeedback({ error: true, message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-section shell" id="profile" aria-labelledby="profile-title">
      <div className="section-heading"><div><div className="eyebrow">Your account</div><h2 id="profile-title">Edit profile.</h2></div></div>
      <div className="profile-layout">
        <aside className="profile-summary">
          <span className="profile-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <h3>{user.name}</h3><p>{user.email}</p><span className="status-pill approved">{user.role}</span>
        </aside>
        <form className="profile-form" onSubmit={save} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="profile-name">Full name</label>
            <input id="profile-name" name="name" value={form.name} onChange={change} autoComplete="name" minLength={2} maxLength={80} required />
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" type="email" name="email" value={form.email} onChange={change} autoComplete="email" maxLength={254} required />
            {emailChanged && <><label htmlFor="profile-password">Current password</label><input id="profile-password" type="password" name="currentPassword" value={form.currentPassword} onChange={change} autoComplete="current-password" required /><p className="form-help">Confirm your password to change your sign-in email.</p></>}
            <div className="profile-actions"><button className="primary-button" disabled={!dirty || busy} type="submit">{busy ? "Saving…" : "Save changes"}</button><button className="outline-button" type="button" disabled={!dirty || busy} onClick={reset}>Cancel</button></div>
          </fieldset>
          {feedback && <p className={`profile-feedback${feedback.error ? " error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
        </form>
      </div>
    </section>
  );
}
