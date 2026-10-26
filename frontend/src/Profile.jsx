import { useState } from "react";
import "./profile.css";

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Profile({ user, request, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, avatar: user.avatar || "", currentPassword: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const dirty = form.name.trim() !== user.name || emailChanged || form.avatar !== (user.avatar || "");

  function change(event) {
    setFeedback(null);
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function reset() {
    setForm({ name: user.name, email: user.email, avatar: user.avatar || "", currentPassword: "" });
    setFeedback(null);
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setFeedback({ error: true, message: "Please choose a JPG, PNG, or WEBP image." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ error: true, message: "Please choose an image smaller than 8 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        setForm((current) => ({ ...current, avatar: canvas.toDataURL("image/jpeg", 0.82) }));
        setFeedback(null);
      };
      image.onerror = () => setFeedback({ error: true, message: "That image could not be read." });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const data = await request("/auth/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify({ name: form.name, email: form.email, avatar: form.avatar, ...(emailChanged ? { currentPassword: form.currentPassword } : {}) })
      });
      onSaved(data.user);
      setForm({ name: data.user.name, email: data.user.email, avatar: data.user.avatar || "", currentPassword: "" });
      setFeedback({ error: false, message: "Your profile has been updated." });
    } catch (error) {
      setFeedback({ error: true, message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-section shell" id="profile" aria-labelledby="profile-title">
      <div className="profile-back"><a className="text-link" href="#top">← Back to home</a></div>
      <div className="section-heading"><div><div className="eyebrow">Your account</div><h2 id="profile-title">Edit profile.</h2><p className="profile-lead">Keep your Evently identity up to date.</p></div></div>
      <div className="profile-layout">
        <aside className="profile-summary">
          <div className="profile-avatar-wrap">
            {form.avatar ? <img className="profile-avatar" src={form.avatar} alt="Profile preview" /> : <span className="profile-avatar initials" aria-hidden="true">{initials(user.name)}</span>}
            <label className="avatar-upload" title="Change profile photo" aria-label="Change profile photo">✎<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} /></label>
          </div>
          <h3>{user.name}</h3><p>{user.email}</p><span className="status-pill approved">{user.role}</span>
          <p className="avatar-help">Upload a square photo for the best result.</p>
        </aside>
        <form className="profile-form" onSubmit={save} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="profile-name">Full name</label>
            <input id="profile-name" name="name" value={form.name} onChange={change} autoComplete="name" minLength={2} maxLength={80} required />
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" type="email" name="email" value={form.email} onChange={change} autoComplete="email" maxLength={254} required />
            {emailChanged && <><label htmlFor="profile-password">Current password</label><input id="profile-password" type="password" name="currentPassword" value={form.currentPassword} onChange={change} autoComplete="current-password" required /><p className="form-help">Confirm your password to change your sign-in email.</p></>}
            <div className="profile-photo-actions"><label className="upload-photo-button"><span>Upload profile photo</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} /></label>{form.avatar && <button className="ghost-button remove-photo" type="button" disabled={busy} onClick={() => setForm((current) => ({ ...current, avatar: "" }))}>Remove photo</button>}</div>
            <div className="profile-actions"><button className="primary-button" disabled={!dirty || busy} type="submit">{busy ? "Saving…" : "Save changes"}</button><button className="outline-button" type="button" disabled={!dirty || busy} onClick={reset}>Cancel</button></div>
          </fieldset>
          {feedback && <p className={`profile-feedback${feedback.error ? " error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
        </form>
      </div>
    </section>
  );
}
