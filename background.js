
let figmaFrames = []
let lastModified, version, thumbnailUrl

// chrome.runtime.onInstalled.addListener(() => {
// 	//let figmaFrames = JSON.parse(localStorage.figmaFrames || '[]')
// 	//console.log('initialized from storage', figmaFrames);

// 	//TODO: why is chrome.storage.local broken?
// });

//listen for messages from popup.js
chrome.runtime.onMessage.addListener(
	async function (request, sender, sendResponse) {
		await loadFigma(request)
		sendResponse(figmaFrames)
	}
);

//listen for component name requests from the web page
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		//find the figma info for the requested component name
		let result = figmaFrames.find(frame => frame.name === request.name || frame.id === decodeURIComponent(request.id))
		console.log(request, result)

		if (!result) {
			//split the requested name 'MyProfile' into a lowercase regex string like 'my|profile'
			let regex = new RegExp(request.name.split(/(?=[A-Z])/).map(str => str.toLowerCase()).join('|'))
			//use the regex to see if any frame name has any word from the requested name 
			// (so, 'MyProfile' matches 'Profile / Desktop @1680')
			result = figmaFrames.filter(frame => regex.test(frame.name.toLowerCase()))
		}
	
		sendResponse({ lastModified, version, thumbnailUrl, result })
	}
)

async function getCurrentTab() {
	let queryOptions = { active: true, currentWindow: true };
	let [tab] = await chrome.tabs.query(queryOptions);
	return tab;
}

async function loadFigma({ docId, docName, userToken }) {

	if(!userToken) userToken = '277914-26d2f44b-cdd4-4ecb-b08a-4bd54ff90346'

	json = await fetchFigmaJson(`https://api.figma.com/v1/files/${docId}?depth=2`, userToken)

	lastModified = json.lastModified
	version = json.version 
	thumbnailUrl = json.thumbnailUrl

	for (const child of json.document.children) {
		for (const node of child.children.filter(c => c.type === 'FRAME')) {
			figmaFrames.push({
				id: node.id,
				name: node.name,
				link: `https://www.figma.com/file/${docId}/${docName}?node-id=${node.id}`,
				image: `https://api.figma.com/v1/images/${docId}?ids=${node.id}`
			})
		}
	}

	//localStorage.setItem('figmaFrames', JSON.stringify(figmaFrames))
	await chrome.storage.local.set({ figmaFrames: JSON.stringify(figmaFrames) })

	console.log(`loaded figma doc ${docName}!`, figmaFrames)
}

async function fetchJsonFromApi(api, docId, nodeIds, userToken) {
	return fetchFigmaJson(`https://api.figma.com/v1/${api}/${docId}?ids=${nodeIds}`, userToken)
}

async function fetchFigmaJson(url, userToken) {
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