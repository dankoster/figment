
type LocalFigmaFileInfo = {
	docId: string
	type: "figma.GetFileResponse"
	document: figma.GetFileResponse
	images: {[key:string]: string}
}

export function getDocument(docId: string): LocalFigmaFileInfo {
	return JSON.parse(localStorage.getItem(docId) ?? '{}')
}

export function setDocument(docId: string, doc: figma.GetFileResponse) {
	const localDoc = getDocument(docId)
	localDoc.docId = docId
	localDoc.type = "figma.GetFileResponse"
	localDoc.document = doc
	localStorage.setItem(docId, JSON.stringify(localDoc))
}

export function getImage(docId: string, nodeId: string) {
	const doc = getDocument(docId)
	return doc.images && doc.images[nodeId]
}

export function setImage({docId, nodeId, url}: {docId:string; nodeId:string; url:string}) {
	const localDoc = getDocument(docId)
	if(!localDoc.images) localDoc.images = {}
	localDoc.images[nodeId] = url
	localStorage.setItem(docId, JSON.stringify(localDoc))
}

export function* figmaFiles(): Generator<LocalFigmaFileInfo> {
	const keys = Object.keys(localStorage)
	for (var key in keys) {
		const docId = keys[key]
		const doc = getDocument(docId)
		if (doc.type === "figma.GetFileResponse" && doc.document) {
			yield doc
		}
	}
}