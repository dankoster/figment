
type LocalFigmaFileInfo = {
	docId: string
	type: "figma.GetFileResponse"
	updated: number //Date.now()
	document?: figma.GetFileResponse
	images?: { [key: string]: string }
}

export function getApiKey() {
	return localStorage.getItem('pat') ?? undefined
}

export function setApiKey(value: string) {
	localStorage.setItem('pat', value)
}

//keep a cache of documents to avoid re-running JSON.parse
const docCache = new Map<string, LocalFigmaFileInfo>()

export function getDocument(docId: string): LocalFigmaFileInfo | undefined {
	try {
		if (docCache.has(docId)) {
			return docCache.get(docId)
		} else {
			const localItem = localStorage.getItem(docId)
			if (!localItem) {
				return undefined
			}
			const doc = JSON.parse(localItem)
			docCache.set(docId, doc)
			return doc
		}
	} catch (err) {
		if (err instanceof SyntaxError && err.message.endsWith('is not valid JSON'))
			return undefined
		else
			throw err
	}
}


export function removeDocument(file: LocalFigmaFileInfo) {
	docCache.delete(file.docId)
	localStorage.removeItem(file.docId)
}


export function setDocument(docId: string, doc: figma.GetFileResponse) {
	const localDoc = getDocument(docId) ?? {} as LocalFigmaFileInfo
	localDoc.docId = docId
	localDoc.updated = Date.now()
	localDoc.type = "figma.GetFileResponse"
	localDoc.document = doc
	localStorage.setItem(docId, JSON.stringify(localDoc))
	docCache.set(docId, localDoc)
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

export function figmaFiles(): LocalFigmaFileInfo[] {
	const keys = Object.keys(localStorage)
	const result = []
	for (var key in keys) {
		const docId = keys[key]
		if(docId === 'pat') continue //ignore the personal access token
		const doc = getDocument(docId) ?? {} as LocalFigmaFileInfo
		if (doc.type === "figma.GetFileResponse" && doc.document) {
			result.push(doc)
		}
	}
	return result
}