import { dispatchExtensionEvent } from '../Bifrost.js'
import {
	clearChildren,
	displayString,
	getContentElement,
	getCurrentTab,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { GetFigmaDocument, GetFigmaImages } from './figmaApi.js'



//TODO: promot the user for a figma personal access token (with instructions!!!)
//@ts-ignore
import { userToken } from "../../.env/figmaToken.js"
//figmaToken.js
//export const userToken = '<paste personal access token here>'



//see api docs here for return data structure: https://www.figma.com/developers/api#files
//using a custom namespaced version of the REST API types: https://github.com/figma/rest-api-spec
//
//Every file in Figma consists of a tree of nodes. At the root of every file is a DOCUMENT
//node, and from that node stems any CANVAS nodes. Every canvas node represents a PAGE in
//a Figma file. A canvas node can then have any number of nodes as its children. Each
//subtree stemming from a canvas node will represent a layer (e.g an object) on the canvas.


//TODO: prompt the user and save this in local storage

type FigmaHandlerParams = { path: string, params: string[] }
type FigmaHandlerFunction = (params: FigmaHandlerParams) => void | Promise<void>

async function overlayImageOnCurTab(imgSrc: string) {
	const tab = await getCurrentTab()
	if (tab && tab.id) {
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionEvent,
			args: ["overlay_image", imgSrc]
		})
	}
}

const handleUrl: sidePanelUrlHandler = function (url: URL) {

	const handlers = new Map<string, FigmaHandlerFunction>()
	handlers.set('file', handleFile)
	handlers.set('developers', () => displayString(`[FIGMA] welcome to the api docs!`))
	handlers.set('*', ({ path }) => displayString(`[FIGMA] no handler for path: ${path}`))

	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const [path, ...params] = splitUrlPath(url)
	const handler = handlers.get(path) ?? handlers.get('*')

	if (handler) handler({ path, params })
	else throw new Error(`Could not find handler for ${path}`)
}
export default handleUrl

const CurrentDocument = {
	id: '',
	name: '',
}

async function handleFile({ params }: FigmaHandlerParams) {
	const [docId, docName] = params

	CurrentDocument.id = docId;
	CurrentDocument.name = docName;

	const contentElement = getContentElement()
	clearChildren(contentElement)

	try {
		contentElement.innerHTML = `Requesting Figma Data for "${docName}"...`

		const response = await GetFigmaDocument({ userToken, docId, depth: 3 })
		clearChildren(contentElement)

		console.log('got figma file', response)

		response.document.children.forEach(node => handleChildNode(docId, node, contentElement))

	} catch (err) {
		console.error(err)
		contentElement.innerHTML = "Requesting Figma Data..."
	}
}

const childNodeHandlers = new Map<string, (docId: string, node: any, parent: HTMLElement) => void>()
childNodeHandlers.set('CANVAS', handleCanvasNode)
childNodeHandlers.set('FRAME', handleFrameNode)
childNodeHandlers.set('SECTION', handleSectionNode)

function handleChildNode(docId: string, node: any, parent: HTMLElement) {
	const handler = childNodeHandlers.get(node.type)
	if (handler) handler(docId, node, parent)
}

function handleCanvasNode(docId: string, node: figma.CanvasNode, parent: HTMLElement) {
	const div = document.createElement('div')
	div.innerText = node.type + ' - ' + node.name

	node.children?.forEach(child => handleChildNode(docId, child, div))

	parent.appendChild(div)
}

const figmaNodeLink = (id: string) => `https://www.figma.com/file/${CurrentDocument.id}/${CurrentDocument.name}?node-id=${id}`

function handleFrameNode(docId: string, node: figma.FrameNode, parent: HTMLElement) {
	const div = document.createElement('div')
	div.className = node.type

	const span = document.createElement('span')
	span.innerText = node.name
	div.appendChild(span)

	enqueueImageRequest(docId, userToken, node.id).then(result => {
		const checkboxDiv = document.createElement('div')
		const checkbox = document.createElement('input')
		checkbox.type = "checkbox"
		checkbox.id = Date.now().toString()
		const label = document.createElement('label')
		label.htmlFor = checkbox.id
		label.innerText = "Snap to elements"
		checkboxDiv.appendChild(checkbox)
		checkboxDiv.appendChild(label)
		div.appendChild(checkboxDiv)

		const img = document.createElement('img')
		img.src = result[node.id]
		img.onclick = () => overlayImageOnCurTab(img.src)

		div.appendChild(img)
	})

	parent.appendChild(div)
}

function handleSectionNode(docId: string, node: figma.SectionNode, parent: HTMLElement) {
	const div = document.createElement('div')
	div.innerText = node.type + ' - ' + node.name + ' - ' + node.devStatus?.type

	node.children?.forEach(child => handleChildNode(docId, child, div))

	parent.appendChild(div)
}

//figma api is really slow, but we can query for multiple images at once.
const imageRequestIds: string[] = []
let imageRequest: Promise<{ [key: string]: string }> | undefined
function enqueueImageRequest(docId: string, userToken: string, nodeId: string): Promise<{ [key: string]: string }> {
	imageRequestIds.push(nodeId)

	if (!imageRequest) {
		imageRequest = new Promise((resolve, reject) => {
			//wait for all the requests to come in and THEN send the api request
			setTimeout(() => {
				//TODO: cache the results in local storage and don't re-request images until the old ones expire or the source node has a more recent change date
				GetFigmaImages({ docId, userToken, ids: imageRequestIds })
					.then(result => resolve(result))
					.catch(reason => reject(reason))
					.finally(() => { imageRequest = undefined })
			}, 500)
		})
	}

	return imageRequest;
}