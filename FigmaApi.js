const figmaApiUrl = `https://api.figma.com/v1`

class FigmaNode {
	constructor({ id, name, docId, docName }) {
		this.id = id;
		this.name = name;
		this.link = `https://www.figma.com/file/${docId}/${docName}?node-id=${id}`
		this.image = `${figmaApiUrl}/images/${docId}?ids=${id}`
	}
}

export async function GetFigmaData({ docId, docName, userToken }) {

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
		figma.frames.push(new FigmaNode({...child, docId, docName}))
		for (const node of child.children.filter(c => c.type === 'FRAME')) {
			figma.frames.push(new FigmaNode({...node, docId, docName}))
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