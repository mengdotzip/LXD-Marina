"use strict";

const eventsDiv = document.getElementById('eventsDiv');

export var events = [];
export var eventsIndex = 0;

export function createEvent(name, type, message = 'pending') {
  const event = {
    id: eventsIndex++,
    name: name,
    message: message,
    type: type,
    time: new Date().toLocaleTimeString()
  };
  
  events.unshift(event);
    
  if (events.length > 50) {
    events.pop();
  }
    
  saveEvents();
  renderEvents();
  return event.id;
}

function renderEvents() {
    eventsDiv.innerHTML = events.map(event => `
      <div class="event">
        <div>Instance: ${event.name}</div>
        <div>Task: ${event.type} </div>
        <div>Status: ${event.message} </div>
        <div>Timestamp: ${event.time}</div>
      </div>
    `).join('');
}


export function updateEvent(id, data) {
   const event = events.find(e => e.id === id);
    if (event) {
        event.message = data;
        saveEvents();
        renderEvents();
    }
}

export async function loadEvents() {
 const cachedEvents = localStorage.getItem('events');
  
  if (cachedEvents && cachedEvents !== '') {
    try {
      events = JSON.parse(cachedEvents);
      eventsIndex = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 0;
      renderEvents();
    } catch (e) {
      console.error('Failed to parse cached events:', e);
      events = [];
    }
  }
}

export function saveEvents() {
  if (!Array.isArray(events)) {
    console.error('Events is not an array!', events);
    return;
  }
  
  try {
    const jsonString = JSON.stringify(events);
    localStorage.setItem('events', jsonString);
  } catch (e) {
    console.error('Failed to save events:', e);
  }
}

window.clearEvents = function(){
  localStorage.clear();
  events = [];
  renderEvents();
}