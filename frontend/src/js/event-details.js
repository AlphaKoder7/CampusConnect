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
    await renderEvent(event);
  } catch (e) {
    hide('#details-loading');
    const err = qs('#details-error');
    err.textContent = 'Failed to load event. Please try again.';
    show('#details-error');
    console.error('Event details error', e);
  }
}

async function renderEvent(event) {
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
  const statusRes = await fetch(`${apiBaseUrl}/events/${event.id}/registration`, { credentials: 'include' });
  if (statusRes.status === 401) {
    registerBtn.textContent = 'Login to Register';
    registerBtn.classList.replace('btn-primary', 'btn-outline-primary');
    registerBtn.onclick = () => { window.location.href = '/.auth/login/google'; };
  } else if (statusRes.ok) {
    const { isRegistered } = await statusRes.json();
    if (isRegistered) {
      renderRegisteredState(event, registerBtn);
    } else {
      renderUnregisteredState(event, registerBtn);
    }
  }

  show('#event-details');
}

function renderUnregisteredState(event, registerBtn) {
  registerBtn.textContent = 'Register for Event';
  registerBtn.disabled = false;
  registerBtn.classList.add('btn-primary');
  registerBtn.classList.remove('btn-outline-secondary');
  registerBtn.onclick = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/events/${event.id}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      if (res.ok) {
        renderRegisteredState(event, registerBtn);
      } else if (res.status === 409) {
        renderRegisteredState(event, registerBtn);
      } else if (res.status === 401) {
        window.location.href = '/.auth/login/google';
      } else {
        alert('Failed to register. Please try again.');
      }
    } catch {
      alert('Failed to register. Please try again.');
    }
  };
}

function renderRegisteredState(event, registerBtn) {
  registerBtn.textContent = 'You are Registered';
  registerBtn.classList.remove('btn-primary');
  registerBtn.classList.add('btn-outline-secondary');
  registerBtn.disabled = true;

  // Add an Un-register button next to it
  let unreg = document.getElementById('unregister-btn');
  if (!unreg) {
    unreg = document.createElement('button');
    unreg.id = 'unregister-btn';
    unreg.className = 'btn btn-outline-danger btn-sm ms-2';
    unreg.textContent = 'Un-register';
    registerBtn.parentElement.appendChild(unreg);
  }
  unreg.onclick = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/events/${event.id}/register`, { method: 'DELETE', credentials: 'include' });
      if (res.status === 204 || res.status === 200) {
        // Reset to unregistered state
        if (unreg.parentElement) unreg.parentElement.removeChild(unreg);
        renderUnregisteredState(event, registerBtn);
      } else if (res.status === 401) {
        window.location.href = '/.auth/login/google';
      } else {
        alert('Failed to un-register. Please try again.');
      }
    } catch {
      alert('Failed to un-register. Please try again.');
    }
  };
}

document.addEventListener('DOMContentLoaded', loadEvent);



