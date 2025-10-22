"use strict";
import { createEvent, updateEvent } from "./events.js";

const drawDiv = document.getElementById('drawTabDiv');
const morePopupDiv = document.getElementById('morePopupDiv');
const drawTabHeader = document.getElementById('drawTabHeader');
const tabSnapshots = document.getElementById('tabSnapshots');
const tabDelete = document.getElementById('tabDelete');
const tabGpu = document.getElementById('tabGpu');


// Tab Handling

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

window.openGpu = function(){
    clearStylings()
    const instanceName = morePopupDiv.dataset.name;
    drawTabHeader.innerHTML = "GPU:";
    tabGpu.style.borderLeft = "solid";
    tabGpu.style.borderRight = "solid";
    drawDiv.innerHTML = `
    <a1 class="gpuHead">Attached GPU's</a1>
    <div id="gpuAttached"></div>
    <a1 class="gpuHead">Available GPU's</a1>
    <div id="gpuAvailable"></div>
    `;
    loadGpus(instanceName);
    listGpus(instanceName);
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
    drawDiv.innerHTML = "";
    drawTabHeader.innerHTML = "";
    tabSnapshots.style.border = "none";
    tabSnapshots.style.borderBottom = "solid";
    tabGpu.style.border = "none";
    tabGpu.style.borderBottom = "solid";
    tabDelete.style.border = "none";
    tabDelete.style.borderBottom = "solid";
}

// FUNCTIONS

// snapshots
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

// gpu

// This parse function will have to be updated regularly to keep up with the current market. 
function parseGPUInfo(gpu) {
    const vendor = gpu.vendor.toLowerCase();
    const product = gpu.product.toLowerCase();
    const driver = (gpu.driver || '').toLowerCase();
    
    let gpuType = 'unknown';
    let isIGPU = false;
    let gpuId = '';
    
    // NVIDIA Detection
    if (vendor.includes('nvidia') || driver === 'nvidia') {
        gpuType = 'nvidia';
        // Check if iGPU
        isIGPU = product.includes('tegra') || product.includes('jetson');
        gpuId = isIGPU ? `nvidia.com/igpu=${gpu.index}` : `nvidia.com/gpu=${gpu.index}`;
    }
    // Intel Detection
    else if (vendor.includes('intel') || driver === 'i915' || driver === 'xe') {
        gpuType = 'intel';
        // Intel Arc is discrete, everything else is iGPU
        isIGPU = !(product.includes('arc') || product.includes('alchemist') || product.includes('dg2'));
        gpuId = gpu.render_device ? `/dev/dri/renderD${parseInt(gpu.render_device.split(':')[1])}` : '';
    }
    // AMD Detection
    else if (vendor.includes('amd') || vendor.includes('ati') || driver === 'amdgpu' || driver === 'radeon') {
        gpuType = 'amd';
        // Integrated
        isIGPU = product.includes('radeon') && (
            product.includes('graphics') || 
            product.includes('780m') || 
            product.includes('680m') || 
            product.includes('vega')
        );
        gpuId = gpu.render_device ? `/dev/dri/renderD${parseInt(gpu.render_device.split(':')[1])}` : '';
    }
    
    return {
        type: gpuType,
        isIGPU: isIGPU,
        gpuId: gpuId,
        deviceName: `${gpu.index}_${gpu.product}`.replace(/\s+/g, '_').replace(/\[|\]/g, '').replace(/[^a-zA-Z0-9_\-:.\/]/g, '')
    };
}

async function listGpus(instanceName) {
    const gpuAvailableDiv = document.getElementById('gpuAvailable');
    gpuAvailableDiv.innerHTML = "Loading..." 

    try {
        const response = await fetch(`/api/gpu/host`);
        const data = await response.json();
        
        if (!data.success) {
            gpuAvailableDiv.innerHTML = `Error: ${data.error}`;
            return;
        }

        const gpus = data.data || [];

        if (gpus.length === 0) {
            gpuAvailableDiv.innerHTML = "No gpu's found";
            return;
        }

        const html = gpus.map(gpu => {
        const parsed = parseGPUInfo(gpu);
        return `
        <div class="gpu" >
        <a1 class="gpuData">${gpu.product}</a1>
        <button class="instanceBtn" onclick="window.addGpu('${instanceName}','${parsed.deviceName}','${parsed.gpuId}','${gpu.index}','${gpu.pci_address}')">ATTACH</button>
        <select name="gpus" class="gpuDropdown">
        <option value="gpu">GPU</option>
        <option value="igpu">iGPU</option>
        </select>
        </div>
        `;
        }).join('');

        
        gpuAvailableDiv.innerHTML = html;


    } catch (error) {
        console.error('Failed to load available gpus:', error);
        gpuAvailableDiv.innerHTML = `Error loading available gpus: ${error.message}`;
    }
}

async function loadGpus(instanceName) {
    const gpuAttachedDiv = document.getElementById('gpuAttached');
    gpuAttachedDiv.innerHTML = "Loading..." 

    try {
        const response = await fetch(`/api/gpu?name=${instanceName}`);
        const data = await response.json();
        
        if (!data.success) {
            gpuAttachedDiv.innerHTML = `Error: ${data.error}`;
            return;
        }

        const gpus = data.data || [];

        if (gpus.length === 0) {
            gpuAttachedDiv.innerHTML = "No gpu's attached";
            return;
        }

        const html = gpus.map(gpus => `
        <div class="gpu" >
        <a1 class="gpuData">${gpus.name}</a1>
        <button class="instanceBtn" onclick="window.detachGpu('${instanceName}','${gpus.name}')">DETACH</button>
        </div>
        `).join('');

        gpuAttachedDiv.innerHTML = html;

    } catch (error) {
        console.error('Failed to load attached gpus:', error);
        gpuAttachedDiv.innerHTML = `Error loading attached gpus: ${error.message}`;
    }
}

window.addGpu = async function(instanceName, gpuProduct, gpuType, gpuId, gpuPci) {
    const eventId = createEvent(instanceName, 'gpu', 'Attach GPU...');
    
    try {
        const response = await fetch('/api/gpu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: gpuProduct,
                instance_name: instanceName,
                gpu_type: gpuType,
                gpu_id: gpuId,
                pci_address: gpuPci
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateEvent(eventId, 'GPU added');
            window.openGpu();
        } else {
            updateEvent(eventId, `Failed: ${data.error}`);
        }
    } catch (error) {
        updateEvent(eventId, `Error: ${error.message}`);
    }
}

window.detachGpu = async function(instanceName, gpuName) {
    const eventId = createEvent(instanceName, 'gpu', 'Detach GPU...');

     
    try {
        const response = await fetch('/api/gpu', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: gpuName,
                instance_name: instanceName,
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateEvent(eventId, 'GPU detached');
            window.openGpu();
        } else {
            updateEvent(eventId, `Failed: ${data.error}`);
        }
    } catch (error) {
        updateEvent(eventId, `Error: ${error.message}`);
    }
}