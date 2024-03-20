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
import { userToken } from "../figma/.env/figmaToken.js"
import { SendMessageToCurrentTab } from '../Bifrost.js'
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

const childNodeHandlers = new Map<figma.Node['type'], (docId: string, node: any, parent: HTMLElement) => void>()
childNodeHandlers.set('CANVAS', handleCanvasNode)
childNodeHandlers.set('FRAME', handleFrameNode)
childNodeHandlers.set('SECTION', handleSectionNode)

function handleChildNode(docId: string, node: figma.Node, parent: HTMLElement) {
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
	span.innerText = node.name + ' - ' + 'requesting data...'
	div.appendChild(span)

	enqueueImageRequest(docId, userToken, node.id)
		.then(result => handleGotFigmaFrameImage(node, div, result[node.id]))

	parent.appendChild(div)
}

function handleGotFigmaFrameImage(node: figma.FrameNode, parent: HTMLDivElement, imgSrc: string) {
	clearChildren(parent)

	const span = document.createElement('span')
	span.innerText = node.name
	parent.appendChild(span)

	// parent.appendChild(Component.Checkbox("Snap to elements", ev => console.log(node.name, (ev.target as HTMLInputElement)?.checked)))

	const img = document.createElement('img')
	img.src = imgSrc
	img.draggable = true
	img.onclick = () => SendMessageToCurrentTab("overlay_image", img.src)
	img.ondragstart = async (ev: DragEvent) => {
		//tell the target tab that we're starting a drag
		//NOTE: we don't need to send any DataTransfer stuff because we're 
		// dragging an html element and that brings all of it's props with it
		// https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList/add#javascript
		await SendMessageToCurrentTab('start_drag_from_side_panel', 'figment/imgSrc')
	}
	img.ondragend = (ev: DragEvent) => {
		//TODO: change the style of the dragged thing?
		console.log('drag end', ev)
	}

	parent.appendChild(img)
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
