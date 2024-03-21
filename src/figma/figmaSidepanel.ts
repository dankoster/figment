import {
	clearChildren,
	displayString,
	getContentElement,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { GetFigmaDocument, GetFigmaImages } from './figmaApi.js'
import { SendMessageToCurrentTab } from '../Bifrost.js'

//TODO: promot the user for a figma personal access token (with instructions!!!)
import { userToken } from "../figma/.env/figmaToken.js"


//see api docs here for return data structure: https://www.figma.com/developers/api#files
//using a custom namespaced version of the REST API types: https://github.com/figma/rest-api-spec
//
//Every file in Figma consists of a tree of nodes. At the root of every file is a DOCUMENT
//node, and from that node stems any CANVAS nodes. Every canvas node represents a PAGE in
//a Figma file. A canvas node can then have any number of nodes as its children. Each
//subtree stemming from a canvas node will represent a layer (e.g an object) on the canvas.


//const figmaNodeLink = (id: string) => `https://www.figma.com/file/${CurrentDocument.id}/${CurrentDocument.name}?node-id=${id}`


//TODO: prompt the user and save this in local storage

type FigmaHandlerParams = { path: string, params: string[] }
type FigmaHandlerFunction = (params: FigmaHandlerParams) => void | Promise<void>

const figmaUrlHandlers = new Map<string, FigmaHandlerFunction>()
figmaUrlHandlers.set('file', renderFigmaFileUI) //handle https://www.figma.com/file....
figmaUrlHandlers.set('*', ({ path }) => displayString(`[FIGMA] no handler for path: ${path}`))

const childNodeHandlers = new Map<figma.Node['type'], (node: any) => HTMLElement>()
childNodeHandlers.set('CANVAS', renderCanvasNode)
childNodeHandlers.set('FRAME', renderFrameNode)
childNodeHandlers.set('SECTION', renderSectionNode)


const handleUrl: sidePanelUrlHandler = function (url: URL) {
	const [path, ...params] = splitUrlPath(url)	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const handler = figmaUrlHandlers.get(path) ?? figmaUrlHandlers.get('*')

	if (handler) handler({ path, params })
	//else throw new Error(`Could not find handler for ${path}`)
}
export default handleUrl

function renderChildNodes(node: figma.DocumentNode | figma.CanvasNode | figma.SectionNode) {
	const children: HTMLElement[] = []
	node.children?.forEach(figmaNode => {
		const handler = childNodeHandlers.get(figmaNode.type)
		const child = handler && handler(figmaNode)
	
		//if (child) div.appendChild(child)
		if(child) children.push(child)
	})

	return children
}


const CurrentDocument = {
	id: '',
}

async function renderFigmaFileUI({ params }: FigmaHandlerParams) {
	const [docId, docName] = params

	CurrentDocument.id = docId;

	const contentElement = getContentElement()
	clearChildren(contentElement)

	try {
		contentElement.innerHTML = `Requesting Figma Data for "${docName}"...`

		//TODO: save figma data locally and only request stuff that has been updated
		const response = await GetFigmaDocument({ userToken, docId, depth: 3 })
		clearChildren(contentElement)

		console.log('got figma file', response)

		function childrenHavingClass(elements: HTMLCollection, className: string) {
			const result: HTMLElement[] = []
			for(const element of elements) {
				if(element.classList.contains(className)) result.push(element as HTMLElement)
				result.push(... childrenHavingClass(element.children, className))
			}
			return result
		}

		//Render filter box
		const div = document.createElement('div')
		const input = document.createElement('input')
		input.type = 'text'
		input.placeholder = 'filter'
		input.onkeyup = (ev) => {
			const test = childrenHavingClass(contentElement.children, 'figma')
			for (const element of test) {
				if (element.textContent?.includes(input.value))
					element.classList.remove('filtered')
				else
					element.classList.add('filtered')
			}
		}
		div.appendChild(input)
		contentElement.appendChild(div)

		//render children
		const children = renderChildNodes(response.document)
		for(const child of children) div.appendChild(child)

	} catch (err) {
		console.error(err)
		contentElement.innerHTML = "Requesting Figma Data..."
	}
}

function renderCanvasNode(node: figma.CanvasNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.innerText = node.type + ' - ' + node.name

	const children = renderChildNodes(node)
	for(const child of children) div.appendChild(child)

	return div
}

function renderFrameNode(node: figma.FrameNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)

	const span = document.createElement('span')
	span.innerText = node.name + ' - ' + 'requesting data...'
	div.appendChild(span)

	enqueueImageRequest(node.id)
		.then(result => handleGotFigmaFrameImage(node, div, result[node.id]))

	return div
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

function renderSectionNode(node: figma.SectionNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.innerText = node.type + ' - ' + node.name + ' - ' + node.devStatus?.type

	const children = renderChildNodes(node)
	for(const child of children) div.appendChild(child)

	return div
}

//figma api is really slow, but we can query for multiple images at once.
const imageRequestIds: string[] = []
let imageRequest: Promise<{ [key: string]: string }> | undefined
function enqueueImageRequest(nodeId: string): Promise<{ [key: string]: string }> {
	imageRequestIds.push(nodeId)

	if (!imageRequest) {
		imageRequest = new Promise((resolve, reject) => {
			//wait for all the requests to come in and THEN send the api request
			setTimeout(() => {
				//TODO: cache the results in local storage and don't re-request images until the old ones expire or the source node has a more recent change date
				GetFigmaImages({ docId: CurrentDocument.id, userToken, ids: imageRequestIds })
					.then(result => resolve(result))
					.catch(reason => reject(reason))
					.finally(() => { imageRequest = undefined })
			}, 500)
		})
	}

	return imageRequest;
}
