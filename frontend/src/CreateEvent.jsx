import { useState } from "react";
import "./create-event.css";

const initialForm = { title: "", description: "", category: "Technology", date: "", location: "", capacity: 50, ticketPrice: 0, image: "" };

export default function CreateEvent({ user, request, onCreated }) {
  const [eventForm, setEventForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  function updateForm(event) {
    setEventForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setFeedback("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setFeedback("Please choose an image smaller than 8 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        setEventForm((current) => ({ ...current, image: canvas.toDataURL("image/jpeg", 0.78) }));
        setFeedback("");
      };
      image.onerror = () => setFeedback("That image could not be read.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
      await request("/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify(eventForm)
      });
      setEventForm(initialForm);
      setFeedback("Event submitted for admin approval.");
      onCreated();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="create-event-page shell" id="add-event" aria-labelledby="add-event-title">
      <div className="create-event-back"><a className="text-link" href="#top">← Back to home</a></div>
      {!user ? <div className="create-event-locked"><div className="eyebrow">Event studio</div><h2>Sign in to create an event.</h2><p>Organizer accounts can publish events for admin approval.</p><a className="primary-button" href="#auth">Sign in or create account ↗</a></div> : !isOrganizer ? <div className="create-event-locked"><div className="eyebrow">Organizer access</div><h2>Want to host an event?</h2><p>Create an organizer account to share your experience with the Evently community.</p><a className="primary-button" href="#auth">Become an organizer ↗</a></div> : <>
        <div className="section-heading"><div><div className="eyebrow">Event studio</div><h2 id="add-event-title">Add a new event.</h2><p className="create-event-lead">Share the details. We’ll send your event for admin approval.</p></div></div>
        <form className="event-form create-event-form" onSubmit={submit}>
          <h3>Event details</h3>
          <p className="form-help">Make your event easy to understand and discover.</p>
          <input name="title" value={eventForm.title} onChange={updateForm} placeholder="Event title" required />
          <textarea name="description" value={eventForm.description} onChange={updateForm} placeholder="Tell people what to expect" required />
          <div className="form-row"><input name="category" value={eventForm.category} onChange={updateForm} placeholder="Category" required /><input name="location" value={eventForm.location} onChange={updateForm} placeholder="Location" required /></div>
          <div className="form-row"><input type="datetime-local" name="date" value={eventForm.date} onChange={updateForm} required /><input type="number" name="capacity" min="1" value={eventForm.capacity} onChange={updateForm} placeholder="Capacity" required /></div>
          <div className="form-row"><input type="number" name="ticketPrice" min="0" value={eventForm.ticketPrice} onChange={updateForm} placeholder="Ticket price (₹)" /><span className="free-entry-note">Enter 0 for free entry</span></div>
          <label className="upload-field"><span className="upload-icon">↑</span><span><strong>Upload event photo</strong><small>JPG, PNG, or WEBP · max 8 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} /></label>
          {eventForm.image && <div className="photo-preview"><img src={eventForm.image} alt="Event preview" /><button type="button" onClick={() => setEventForm((current) => ({ ...current, image: "" }))}>Remove photo</button></div>}
          <div className="photo-divider"><span>or paste an image URL</span></div>
          <input type="url" name="image" value={eventForm.image.startsWith("data:") ? "" : eventForm.image} onChange={updateForm} placeholder="Event photo URL (https://...)" />
          <p className="form-help">A photo makes your event easier to discover.</p>
          {feedback && <p className={`create-event-feedback${feedback.includes("submitted") ? " success" : ""}`} role="status">{feedback}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for approval ↗"}</button>
        </form>
      </>}
    </section>
  );
}
