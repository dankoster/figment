// Initialize button with user's preferred color
let changeColor = document.getElementById("changeColor")
let loadFigmaDoc = document.getElementById("loadFigmaDoc")
let docIdInput = document.getElementById("docId")
let docNameInput = document.getElementById("docName")
let userTokenInput = document.getElementById("userToken")

//TODO: store user token
let userToken = userTokenInput.value 

loadFigmaDoc.addEventListener('click', async (e) => {
	let docId = docIdInput.value
	let docName = docNameInput.value

	json = await fetchFigmaJson(`https://api.figma.com/v1/files/${docId}?depth=2`)

	let figmaFrames = {}
	for(const child of json.document.children) {
		for(const node of child.children.filter(c => c.type === 'FRAME')) {
			figmaFrames[node.id] = {
				name: node.name,
				link: `https://www.figma.com/file/${docId}/${docName}?node-id=${node.id}`,
				image: `https://api.figma.com/v1/images/${docId}?ids=${node.id}`
			}
		}
	}

	//TODO: store and display figma doc last updated date

	localStorage.setItem('figmaFrames', JSON.stringify(figmaFrames))

	console.log(figmaFrames)
})

async function fetchJsonFromApi(api, docId, nodeIds) {
    return fetchFigmaJson(`https://api.figma.com/v1/${api}/${docId}?ids=${nodeIds}`)
}

async function fetchFigmaJson(url) {
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