const figmaApiUrl = `https://api.figma.com/v1`

export class FigmaSearch {
	static FindByExactNameOrId({figma, name, id}) { return figma?.frames?.find(frame => frame.name === name || frame.id === decodeURIComponent(id)) }
	static FindByRegex({figma, regex}) { return figma?.frames?.filter(frame => regex.test(frame.name.toLowerCase()))}
	static SplitByCaps(searchTerm) { return new RegExp(searchTerm.split(/(?=[A-Z])/).map(str => str.toLowerCase()).join('|')) }
}

export class FigmaNode {
	constructor({ id, name, docId, docName }) {
		this.id = id;
		this.docId = docId
		this.name = name;
		this.link = `https://www.figma.com/file/${docId}/${docName}?node-id=${id}`
	}

	async getImage(userToken) {
		if(!this._imageUrl) {
			let url = `${figmaApiUrl}/images/${this.docId}?ids=${this.id}`
			let json = await FetchFigmaJson(url, userToken)
			
			if(json.err) throw json.err 

			let id = decodeURIComponent(this.id)
			this._imageUrl = json.images[id]

			//TODO: update this in local storage! (timeout in 30 days)
			// https://www.figma.com/developers/api#get-images-endpoint
			UpdateLocalStorageFigmaNode(this)
		}
		return this._imageUrl
	} 
}

async function UpdateLocalStorageFigmaNode(node) {
	GetLocalFigmaData().then(data => {

		debugger
		
		if (Array.isArray(data.nodes)) {
			const index = data.nodes.indexOf(n => n.id === node.id)
			if (index >= 0) {
				data.nodes[index] = node
				SetLocalFigmaData(data)
			}
			else console.warn(`${node.id} not found in`, data.nodes)
		}
		else console.warn(`${data.nodes} is not an array`)
	})
}

export async function GetLocalFigmaData() {
	return chrome.storage.local.get(["figma"]).then((data) => {
		data.figma.nodes = data.figma.frames.map(f => new FigmaNode(f))
		return data.figma
	})
}

async function SetLocalFigmaData(figma) {
	//save the figma data in extension local storage
	chrome.storage.local.set({ figma })
}

export async function LoadFigmaData({ docId, docName, userToken }) {

	let json = await FetchFigmaJson(`${figmaApiUrl}/files/${docId}?depth=2`, userToken)

	let figma = {
		docId, docName, userToken,
		loaded: Date.now(),
		lastModified: json.lastModified,
		version: json.version,
		thumbnailUrl: json.thumbnailUrl,
		frames: []
	}

	for (const child of json.document.children) {
		figma.frames.push(new FigmaNode({...child, docId, docName }))
		for (const node of child.children.filter(c => c.type === 'FRAME')) {
			figma.frames.push(new FigmaNode({...node, docId, docName }))
		}
	}

	SetLocalFigmaData(figma)

	return figma
}

export async function GetFigmentImages({ docId, userToken, ids }) {

	if(!Array.isArray(ids)) throw `${ids} is not an array`
	if(!ids.length) throw `${ids} can not be empty`

	let idCsv = ids.map(id => encodeURIComponent(id)).join(',')
	let url = `${figmaApiUrl}/images/${docId}?ids=${idCsv}`
	let json = await FetchFigmaJson(url, userToken)

	//json
	// {
	// 	"err": null,
	// 	"images": {
	// 	  "1142:89093": "https://s3-us-west-2.amazonaws.com/figma-alpha-api/img/449f/65b7/42e321c65c299b36a5b1e973763c4bef",
	// 	  "1382:106541": "https://s3-us-west-2.amazonaws.com/figma-alpha-api/img/a491/8f09/ffb0d33e7aa56fc4448a0e29cc45de9d"
	// 	}
	// }
	
	if(json.err) throw json.err 

	return json.images
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