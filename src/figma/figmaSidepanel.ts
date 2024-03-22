import {
	displayString,
	getContentElement,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { GetFigmaDocument, enqueueImageRequest } from './figmaApi.js'
import { SendMessageToCurrentTab } from '../Bifrost.js'
import { childrenHavingClass, clearChildren, TextInput } from '../html.js'

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
figmaUrlHandlers.set('file', handleFigmaFileUrl) //handle https://www.figma.com/file....
figmaUrlHandlers.set('*', ({ path }) => displayString(`[FIGMA] no handler for path: ${path}`))

const childNodeHandlers = new Map<figma.Node['type'], (docId: string, node: any) => HTMLElement>()
childNodeHandlers.set('CANVAS', renderFigmaCanvasNode)
childNodeHandlers.set('FRAME', renderFigmaFrameNode)
childNodeHandlers.set('SECTION', renderFigmaSectionNode)


const handleUrl: sidePanelUrlHandler = function (url: URL) {
	const [path, ...params] = splitUrlPath(url)	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const handler = figmaUrlHandlers.get(path) ?? figmaUrlHandlers.get('*')

	if (handler) handler({ path, params })
}
export default handleUrl

function renderChildNodes(docId: string, node: figma.DocumentNode | figma.CanvasNode | figma.SectionNode) {
	const children: HTMLElement[] = []
	node.children?.forEach(figmaNode => {
		const handler = childNodeHandlers.get(figmaNode.type)
		const child = handler && handler(docId, figmaNode)

		if (child) children.push(child)
	})

	return children
}

export async function handleFigmaFileUrl({ params }: FigmaHandlerParams) {
	const [docId, docName] = params

	const contentElement = getContentElement()
	clearChildren(contentElement)
	contentElement.innerHTML = `Requesting Figma Data for "${docName}"...`

	try {
		const response = GetFigmaDocument({ userToken, docId, depth: 3 })

		if(response.cached.document) {
			renderFigmaFileUI(docId, response.cached.document)
		}

		const file = await response.request
		renderFigmaFileUI(docId, file)

	} catch (err) {
		console.error(err)
		contentElement.innerText = err as string
	}
}

export function renderFigmaFileUI(docId: string, figmaFile: figma.GetFileResponse) {
	if(!figmaFile) throw new Error(`figma file cannot be ${figmaFile}`)

	const contentElement = getContentElement()
	clearChildren(contentElement)

	//Render filter box
	contentElement.appendChild(TextInput({
		placeholder: 'filter', onkeyup: (value: string) => {
			const figmaElements = childrenHavingClass(contentElement.children, 'figma')
			for (const element of figmaElements) {
				if (element.textContent?.includes(value))
					element.classList.remove('filtered')

				else
					element.classList.add('filtered')
			}
		}
	}))

	//render children
	const children = renderChildNodes(docId, figmaFile.document)
	for (const child of children) contentElement.appendChild(child)
}

function renderFigmaCanvasNode(docId: string, node: figma.CanvasNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.innerText = node.type + ' - ' + node.name

	const children = renderChildNodes(docId, node)
	for (const child of children) div.appendChild(child)

	return div
}

function renderFigmaFrameNode(docId: string, node: figma.FrameNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)

	const span = document.createElement('span')
	span.innerText = node.name + ' - ' + 'requesting data...'
	div.appendChild(span)

	const request = enqueueImageRequest(docId, node.id)
	if (request.cachedResult) {
		handleGotFigmaFrameImage(node, div, request.cachedResult)
	}
	request.imageRequest.then(result => {
		handleGotFigmaFrameImage(node, div, result[node.id])
	})

	return div
}

function handleGotFigmaFrameImage(node: figma.FrameNode, parent: HTMLDivElement, imgSrc: string) {
	clearChildren(parent)

	const span = document.createElement('span')
	span.innerText = node.name
	parent.appendChild(span)

	const img = document.createElement('img')
	img.src = imgSrc
	img.onclick = () => SendMessageToCurrentTab("overlay_image", img.src)
	img.ondragstart = async (ev: DragEvent) => {
		//tell the target tab that we're starting a drag
		//NOTE: we don't need to send any DataTransfer stuff because we're 
		// dragging an html element and that brings all of it's props with it
		// https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList/add#javascript
		await SendMessageToCurrentTab('start_drag_from_side_panel', 'figment/imgSrc')
	}
	// img.ondragend = (ev: DragEvent) => {
	// 	//TODO: change the style of the dragged thing?
	// 	console.log('drag end', ev)
	// }
	parent.appendChild(img)
}

function renderFigmaSectionNode(docId: string, node: figma.SectionNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.innerText = node.type + ' - ' + node.name + ' - ' + node.devStatus?.type

	const children = renderChildNodes(docId, node)
	for (const child of children) div.appendChild(child)

	return div
}

