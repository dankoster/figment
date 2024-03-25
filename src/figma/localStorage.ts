
type LocalFigmaFileInfo = {
	docId: string
	type: "figma.GetFileResponse"
	document?: figma.GetFileResponse
	images?: { [key: string]: string }
}

export function getApiKey() {
	return localStorage.getItem('pat')
}

export function setApiKey(value: string) {
	localStorage.setItem('pat', value)
}

export function getDocument(docId: string): LocalFigmaFileInfo | undefined {
	try {
		return JSON.parse(localStorage.getItem(docId) ?? '')
	} catch (err) {
		if (err instanceof SyntaxError && err.message.endsWith('is not valid JSON'))
			return undefined
		else
			throw err
	}
}

export function setDocument(docId: string, doc: figma.GetFileResponse) {
	const localDoc = getDocument(docId) ?? {} as LocalFigmaFileInfo
	localDoc.docId = docId
	localDoc.type = "figma.GetFileResponse"
	localDoc.document = doc
	localStorage.setItem(docId, JSON.stringify(localDoc))
}

export function getImage(docId: string, nodeId: string) {
	const doc = getDocument(docId) ?? {} as LocalFigmaFileInfo
	return doc.images && doc.images[nodeId]
}

export function setImage({ docId, nodeId, url }: { docId: string; nodeId: string; url: string }) {
	const localDoc = getDocument(docId) ?? {} as LocalFigmaFileInfo
	if (!localDoc.images) localDoc.images = {}
	localDoc.images[nodeId] = url
	localStorage.setItem(docId, JSON.stringify(localDoc))
}

export function* figmaFiles(): Generator<LocalFigmaFileInfo> {
	const keys = Object.keys(localStorage)
	for (var key in keys) {
		const docId = keys[key]
		const doc = getDocument(docId) ?? {} as LocalFigmaFileInfo
		if (doc.type === "figma.GetFileResponse" && doc.document) {
			yield doc
		}
	}
}