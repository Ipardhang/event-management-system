import { useEffect, useMemo, useState } from "react";
import Profile from "./Profile.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

function formatPrice(value) {
  return Number(value) > 0 ? `₹${Number(value).toLocaleString("en-IN")}` : "Free entry";
}

function App() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [myEvents, setMyEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [view, setView] = useState(() => window.location.hash === "#profile" ? "profile" : "home");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "attendee" });
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("evently_user") || "null"));
  const [eventForm, setEventForm] = useState({
    title: "", description: "", category: "Technology", date: "", location: "", capacity: 50, ticketPrice: 0, image: ""
  });

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => `${event.title} ${event.category} ${event.location}`.toLowerCase().includes(term));
  }, [events, search]);

  async function request(path, options = {}) {
    const { headers: optionHeaders = {}, ...requestOptions } = options;
    const response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers: { "Content-Type": "application/json", ...optionHeaders }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await request(`/events?search=${encodeURIComponent(search)}`);
      setEvents(data.events);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyEvents() {
    if (!user || !["organizer", "admin"].includes(user.role)) return;
    try {
      const data = await request("/events/mine", {
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` }
      });
      setMyEvents(data.events);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadRegistrations() {
    if (!user || user.role !== "attendee") return;
    try {
      const data = await request("/registrations/my", {
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` }
      });
      setRegistrations(data.registrations);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => {
    const token = localStorage.getItem("evently_token");
    if (!token) return;
    let active = true;
    request("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ user: account }) => {
        if (active) {
          const profile = { id: account.id || account._id, name: account.name, email: account.email, avatar: account.avatar || "", role: account.role };
          localStorage.setItem("evently_user", JSON.stringify(profile));
          setUser(profile);
        }
      }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const handleHashChange = () => setView(window.location.hash === "#profile" ? "profile" : "home");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => { loadMyEvents(); }, [user]);
  useEffect(() => { loadRegistrations(); }, [user]);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      const data = await request(`/auth/${authMode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(authForm)
      });
      localStorage.setItem("evently_token", data.token);
      localStorage.setItem("evently_user", JSON.stringify(data.user));
      setUser(data.user);
      setNotice(authMode === "register" ? "Account created successfully. Welcome to Evently!" : `Welcome back, ${data.user.name}!`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function registerForEvent(id) {
    if (!user) return setNotice("Please log in before registering for an event.");
    try {
      const data = await request(`/registrations/events/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` }
      });
      setNotice(`Registration confirmed. Ticket: ${data.registration.ticketNumber}`);
      loadEvents();
      loadRegistrations();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function openEvent(event) {
    try {
      const data = await request(`/events/${event._id}`);
      setSelectedEvent(data.event);
    } catch (error) {
      setSelectedEvent(event);
      setNotice(error.message);
    }
  }

  async function createEvent(event) {
    event.preventDefault();
    try {
      await request("/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify(eventForm)
      });
      setNotice("Event submitted for admin approval.");
      setEventForm({ title: "", description: "", category: "Technology", date: "", location: "", capacity: 50, ticketPrice: 0, image: "" });
      loadMyEvents();
    } catch (error) {
      setNotice(error.message);
    }
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setNotice("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setNotice("Please choose an image smaller than 8 MB.");

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        setEventForm((current) => ({ ...current, image: canvas.toDataURL("image/jpeg", 0.78) }));
        setNotice("Photo added. Submit the event when you are ready.");
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function moderateEvent(id, status) {
    try {
      await request(`/events/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify({ status })
      });
      setNotice(`Event ${status} successfully.`);
      loadMyEvents();
      loadEvents();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteEvent(id) {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await request(`/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` }
      });
      setNotice("Event deleted successfully.");
      setSelectedEvent(null);
      loadMyEvents();
      loadEvents();
    } catch (error) {
      setNotice(error.message);
    }
  }

  function updateForm(setter) {
    return (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">✦</span> evently</a>
        <div className="nav-links"><a href="#discover">Discover</a><a href="#organize">Organize</a>{user?.role === "admin" && <a href="#admin-review">Admin review</a>}<a href="#about">About</a></div>
        <div className="nav-actions">
          {user && <a className="outline-button profile-nav" href="#profile">My profile</a>}
          {user ? <button className="ghost-button" onClick={() => { localStorage.removeItem("evently_token"); localStorage.removeItem("evently_user"); setUser(null); }}>Log out</button> : <a className="outline-button" href="#auth">Sign in</a>}
          <a className="primary-button" href="#organize">Host an event <span>↗</span></a>
        </div>
      </nav>

      {view === "profile" && user ? <Profile key={user.id || user._id} user={user} request={request} onSaved={(profile) => {
        localStorage.setItem("evently_user", JSON.stringify(profile));
        setUser(profile);
      }} /> : <>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> Curated experiences, made simple</div>
          <h1>Make moments<br /><em>matter.</em></h1>
          <p>Discover meaningful events, meet new people, and create experiences worth remembering.</p>
          <div className="hero-actions"><a className="primary-button" href="#discover">Explore events <span>→</span></a><a className="text-link" href="#organize">I want to host <span>↗</span></a></div>
          <div className="social-proof"><div className="avatar-stack"><i>RK</i><i>AS</i><i>MP</i><i>+</i></div><span><strong>2,400+</strong> people found their next experience</span></div>
        </div>
        <div className="hero-art"><div className="art-card card-back" /><div className="art-card card-main"><div className="art-label">NEXT EVENT</div><div className="art-date">18<span>MAR</span></div><div className="art-title">Creative<br />Mornings</div><div className="art-meta">Bengaluru · 09:00 AM</div></div><div className="floating-note">✦ <span>Good things<br />are waiting.</span></div></div>
      </section>

      <section className="discover shell" id="discover">
        <div className="section-heading"><div><div className="eyebrow">Find your people</div><h2>Events worth showing up for.</h2></div><div className="search-wrap"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadEvents()} placeholder="Search events" /></div></div>
        {notice && <div className="notice">{notice}</div>}
        {loading ? <p className="muted">Loading events…</p> : visibleEvents.length === 0 ? <div className="empty"><span>✦</span><h3>Your next event starts here.</h3><p>No approved events yet. Organizers can submit an event below; it will appear here after admin approval.</p><a className="text-link" href="#organize">Create an event ↗</a></div> : <div className="event-grid">{visibleEvents.map((event) => <article className="event-card clickable" key={event._id} onClick={() => openEvent(event)}><div className="event-image" style={event.image ? { backgroundImage: `linear-gradient(180deg, #102a4310, #102a43aa), url(${event.image})` } : undefined}><span>{event.category}</span><b>{new Date(event.date).getDate()}</b></div><div className="event-content"><div className="event-date">{formatDate(event.date)}</div><h3>{event.title}</h3><p>{event.location}</p><div className="event-footer"><span>{formatPrice(event.ticketPrice)}</span><button onClick={(clickEvent) => { clickEvent.stopPropagation(); registerForEvent(event._id); }}>Reserve spot →</button></div></div></article>)}</div>}
      </section>

      {user?.role === "attendee" && <section className="tickets shell"><div className="section-heading"><div><div className="eyebrow">Your event pass</div><h2>My bookings.</h2></div><span className="muted">{registrations.length} booking{registrations.length === 1 ? "" : "s"}</span></div>{registrations.length === 0 ? <div className="submission-empty">Your confirmed event tickets will appear here after you reserve a spot.</div> : <div className="ticket-grid">{registrations.map((registration) => <article className="ticket-card" key={registration._id}><div className="ticket-accent" /><div className="ticket-main"><span className="status-pill confirmed">{registration.status}</span><h3>{registration.event?.title || "Event"}</h3><p>{registration.event ? `${formatDate(registration.event.date)} · ${registration.event.location}` : "Event details unavailable"}</p></div><div className="ticket-code"><span>TICKET NUMBER</span><strong>{registration.ticketNumber}</strong></div></article>)}</div>}</section>}

      <section className="organize shell" id="organize">
        <div className="organize-intro"><div className="eyebrow">For the ones who bring us together</div><h2>Have an idea?<br /><em>Bring it to life.</em></h2><p>Create an event people will talk about long after it ends.</p></div>
        {isOrganizer ? <form className="event-form" onSubmit={createEvent}><h3>Create a new event</h3><p className="form-help">Your submission will be visible in your organizer dashboard while it waits for approval.</p><input name="title" value={eventForm.title} onChange={updateForm(setEventForm)} placeholder="Event title" required /><textarea name="description" value={eventForm.description} onChange={updateForm(setEventForm)} placeholder="Tell people what to expect" required /><div className="form-row"><input name="category" value={eventForm.category} onChange={updateForm(setEventForm)} placeholder="Category" required /><input name="location" value={eventForm.location} onChange={updateForm(setEventForm)} placeholder="Location" required /></div><div className="form-row"><input type="datetime-local" name="date" value={eventForm.date} onChange={updateForm(setEventForm)} required /><input type="number" name="capacity" min="1" value={eventForm.capacity} onChange={updateForm(setEventForm)} placeholder="Capacity" required /></div><div className="form-row"><input type="number" name="ticketPrice" min="0" value={eventForm.ticketPrice} onChange={updateForm(setEventForm)} placeholder="Ticket price (₹)" /><span className="free-entry-note">Enter 0 for free entry</span></div><label className="upload-field"><span className="upload-icon">↑</span><span><strong>Upload event photo</strong><small>JPG, PNG, or WEBP · max 8 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} /></label>{eventForm.image && <div className="photo-preview"><img src={eventForm.image} alt="Event preview" /><button type="button" onClick={() => setEventForm((current) => ({ ...current, image: "" }))}>Remove photo</button></div>}<div className="photo-divider"><span>or paste an image URL</span></div><input type="url" name="image" value={eventForm.image.startsWith("data:") ? "" : eventForm.image} onChange={updateForm(setEventForm)} placeholder="Event photo URL (https://...)" /><p className="form-help">A photo makes your event easier to discover.</p><button className="primary-button" type="submit">Submit for approval ↗</button></form> : <div className="organize-card"><span className="big-star">✦</span><h3>Every great event<br />starts with an idea.</h3><p>Sign up as an organizer to share yours with the community.</p><a className="primary-button" href="#auth">Become an organizer ↗</a></div>}
      </section>

      {isOrganizer && <section className="my-events shell" id={user.role === "admin" ? "admin-review" : undefined}><div className="section-heading"><div><div className="eyebrow">{user.role === "admin" ? "Control center" : "Your organizer space"}</div><h2>{user.role === "admin" ? "Review events." : "Your submissions."}</h2></div><span className="muted">{myEvents.length} event{myEvents.length === 1 ? "" : "s"}</span></div>{myEvents.length === 0 ? <div className="submission-empty">{user.role === "admin" ? "No event submissions need review." : "Your submitted events will appear here with their approval status."}</div> : <div className="submission-grid">{myEvents.map((event) => <article className="submission-card" key={event._id}><div><span className={`status-pill ${event.status}`}>{event.status}</span><h3>{event.title}</h3><p>{formatDate(event.date)} · {event.location}</p>{user.role === "admin" && <p className="submission-organizer">Organizer: {event.organizer?.name || "Unknown"}</p>}</div>{user.role === "admin" ? <div className="moderation-actions">{event.status === "pending" && <><button className="approve-button" onClick={() => moderateEvent(event._id, "approved")}>Approve</button><button className="reject-button" onClick={() => moderateEvent(event._id, "rejected")}>Reject</button></>}<button className="delete-button" onClick={() => deleteEvent(event._id)}>Delete</button></div> : <span className="submission-arrow">↗</span>}</article>)}</div>}</section>}

      {selectedEvent && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}><section className="event-modal" role="dialog" aria-modal="true" aria-label="Event details" onClick={(clickEvent) => clickEvent.stopPropagation()}><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close event details">×</button>{selectedEvent.image && <div className="modal-image" style={{ backgroundImage: `url(${selectedEvent.image})` }} />}<div className="modal-body"><div className="modal-kicker"><span className="status-pill approved">{selectedEvent.category}</span><span>{formatPrice(selectedEvent.ticketPrice)}</span></div><h2>{selectedEvent.title}</h2><p className="modal-description">{selectedEvent.description}</p><div className="event-detail-grid"><div><span>WHEN</span><strong>{formatDateTime(selectedEvent.date)}</strong></div><div><span>WHERE</span><strong>{selectedEvent.location}</strong></div><div><span>AVAILABILITY</span><strong>{selectedEvent.availableSeats} seats left</strong></div><div><span>ORGANIZED BY</span><strong>{selectedEvent.organizer?.name || "Event organizer"}</strong></div></div><button className="primary-button modal-reserve" onClick={() => { registerForEvent(selectedEvent._id); setSelectedEvent(null); }}>Reserve your spot <span>→</span></button></div></section></div>}

      <section className="auth shell" id="auth"><div className="auth-copy"><div className="eyebrow">Your event journey</div><h2>Be part of<br /><em>something good.</em></h2><p>Sign in to reserve your spot, or create an organizer account to bring your own event to life.</p></div><form className="auth-form" onSubmit={handleAuth}><div className="tabs"><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Sign in</button><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Create account</button></div>{authMode === "register" && <input name="name" value={authForm.name} onChange={updateForm(setAuthForm)} placeholder="Full name" required />}<input type="email" name="email" value={authForm.email} onChange={updateForm(setAuthForm)} placeholder="Email address" required /><input type="password" name="password" value={authForm.password} onChange={updateForm(setAuthForm)} placeholder="Password (6+ characters)" required />{authMode === "register" && <select name="role" value={authForm.role} onChange={updateForm(setAuthForm)}><option value="attendee">I want to attend events</option><option value="organizer">I want to organize events</option></select>}<button className="primary-button" type="submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <span>→</span></button></form></section>

      </>}

      <footer className="footer shell" id="about"><a className="brand" href="#top"><span className="brand-mark">✦</span> evently</a><span>Made for meaningful moments.</span><span>© 2026 Evently</span></footer>
    </main>
  );
}

export default App;
