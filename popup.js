import { GetExtensionSetting, SetExtensionSetting, settings } from './ExtensionApi.js'
import { GetLocalFigmaData, LoadFigmaData } from './FigmaApi.js'

let loadFigmaDoc = document.getElementById("loadFigmaDoc")
let docIdInput = document.getElementById("docId")
let docNameInput = document.getElementById("docName")
let userTokenInput = document.getElementById("userToken")
let statusText = document.getElementById('status')
let chkEnabled = document.getElementById('enabled')

//The popup is reconstructed every time it is shown and destroyed when hidden
// This script is going to run every time the popup is shown!

GetLocalFigmaData().then((figma) => {
	userTokenInput.value = figma?.userToken ?? ''
	statusText.innerText = figma?.loaded ? 'Loaded ' + new Date(figma?.loaded).toLocaleString() : ''
})

GetExtensionSetting(settings.enabled).then((enabled) => {
	console.log(enabled)
	chkEnabled.checked = enabled;
});

chkEnabled.addEventListener('change', (e) => {
	SetExtensionSetting(settings.enabled, e.target?.checked)
})

loadFigmaDoc.addEventListener('click', async (e) => {

	loadFigmaDoc.disabled = true
	statusText.innerText = 'Loading...'

	let figma = await LoadFigmaData({
		docId: docIdInput.value,
		docName: docNameInput.value,
		userToken: userTokenInput.value
	})

	console.log(`got figma doc ${docName}!`, figma)
	userTokenInput.value = figma?.userToken ?? ''
	statusText.innerText = 'Loaded ' + new Date(figma?.loaded).toLocaleString()

	loadFigmaDoc.disabled = false
})