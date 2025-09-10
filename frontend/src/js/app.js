// CampusConnect Main Application
class CampusConnectApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.events = [];
        this.user = null;
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
            const response = await fetch(`${this.apiBaseUrl}/events`);
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
                <div class="card event-card h-100" onclick="window.location.href='event-details.html?id=${event.id}'" style="cursor:pointer;">
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
                                    ? `<button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); app.registerForEvent('${event.id}')">Register</button>`
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
            creatorId: this.user?.id
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
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
        // Placeholder for Azure Maps integration
        console.log('Initializing campus map...');
        // TODO: Implement Azure Maps integration
    }

    async fetchUserStatus() {
        try {
            const res = await fetch(`${this.apiBaseUrl}/getUser`, { credentials: 'include' });
            if (res.ok) {
                const user = await res.json();
                this.user = {
                    id: user.userId,
                    name: user.userDetails,
                    email: '',
                    role: 'authenticated'
                };
                this.updateAuthUI(true);
            } else if (res.status === 401) {
                this.user = null;
                this.updateAuthUI(false);
            }
        } catch (e) {
            this.user = null;
            this.updateAuthUI(false);
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
        } else {
            if (profileMenu) profileMenu.innerHTML = `<i class="bi bi-person-circle me-1"></i>Profile`;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) { logoutBtn.textContent = 'Login'; logoutBtn.onclick = async (e) => { e.preventDefault(); const name = prompt('Enter username'); if (!name) return; const res = await fetch(`${this.apiBaseUrl}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }) }); if (res.ok) { const u = await res.json(); this.user = { id: u.userId, name: u.userDetails }; this.updateAuthUI(true); } }; }
            if (createLink) createLink.classList.add('d-none');
            if (myEventsLink) myEventsLink.classList.add('d-none');
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
        // With SWA auth, redirect to built-in logout
        window.location.href = '/.auth/logout';
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
