import { useEffect, useMemo, useState } from "react";
import CreateEvent from "./CreateEvent.jsx";
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

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function App() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [placeFilter, setPlaceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [view, setView] = useState(() => window.location.hash === "#profile" ? "profile" : window.location.hash === "#add-event" ? "add-event" : "home");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "attendee" });
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("evently_user") || "null"));
  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + (startOfToday.getDay() === 0 ? 1 : 8 - startOfToday.getDay()));
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNext30Days = new Date(now);
    endOfNext30Days.setDate(endOfNext30Days.getDate() + 30);
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      const matchesSearch = !term || `${event.title} ${event.category} ${event.location}`.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
      const matchesPlace = placeFilter === "all" || event.location === placeFilter;
      const matchesDate = dateFilter === "all"
        || (dateFilter === "today" && eventDate >= startOfToday && eventDate < endOfToday)
        || (dateFilter === "week" && eventDate >= startOfToday && eventDate < endOfWeek)
        || (dateFilter === "month" && eventDate >= startOfToday && eventDate < endOfMonth)
        || (dateFilter === "next30" && eventDate >= now && eventDate <= endOfNext30Days);
      return matchesSearch && matchesCategory && matchesPlace && matchesDate;
    });
  }, [events, search, categoryFilter, dateFilter, placeFilter]);

  const categories = useMemo(() => [...new Set(events.map((event) => event.category).filter(Boolean))].sort(), [events]);
  const places = useMemo(() => [...new Set(events.map((event) => event.location).filter(Boolean))].sort(), [events]);

  const upcomingEvent = useMemo(() => events
    .filter((event) => new Date(event.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null, [events]);

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
    const handleHashChange = () => setView(window.location.hash === "#profile" ? "profile" : window.location.hash === "#add-event" ? "add-event" : "home");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => { loadMyEvents(); }, [user]);
  useEffect(() => { loadRegistrations(); }, [user]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function resetFilters() {
    setCategoryFilter("all");
    setDateFilter("all");
    setPlaceFilter("all");
  }

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
      window.location.hash = "#top";
      setNotice(authMode === "register" ? "Account created successfully. Welcome to Evently!" : `Welcome back, ${data.user.name}!`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function registerForEvent(id, quantity = ticketQuantity) {
    if (!user) {
      showToast("Please sign in before booking a ticket.", "error");
      return;
    }
    try {
      const data = await request(`/registrations/events/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("evently_token")}` },
        body: JSON.stringify({ quantity })
      });
      const total = data.pricing?.totalAmount ?? data.registration.totalAmount;
      showToast(`Booking confirmed! ${quantity} ticket${quantity === 1 ? "" : "s"} · Total ${formatMoney(total)}.`, "success");
      setSelectedEvent(null);
      setTicketQuantity(1);
      loadEvents();
      loadRegistrations();
      window.location.hash = "#bookings";
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function openEvent(event) {
    setTicketQuantity(1);
    try {
      const data = await request(`/events/${event._id}`);
      setSelectedEvent(data.event);
    } catch (error) {
      setSelectedEvent(event);
      setNotice(error.message);
    }
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
  const selectedTicketLimit = selectedEvent ? Math.min(10, Math.max(1, Number(selectedEvent.availableSeats) || 1)) : 1;
  const selectedSubtotal = selectedEvent ? (Number(selectedEvent.ticketPrice) || 0) * ticketQuantity : 0;
  const selectedGst = Number((selectedSubtotal * 0.18).toFixed(2));
  const selectedTotal = Number((selectedSubtotal + selectedGst).toFixed(2));

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">✦</span> evently</a>
        <div className="nav-links"><a href="#discover">Discover</a><a href="#organize">Organize</a>{user?.role === "admin" && <a href="#admin-review">Admin review</a>}<a href="#about">About</a></div>
        <div className="nav-actions">
          {user && <a className="outline-button profile-nav" href="#profile">My profile</a>}
          {user?.role === "attendee" && <a className="outline-button bookings-nav" href="#bookings">My bookings</a>}
          {user ? <button className="ghost-button" onClick={() => { localStorage.removeItem("evently_token"); localStorage.removeItem("evently_user"); setUser(null); }}>Log out</button> : <a className="outline-button" href="#auth">Sign in</a>}
          <a className="primary-button" href="#add-event">Add an event <span>↗</span></a>
        </div>
      </nav>

      {toast && <div className={`toast-notification ${toast.type}`} role="status"><span>{toast.type === "success" ? "✓" : "!"}</span><p>{toast.message}</p><button type="button" onClick={() => setToast(null)} aria-label="Close notification">×</button></div>}

      {view === "profile" && user ? <Profile key={user.id || user._id} user={user} request={request} onSaved={(profile) => {
        localStorage.setItem("evently_user", JSON.stringify(profile));
        setUser(profile);
      }} /> : view === "add-event" ? <CreateEvent user={user} request={request} onCreated={() => { setNotice("Event submitted for admin approval."); loadMyEvents(); }} /> : <>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> Curated experiences, made simple</div>
          <h1>Make moments<br /><em>matter.</em></h1>
          <p>Discover meaningful events, meet new people, and create experiences worth remembering.</p>
          <div className="hero-actions"><a className="primary-button" href="#discover">Explore events <span>→</span></a><a className="text-link" href="#add-event">I want to host <span>↗</span></a></div>
          <div className="social-proof"><div className="avatar-stack"><i>RK</i><i>AS</i><i>MP</i><i>+</i></div><span><strong>2,400+</strong> people found their next experience</span></div>
        </div>
        <div className="hero-art"><div className="art-card card-back" /><div className={`art-card card-main${upcomingEvent ? " interactive-card" : ""}`} onClick={() => upcomingEvent && openEvent(upcomingEvent)} onKeyDown={(event) => event.key === "Enter" && upcomingEvent && openEvent(upcomingEvent)} role={upcomingEvent ? "button" : undefined} tabIndex={upcomingEvent ? 0 : undefined}><div className="art-label">{upcomingEvent ? "UPCOMING EVENT" : "NO UPCOMING EVENT"}</div>{upcomingEvent ? <><div className="art-date">{new Date(upcomingEvent.date).getDate()}<span>{new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(upcomingEvent.date)).toUpperCase()}</span></div><div className="art-title">{upcomingEvent.title}</div><div className="art-meta">{upcomingEvent.location} · {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(upcomingEvent.date))}</div><div className="hero-event-hint">Click to view details →</div></> : <><div className="art-date upcoming-empty">—<span>SOON</span></div><div className="art-title">Your next<br />experience.</div><div className="art-meta">New events are on the way</div></>}</div><div className="floating-note">✦ <span>Good things<br />are waiting.</span></div></div>
      </section>

      <section className="discover shell" id="discover">
        <div className="section-heading"><div><div className="eyebrow">Find your people</div><h2>Events worth showing up for.</h2></div><div className="search-wrap"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadEvents()} placeholder="Search events" /></div></div>
        <div className="filter-bar" aria-label="Filter events"><label><span>Type</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All types</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>Date</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="all">Any date</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="next30">Next 30 days</option></select></label><label><span>Place</span><select value={placeFilter} onChange={(event) => setPlaceFilter(event.target.value)}><option value="all">All places</option>{places.map((place) => <option key={place} value={place}>{place}</option>)}</select></label><button className="ghost-button filter-reset" type="button" onClick={resetFilters}>Reset filters</button><span className="filter-count">{visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"}</span></div>
        {notice && <div className="notice">{notice}</div>}
        {loading ? <p className="muted">Loading events…</p> : visibleEvents.length === 0 ? <div className="empty"><span>✦</span><h3>Your next event starts here.</h3><p>No approved events yet. Organizers can submit an event below; it will appear here after admin approval.</p><a className="text-link" href="#add-event">Create an event ↗</a></div> : <div className="event-grid">{visibleEvents.map((event) => <article className="event-card clickable" key={event._id} onClick={() => openEvent(event)}><div className="event-image" style={event.image ? { backgroundImage: `linear-gradient(180deg, #102a4310, #102a43aa), url(${event.image})` } : undefined}><span>{event.category}</span><b>{new Date(event.date).getDate()}</b></div><div className="event-content"><div className="event-date">{formatDate(event.date)}</div><h3>{event.title}</h3><p>{event.location}</p><div className="event-footer"><span>{formatPrice(event.ticketPrice)}</span><button onClick={(clickEvent) => { clickEvent.stopPropagation(); openEvent(event); }}>Choose tickets →</button></div></div></article>)}</div>}
      </section>

      {user?.role === "attendee" && <section className="tickets shell" id="bookings"><div className="section-heading"><div><div className="eyebrow">Your event pass</div><h2>My bookings.</h2></div><span className="muted">{registrations.length} booking{registrations.length === 1 ? "" : "s"}</span></div>{registrations.length === 0 ? <div className="submission-empty">Your confirmed event tickets will appear here after you reserve a spot.</div> : <div className="ticket-grid">{registrations.map((registration) => { const bookedQuantity = registration.quantity || 1; const savedTotal = registration.totalAmount ?? ((Number(registration.event?.ticketPrice) || 0) * bookedQuantity * 1.18); return <article className="ticket-card" key={registration._id}><div className="ticket-accent" /><div className="ticket-main"><span className="status-pill confirmed">{registration.status}</span><h3>{registration.event?.title || "Event"}</h3><p>{registration.event ? `${formatDate(registration.event.date)} · ${registration.event.location}` : "Event details unavailable"}</p><small>{bookedQuantity} ticket{bookedQuantity === 1 ? "" : "s"} · {formatMoney(savedTotal)}</small></div><div className="ticket-code"><span>TICKET NUMBER</span><strong>{registration.ticketNumber}</strong></div></article>; })}</div>}</section>}

      <section className="organize shell" id="organize">
        <div className="organize-intro"><div className="eyebrow">For the ones who bring us together</div><h2>Have an idea?<br /><em>Bring it to life.</em></h2><p>Create an event people will talk about long after it ends.</p></div>
        <div className="organize-card"><span className="big-star">✦</span><h3>{isOrganizer ? <>Ready to host?<br />Create your event.</> : <>Every great event<br />starts with an idea.</>}</h3><p>{isOrganizer ? "Add the details and send your event for admin approval." : "Sign up as an organizer to share yours with the community."}</p><a className="primary-button" href="#add-event">{isOrganizer ? "Open event studio" : "Become an organizer"} ↗</a></div>
      </section>

      {isOrganizer && <section className="my-events shell" id={user.role === "admin" ? "admin-review" : undefined}><div className="section-heading"><div><div className="eyebrow">{user.role === "admin" ? "Control center" : "Your organizer space"}</div><h2>{user.role === "admin" ? "Review events." : "Your submissions."}</h2></div><span className="muted">{myEvents.length} event{myEvents.length === 1 ? "" : "s"}</span></div>{myEvents.length === 0 ? <div className="submission-empty">{user.role === "admin" ? "No event submissions need review." : "Your submitted events will appear here with their approval status."}</div> : <div className="submission-grid">{myEvents.map((event) => <article className="submission-card" key={event._id}><div><span className={`status-pill ${event.status}`}>{event.status}</span><h3>{event.title}</h3><p>{formatDate(event.date)} · {event.location}</p>{user.role === "admin" && <p className="submission-organizer">Organizer: {event.organizer?.name || "Unknown"}</p>}</div>{user.role === "admin" ? <div className="moderation-actions">{event.status === "pending" && <><button className="approve-button" onClick={() => moderateEvent(event._id, "approved")}>Approve</button><button className="reject-button" onClick={() => moderateEvent(event._id, "rejected")}>Reject</button></>}<button className="delete-button" onClick={() => deleteEvent(event._id)}>Delete</button></div> : <span className="submission-arrow">↗</span>}</article>)}</div>}</section>}

      {selectedEvent && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}><section className="event-modal" role="dialog" aria-modal="true" aria-label="Event details" onClick={(clickEvent) => clickEvent.stopPropagation()}><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close event details">×</button>{selectedEvent.image && <div className="modal-image" style={{ backgroundImage: `url(${selectedEvent.image})` }} />}<div className="modal-body"><div className="modal-kicker"><span className="status-pill approved">{selectedEvent.category}</span><span>{formatPrice(selectedEvent.ticketPrice)}</span></div><h2>{selectedEvent.title}</h2><p className="modal-description">{selectedEvent.description}</p><div className="event-detail-grid"><div><span>WHEN</span><strong>{formatDateTime(selectedEvent.date)}</strong></div><div><span>WHERE</span><strong>{selectedEvent.location}</strong></div><div><span>AVAILABILITY</span><strong>{selectedEvent.availableSeats} seats left</strong></div><div><span>ORGANIZED BY</span><strong>{selectedEvent.organizer?.name || "Event organizer"}</strong></div></div><div className="ticket-booking-panel"><div className="ticket-quantity-row"><div><span className="booking-label">Tickets</span><small>Maximum 10 tickets per booking</small></div><div className="quantity-control"><button type="button" onClick={() => setTicketQuantity((quantity) => Math.max(1, quantity - 1))} disabled={ticketQuantity <= 1}>−</button><strong>{ticketQuantity}</strong><button type="button" onClick={() => setTicketQuantity((quantity) => Math.min(selectedTicketLimit, quantity + 1))} disabled={ticketQuantity >= selectedTicketLimit}>+</button></div></div><div className="booking-pricing"><div><span>Ticket price</span><strong>{formatMoney(Number(selectedEvent.ticketPrice) || 0)} × {ticketQuantity}</strong></div><div><span>Subtotal</span><strong>{formatMoney(selectedSubtotal)}</strong></div><div><span>GST (18%)</span><strong>{formatMoney(selectedGst)}</strong></div><div className="booking-total"><span>Total payable</span><strong>{formatMoney(selectedTotal)}</strong></div></div></div><button className="primary-button modal-reserve" disabled={!user || Number(selectedEvent.availableSeats) < 1} onClick={() => registerForEvent(selectedEvent._id, ticketQuantity)}>{user ? `Book ${ticketQuantity} ticket${ticketQuantity === 1 ? "" : "s"}` : "Sign in to book"} <span>→</span></button></div></section></div>}

      {!user && <section className="auth shell" id="auth"><div className="auth-copy"><div className="eyebrow">Your event journey</div><h2>Be part of<br /><em>something good.</em></h2><p>Sign in to reserve your spot, or create an organizer account to bring your own event to life.</p></div><form className="auth-form" onSubmit={handleAuth}><div className="tabs"><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Sign in</button><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Create account</button></div>{authMode === "register" && <input name="name" value={authForm.name} onChange={updateForm(setAuthForm)} placeholder="Full name" required />}<input type="email" name="email" value={authForm.email} onChange={updateForm(setAuthForm)} placeholder="Email address" required /><input type="password" name="password" value={authForm.password} onChange={updateForm(setAuthForm)} placeholder="Password (6+ characters)" required />{authMode === "register" && <select name="role" value={authForm.role} onChange={updateForm(setAuthForm)}><option value="attendee">I want to attend events</option><option value="organizer">I want to organize events</option></select>}<button className="primary-button" type="submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <span>→</span></button></form></section>}

      </>}

      <footer className="footer shell" id="about"><a className="brand" href="#top"><span className="brand-mark">✦</span> evently</a><span>Made for meaningful moments.</span><span>© 2026 Evently</span></footer>
    </main>
  );
}

export default App;
