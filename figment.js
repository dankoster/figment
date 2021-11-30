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