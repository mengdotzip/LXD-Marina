"use strict";

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
}

window.openDelete = function(){
    clearStylings()
    const instanceName = morePopupDiv.dataset.name;
    drawTabHeader.innerHTML = "Delete:";
    tabDelete.style.border = "solid";
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