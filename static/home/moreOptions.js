"use strict";
import { createEvent, updateEvent } from "./events.js";

const drawDiv = document.getElementById('drawTabDiv');
const morePopupDiv = document.getElementById('morePopupDiv');
const drawTabHeader = document.getElementById('drawTabHeader');
const tabSnapshots = document.getElementById('tabSnapshots');
const tabDelete = document.getElementById('tabDelete');


window.openSnapshots = function() {
    clearStylings()
    const instanceName = morePopupDiv.dataset.name;
    drawTabHeader.innerHTML = "Snapshots:";
    tabSnapshots.style.border = "solid";
    drawDiv.innerHTML = `
    <div class="snapshotCreate">
        <button onclick="window.createSnapshot('${instanceName}')">CREATE SNAPSHOT</button>
        <input type="text" id="snapshotName" placeholder="Snap Name">
        <input id="snapshotStateful" type="checkbox">STATEFUL</input>
    </div>
    <div id="snapshotDrawDiv"></div>
    `;
    loadSnapshots(instanceName);
}

window.openDelete = function(){
    clearStylings()
    const instanceName = morePopupDiv.dataset.name;
    drawTabHeader.innerHTML = "Delete:";
    tabDelete.style.borderLeft = "solid";
    tabDelete.style.borderRight = "solid";
    drawDiv.innerHTML = `
    <button class="tabDeleteBtn" onclick="window.showConfirmDialog('${instanceName}')">DELETE</button>
    `
} 

export function clearStylings() {
    drawDiv.innerHTML = ""
    tabSnapshots.style.border = "none";
    tabSnapshots.style.borderBottom = "solid";
    tabDelete.style.border = "none";
    tabDelete.style.borderBottom = "solid";
}

async function loadSnapshots(instanceName){
    const snapshotDrawDiv = document.getElementById('snapshotDrawDiv');
    snapshotDrawDiv.innerHTML = "Loading..." 

    try {
        const response = await fetch(`/api/snapshots?name=${instanceName}`);
        const data = await response.json();
        
        if (!data.success) {
            snapshotDrawDiv.innerHTML = `Error: ${data.error}`;
            return;
        }

        const snapshots = data.data || [];

        if (snapshots.length === 0) {
            snapshotDrawDiv.innerHTML = "No snapshots found, try 'REFRESH' or 'CREATE'";
            return;
        }

        const html = snapshots.map(snapshots => `
        <div class="snapshot" >
        <strong>${snapshots.name}</strong> - <a1 class="snapInfo">${parseDate(snapshots.created_at)}</a1> <a1 class="snapInfo">${snapshots.stateful ? "STATEFUL" : ""}</a1>
        <button class="instanceBtn" onclick="window.deleteSnapshot('${instanceName}','${snapshots.name}')">DELETE</button>
        <button class="instanceBtn" onclick="window.restoreSnapshot('${instanceName}','${snapshots.name}',${snapshots.stateful})">REVERT</button>
        </div>
        `).join('');

        snapshotDrawDiv.innerHTML = html;

    } catch (error) {
        console.error('Failed to load snapshots:', error);
        snapshotDrawDiv.innerHTML = `Error loading snapshots: ${error.message}`;
    }
}

window.createSnapshot = async function(instanceName){
    const stateful = document.getElementById('snapshotStateful').checked;
    const name = document.getElementById('snapshotName').value;
    
    const eventId = createEvent(instanceName, 'Snapshot', 'Creating snapshot...');
    
    try {
        const response = await fetch('/api/snapshots/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: instanceName,
                snapshot_name: name,
                stateful: stateful
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateEvent(eventId, 'Snapshot created');
            loadSnapshots(instanceName);
        } else {
            updateEvent(eventId, `Failed: ${data.error}`);
        }
    } catch (error) {
        updateEvent(eventId, `Error: ${error.message}`);
    }
}

function parseDate(isoDate) {
    const dateUnix = Date.parse(isoDate);
    var date = new Date(dateUnix);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const seconds = date.getSeconds();
    const minutes = date.getUTCMinutes();
    const hours = date.getHours();

    return `Created at: ${`${day}`.padStart(2, "0")}/${`${month}`.padStart(2, "0")}/${year} ${`${hours}`.padStart(2, "0")}:${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`
}

window.restoreSnapshot = async function(instanceName, snapshotName, stateful) {
    const eventId = createEvent(instanceName, 'Snapshot', 'Restoring snapshot...');
    
    try {
        const response = await fetch('/api/snapshots/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: instanceName,
                snapshot_name: snapshotName,
                stateful: stateful
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateEvent(eventId, 'Snapshot restored');
            loadSnapshots(instanceName);
        } else {
            updateEvent(eventId, `Failed: ${data.error}`);
        }
    } catch (error) {
        updateEvent(eventId, `Error: ${error.message}`);
    }
}

window.deleteSnapshot = async function(instanceName, snapshotName) {
    const eventId = createEvent(instanceName, 'Snapshot', 'Deleting snapshot...');
    
    try {
        const response = await fetch('/api/snapshots', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: instanceName,
                snapshot_name: snapshotName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateEvent(eventId, 'Snapshot deleted');
            loadSnapshots(instanceName);
        } else {
            updateEvent(eventId, `Failed: ${data.error}`);
        }
    } catch (error) {
        updateEvent(eventId, `Error: ${error.message}`);
    }
}