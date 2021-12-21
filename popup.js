import { GetFigmaData } from './FigmaApi.js'

let changeColor = document.getElementById("changeColor")
let loadFigmaDoc = document.getElementById("loadFigmaDoc")
let docIdInput = document.getElementById("docId")
let docNameInput = document.getElementById("docName")
let userTokenInput = document.getElementById("userToken")
let statusText = document.getElementById('status')

let figma = {}

//this is going to run every time the popup is shown!
chrome.storage.local.get(["figma"], ({ figma }) => {
	userTokenInput.value = figma?.userToken ?? ''
	statusText.innerText = figma?.loaded ? 'Loaded ' + new Date(figma?.loaded).toLocaleString() : ''
})

loadFigmaDoc.addEventListener('click', async (e) => {

	loadFigmaDoc.disabled = true
	statusText.innerText = 'Loading...'

	figma = await GetFigmaData({
		docId: docIdInput.value,
		docName: docNameInput.value,
		userToken: userTokenInput.value
	})

	console.log(`got figma doc ${docName}!`, figma)
	userTokenInput.value = figma?.userToken ?? ''
	statusText.innerText = 'Loaded ' + new Date(figma?.loaded).toLocaleString()

	//save the figma data in extension local storage
	chrome.storage.local.set({ figma })

	loadFigmaDoc.disabled = false
})