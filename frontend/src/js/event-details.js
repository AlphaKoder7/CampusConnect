const apiBaseUrl = 'http://localhost:7071/api';

function qs(selector) { return document.querySelector(selector); }
function show(id) { qs(id).classList.remove('d-none'); }
function hide(id) { qs(id).classList.add('d-none'); }

function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString(); } catch { return dateStr; }
}

async function loadEvent() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    hide('#details-loading');
    const err = qs('#details-error');
    err.textContent = 'Missing event id in URL.';
    show('#details-error');
    return;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/events/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch event: ${res.status}`);
    }
    const event = await res.json();
    renderEvent(event);
  } catch (e) {
    hide('#details-loading');
    const err = qs('#details-error');
    err.textContent = 'Failed to load event. Please try again.';
    show('#details-error');
    console.error('Event details error', e);
  }
}

function renderEvent(event) {
  hide('#details-loading');

  qs('#event-title').textContent = event.title;
  qs('#event-description').textContent = event.description;
  qs('#event-meta').textContent = `${formatDate(event.date)} • ${event.time} • ${event.location}`;

  const facts = qs('#event-facts');
  facts.innerHTML = `
    <li class="mb-2"><i class="bi bi-person-badge me-2 text-muted"></i><strong>Organizer:</strong> ${event.creatorName}</li>
    <li class="mb-2"><i class="bi bi-tag me-2 text-muted"></i><strong>Type:</strong> ${event.type}</li>
    <li class="mb-2"><i class="bi bi-people me-2 text-muted"></i><strong>Attendees:</strong> ${event.attendees?.length || 0}</li>
    ${event.isPrivate ? '<li class="mb-2"><span class="badge bg-secondary">Private</span></li>' : ''}
  `;

  const registerBtn = qs('#register-btn');
  registerBtn.onclick = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user', userEmail: 'demo@campus.edu', userName: 'Demo User' })
      });
      if (res.ok) {
        registerBtn.textContent = 'Registered';
        registerBtn.disabled = true;
      } else if (res.status === 409) {
        registerBtn.textContent = 'Already Registered';
        registerBtn.classList.replace('btn-primary', 'btn-outline-secondary');
        registerBtn.disabled = true;
      } else {
        alert('Failed to register. Please try again.');
      }
    } catch (e) {
      alert('Failed to register. Please try again.');
    }
  };

  show('#event-details');
}

document.addEventListener('DOMContentLoaded', loadEvent);



