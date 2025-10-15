"use strict";
import { loadInstances, deleteInstance, createInstance } from "./instances.js";
import { saveEvents, loadEvents } from "./events.js";

const refreshBtn = document.getElementById('refreshBtn');
const createBtn = document.getElementById('createBtn');
const createPopup = document.getElementById('createPopupDiv');
const confirmPopup = document.getElementById('confirmPopupDiv');
const confirmBtn = document.getElementById('confirmBtn');
const confirmText = document.getElementById('confirmText');


//---POP UPS---

//Confirm
window.showConfirmDialog = function(instanceName) {
  confirmPopup.style.visibility= "visible";
  confirmBtn.dataset.name = instanceName;
  confirmText.innerHTML = `Are you sure you want to DELETE the instance ${instanceName}`
}

function hideConfirmDialog() {
  delete confirmBtn.dataset.name;
  confirmPopup.style.visibility= "hidden";
  confirmText.innerHTML = `Are you sure you want to DELETE the instance`
}

confirmPopup.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('confirmBtns')) {
    return;
  }

  const action = e.target.dataset.action;
  const instanceName = e.target.dataset.name;
  
  if (action === 'delete') {
    deleteInstance(instanceName)
    hideConfirmDialog();
  } else if (action === 'cancel') {
    hideConfirmDialog();
  }
});

//CREATE
function showCreateDialog() {
  createPopup.style.visibility= "visible";
}

function hideCreateDialog() {
  createPopup.style.visibility= "hidden";
}

createPopup.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('createBtns')) {
    return;
  }

  const action = e.target.dataset.action;
  
  if (action === 'create') {
    const name = document.getElementById('name').value;
    const server = document.getElementById('server').value;
    const alias = document.getElementById('alias').value;

    const typeRadio = document.querySelector('input[name="radio"]:checked');
    const type = typeRadio ? typeRadio.value : 'container';

    createInstance(name, server,alias, type);
    hideCreateDialog();
  } else if (action === 'exit') {
    hideCreateDialog();
  }
});

//-----------

async function onLoaded() {
  await loadInstances();
  loadEvents();
}

refreshBtn.addEventListener('click', loadInstances);
createBtn.addEventListener('click', showCreateDialog);

document.addEventListener('DOMContentLoaded', onLoaded);
document.addEventListener("beforeunload", saveEvents)