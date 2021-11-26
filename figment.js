let changeColor = document.getElementById("changeColor")
let loadFigmaDoc = document.getElementById("loadFigmaDoc")
let docIdInput = document.getElementById("docId")
let docNameInput = document.getElementById("docName")
let userTokenInput = document.getElementById("userToken")
let statusText = document.getElementById('status')

let figma = {}

//this is going to run every time the popup is shown!
GetLocalDataAsync('figma').then((data) => {
	console.log('GetLocalDataAsync:figma', data)
	figma = data.figma

	userTokenInput.value = figma?.userToken ?? ''
	statusText.innerText = figma?.loaded ? 'Loaded ' + new Date(figma?.loaded).toLocaleString() : ''

	//send the figma data to the service worker (background.js)
	chrome.runtime.sendMessage({figma})
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
	chrome.storage.local.set({ figma })
	chrome.runtime.sendMessage({ figma }) //send the figma data to the service worker (background.js)

	loadFigmaDoc.disabled = false
})

async function GetFigmaData({ docId, docName, userToken }) {

	json = await FetchFigmaJson(`https://api.figma.com/v1/files/${docId}?depth=2`, userToken)

	let figma = {
		docId, docName, userToken, 
		loaded: Date.now(),
		lastModified: json.lastModified,
		version: json.version,
		thumbnailUrl: json.thumbnailUrl,
		frames: []
	}

	for (const child of json.document.children) {
		for (const node of child.children.filter(c => c.type === 'FRAME')) {
			figma.frames.push({
				id: node.id,
				name: node.name,
				link: `https://www.figma.com/file/${docId}/${docName}?node-id=${node.id}`,
				image: `https://api.figma.com/v1/images/${docId}?ids=${node.id}`
			})
		}
	}

	return figma
}

async function FetchFigmaJson(url, userToken) {
	let headers = new Headers();
	headers.append('Accept', 'text/json');
	headers.append('X-FIGMA-TOKEN', userToken)

	const init = {
		method: 'GET',
		headers,
		mode: 'cors',
		cache: 'default'
	};

	let request = new Request(url);
	let response = await fetch(request, init)
	return response.json()
}

async function GetLocalDataAsync(key) {
	return new Promise((resolve) => {
		chrome.storage.local.get([key], (data) => { resolve(data) })
	})
}