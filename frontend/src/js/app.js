// CampusConnect Main Application
class CampusConnectApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.events = [];
        this.user = null;
        this.map = null;
        this.markersLayer = null;
        this.leafletLoaded = false;
        this.geocodeCache = new Map();
        // Local-first API base (Express server)
        this.apiBaseUrl = (location.hostname === 'localhost' && location.port === '5173') ? 'http://localhost:3000/api' : '/api';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.fetchUserStatus().finally(() => {
            this.loadEvents();
            this.initializePage();
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Create event form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEvent(e);
            });
        }

        // Cancel event button
        const cancelEventBtn = document.getElementById('cancel-event');
        if (cancelEventBtn) {
            cancelEventBtn.addEventListener('click', () => {
                this.navigateToPage('dashboard');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Change password form
        const changeForm = document.getElementById('change-password-form');
        if (changeForm) {
            changeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cpEl = document.getElementById('current-password');
                const npEl = document.getElementById('new-password');
                const currentPassword = cpEl && 'value' in cpEl ? cpEl.value : '';
                const newPassword = npEl && 'value' in npEl ? npEl.value : '';
                if (!currentPassword || !newPassword) { this.showError('Enter both passwords'); return; }
                const res = await fetch(`${this.apiBaseUrl}/user/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                if (res.ok) {
                    this.showSuccess('Password changed');
                    if (cpEl && 'value' in cpEl) cpEl.value = '';
                    if (npEl && 'value' in npEl) npEl.value = '';
                } else {
                    const err = await res.json().catch(()=>({error:'Failed'}));
                    this.showError(err.error || 'Failed to change password');
                }
            });
        }

        // Quick mock login controls in navbar dropdown
        const quickLoginBtn = document.getElementById('quick-login-btn');
        if (quickLoginBtn) {
            quickLoginBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const nameEl = document.getElementById('quick-login-name');
                const roleEl = document.getElementById('quick-login-role');
                const name = nameEl?.value?.trim();
                const role = roleEl?.value || 'student';
                if (!name) { this.showError('Enter a username'); return; }
                const res = await fetch(`${this.apiBaseUrl}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ username: name, role }) });
                if (res.ok) {
                    const u = await res.json();
                    this.user = { id: u.userId, name: u.userDetails, role: u.role };
                    this.updateAuthUI(true);
                    this.loadEvents();
                } else {
                    this.showError('Login failed');
                }
            });
        }
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(pageEl => {
            pageEl.classList.add('d-none');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('d-none');
            this.currentPage = page;
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const activeLink = document.querySelector(`[data-page="${page}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Load page-specific content
            this.loadPageContent(page);
        }
    }

    loadPageContent(page) {
        switch (page) {
            case 'dashboard':
                this.loadEvents();
                break;
            case 'map':
                this.initializeMap();
                break;
            case 'create-event':
                this.resetCreateEventForm();
                this.updateOfficialControl();
                break;
            case 'profile':
                this.loadUserProfile();
                break;
            case 'my-events':
                this.loadUserEvents();
                break;
        }
    }

    async loadEvents() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/events`, { credentials: 'include' });
            if (response.ok) {
                this.events = await response.json();
                this.renderEvents();
            } else {
                // Backend not ready or error: show empty state instead of error during early dev
                this.events = [];
                this.renderEvents();
            }
        } catch (error) {
            console.error('Error loading events:', error);
            // Network/backend unavailable during early dev: show empty state
            this.events = [];
            this.renderEvents();
        }
    }

    renderEvents() {
        const container = document.getElementById('events-container');
        if (!container) return;

        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                        <h3 class="mt-3 text-muted">No events found</h3>
                        <p class="text-muted">Be the first to create an event!</p>
                        <button class="btn btn-primary" onclick="app.navigateToPage('create-event')">
                            Create Event
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.events.map(event => this.createEventCard(event)).join('');
    }

    createEventCard(event) {
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate > new Date();
        const isOfficial = event.isOfficial;
        
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card event-card h-100" onclick="window.location.href='event-details.html?id=${event._id || event.id}'" style="cursor:pointer;">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 text-truncate">${this.escapeHtml(event.title)}</h6>
                        <div>
                            ${isOfficial ? '<span class="badge bg-warning">Official</span>' : ''}
                            ${event.isPrivate ? '<span class="badge bg-secondary">Private</span>' : ''}
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <p class="card-text text-truncate-3">${this.escapeHtml(event.description)}</p>
                        
                        <div class="mt-auto">
                            <div class="row text-muted small mb-2">
                                <div class="col-6">
                                    <i class="bi bi-calendar-event me-1"></i>
                                    ${eventDate.toLocaleDateString()}
                                </div>
                                <div class="col-6">
                                    <i class="bi bi-clock me-1"></i>
                                    ${event.time}
                                </div>
                            </div>
                            
                            <div class="mb-2">
                                <i class="bi bi-geo-alt me-1 text-muted"></i>
                                <small class="text-muted">${this.escapeHtml(event.location)}</small>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-${this.getEventTypeColor(event.type)}">${event.type}</span>
                                ${isUpcoming
                                    ? `<button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); app.registerForEvent('${event._id || event.id}')">Register</button>`
                                    : '<span class="text-muted small">Event ended</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEventTypeColor(type) {
        const colors = {
            'academic': 'primary',
            'social': 'success',
            'sports': 'warning',
            'cultural': 'info',
            'other': 'secondary'
        };
        return colors[type] || 'secondary';
    }

    async handleCreateEvent(e) {
        const formData = new FormData(e.target);
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            location: document.getElementById('event-location').value,
            type: document.getElementById('event-type').value,
            isPrivate: document.getElementById('event-private').checked,
            capacity: document.getElementById('event-capacity').value || null,
            isOfficial: document.getElementById('event-official')?.checked === true
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                this.showSuccess('Event created successfully!');
                this.navigateToPage('dashboard');
                this.loadEvents();
            } else {
                // Try to surface server error details
                let details = '';
                try {
                    // Try JSON body first
                    const data = await response.clone().json();
                    details = data?.details || data?.error || '';
                } catch {
                    try {
                        // Fallback to text
                        const text = await response.text();
                        details = text || '';
                    } catch {}
                }
                console.error('Create event failed', { status: response.status, details });
                this.showError(`Failed to create event${details ? `: ${details}` : ''}`);
            }
        } catch (error) {
            console.error('Error creating event:', error);
            this.showError('Failed to create event. Please try again.');
        }
    }

    async registerForEvent(eventId) {
        if (!this.user) {
            this.showError('Please log in to register for events');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/events/${eventId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: this.user.id, userName: this.user.name })
            });

            if (response.ok) {
                this.showSuccess('Successfully registered for event!');
                this.loadEvents();
            } else {
                if (response.status === 409) {
                    this.showError('You are already registered for this event');
                } else if (response.status === 404) {
                    this.showError('Event not found');
                } else if (response.status === 400) {
                    let details = '';
                    try { details = (await response.clone().json())?.error || ''; } catch {}
                    this.showError(`Invalid request${details ? `: ${details}` : ''}`);
                } else {
                    this.showError('Failed to register for event');
                }
            }
        } catch (error) {
            console.error('Error registering for event:', error);
            this.showError('Failed to register for event. Please try again.');
        }
    }

    initializeMap() {
        // Initialize Leaflet map with OSM tiles and add event markers
        this.initLeafletAndMap();
    }

    async initLeafletAndMap() {
        await this.ensureLeafletLoaded();

        const mapContainer = document.getElementById('campus-map');
        if (!mapContainer) return;

        // Create map once
        if (!this.map) {
            this.map = L.map('campus-map').setView([20.0, 0.0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
            this.markersLayer = L.layerGroup().addTo(this.map);
        } else {
            this.map.invalidateSize();
            this.markersLayer.clearLayers();
        }

        // Load events and place markers
        try {
            const res = await fetch(`${this.apiBaseUrl}/events`, { credentials: 'include' });
            if (!res.ok) return;
            const events = await res.json();

            const markerPromises = events.map(async (ev) => {
                const id = ev._id || ev.id;
                const title = ev.title;
                const location = ev.location;

                let coords = null;
                if (ev.coordinates && Array.isArray(ev.coordinates) && ev.coordinates.length === 2) {
                    coords = { lat: ev.coordinates[0], lon: ev.coordinates[1] };
                } else if (typeof location === 'string' && location.trim().length > 0) {
                    coords = await this.geocodeLocation(location);
                }

                if (coords) {
                    const marker = L.marker([coords.lat, coords.lon]);
                    marker.bindPopup(`
                        <div>
                            <strong>${this.escapeHtml(title)}</strong><br/>
                            <a href="event-details.html?id=${id}">View details</a>
                        </div>
                    `);
                    marker.addTo(this.markersLayer);
                    return [coords.lat, coords.lon];
                }
                return null;
            });

            const placed = (await Promise.all(markerPromises)).filter(Boolean);
            if (placed.length > 0) {
                const bounds = L.latLngBounds(placed.map(([lat, lon]) => [lat, lon]));
                this.map.fitBounds(bounds.pad(0.2));
            } else {
                this.map.setView([20.0, 0.0], 2);
            }
        } catch (e) {
            console.error('Failed to load events for map:', e);
        }
    }

    async ensureLeafletLoaded() {
        if (this.leafletLoaded) return;
        await Promise.all([
            new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.onload = resolve;
                document.head.appendChild(link);
            }),
            new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = resolve;
                document.body.appendChild(script);
            })
        ]);
        this.leafletLoaded = true;
    }

    async geocodeLocation(query) {
        if (this.geocodeCache.has(query)) return this.geocodeCache.get(query);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) return null;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                this.geocodeCache.set(query, coords);
                return coords;
            }
        } catch (e) {
            console.warn('Geocoding failed for', query, e);
        }
        return null;
    }

    async fetchUserStatus() {
        const isLoginPage = /\/login\.html$/i.test(location.pathname);
        try {
            const res = await fetch(`${this.apiBaseUrl}/getUser`, { credentials: 'include' });
            if (res.ok) {
                const user = await res.json();
                this.user = {
                    id: user.userId,
                    name: user.userDetails,
                    email: user.email || '',
                    role: user.role || 'student'
                };
                this.updateAuthUI(true);
            } else if (res.status === 401) {
                if (!isLoginPage) {
                    window.location.href = '/login.html';
                }
            }
        } catch (e) {
            if (!isLoginPage) {
                window.location.href = '/login.html';
            }
        }
    }

    updateAuthUI(isAuthenticated) {
        const profileMenu = document.querySelector('.navbar .dropdown-toggle');
        const createLink = document.querySelector('[data-page="create-event"]')?.closest('li');
        const myEventsLink = document.querySelector('[data-page="my-events"]')?.closest('li');
        if (isAuthenticated && this.user) {
            if (profileMenu) profileMenu.innerHTML = `<i class="bi bi-person-circle me-1"></i>${this.escapeHtml(this.user.name)}`;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) { logoutBtn.textContent = 'Logout'; logoutBtn.onclick = async (e) => { e.preventDefault(); this.user = null; this.updateAuthUI(false); }; }
            if (createLink) createLink.classList.remove('d-none');
            if (myEventsLink) myEventsLink.classList.remove('d-none');
            this.updateOfficialControl();
        } else {
            if (profileMenu) profileMenu.innerHTML = `<i class="bi bi-person-circle me-1"></i>Profile`;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) { logoutBtn.textContent = 'Login'; logoutBtn.onclick = async (e) => { e.preventDefault(); const name = prompt('Enter username'); if (!name) return; const role = (prompt('Enter role: student/faculty') || 'student').toLowerCase(); const res = await fetch(`${this.apiBaseUrl}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, role }) }); if (res.ok) { const u = await res.json(); this.user = { id: u.userId, name: u.userDetails, role: u.role }; this.updateAuthUI(true); } }; }
            if (createLink) createLink.classList.add('d-none');
            if (myEventsLink) myEventsLink.classList.add('d-none');
            this.updateOfficialControl();
        }
    }

    updateOfficialControl() {
        const wrap = document.getElementById('official-wrap');
        const checkbox = document.getElementById('event-official');
        if (!wrap || !checkbox) return;
        const isFaculty = !!this.user && (this.user.role === 'faculty');
        if (isFaculty) {
            wrap.classList.remove('d-none');
            checkbox.removeAttribute('disabled');
        } else {
            wrap.classList.add('d-none');
            checkbox.setAttribute('disabled', 'true');
            checkbox.checked = false;
        }
    }

    loadUserEvents() {
        // Placeholder for user's created events
        console.log('Loading user events...');
    }

    resetCreateEventForm() {
        const form = document.getElementById('create-event-form');
        if (form) {
            form.reset();
        }
    }

    handleLogout() {
        fetch(`${this.apiBaseUrl}/logout`, { method: 'POST', credentials: 'include' })
            .finally(() => {
                this.user = null;
                window.location.href = '/login.html';
            });
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertContainer);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initializePage() {
        // Initialize the dashboard page by default
        this.navigateToPage('dashboard');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CampusConnectApp();
});
