import {
	displayStatus,
	getContentElement,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { GetFigmaDocument, enqueueImageRequest } from './figmaApi.js'
import { SendMessageToCurrentTab } from '../Bifrost.js'
import { childrenHavingClass, clearChildren, TextInput } from '../html.js'

//TODO: promot the user for a figma personal access token (with instructions!!!)
import { userToken } from "../figma/.env/figmaToken.js"
import { figmaFiles as localStorage_figmaFiles } from '../localStorage.js'


//see api docs here for return data structure: https://www.figma.com/developers/api#files
//using a custom namespaced version of the REST API types: https://github.com/figma/rest-api-spec
//
//Every file in Figma consists of a tree of nodes. At the root of every file is a DOCUMENT
//node, and from that node stems any CANVAS nodes. Every canvas node represents a PAGE in
//a Figma file. A canvas node can then have any number of nodes as its children. Each
//subtree stemming from a canvas node will represent a layer (e.g an object) on the canvas.


//const figmaNodeLink = (id: string) => `https://www.figma.com/file/${CurrentDocument.id}/${CurrentDocument.name}?node-id=${id}`


//TODO: prompt the user and save the userToken in local storage

type FigmaHandlerParams = { path: string, params: string[] }
type FigmaHandlerFunction = (params: FigmaHandlerParams) => void | Promise<void>

const figmaUrlPathHandlers = new Map<string, FigmaHandlerFunction>()
figmaUrlPathHandlers.set('file', async ({ params: [docId] }: FigmaHandlerParams) => await renderFigmaDoc(docId)) //handle https://www.figma.com/file....
figmaUrlPathHandlers.set('*', ({ path }) => displayStatus(`[FIGMA] no handler for path: ${path}`))

const childNodeHandlers = new Map<figma.Node['type'], (docId: string, node: any) => HTMLElement>()
childNodeHandlers.set('CANVAS', renderFigmaCanvasNode)
childNodeHandlers.set('FRAME', renderFigmaFrameNode)
childNodeHandlers.set('SECTION', renderFigmaSectionNode)


export const handleFigmaUrl: sidePanelUrlHandler = function (url: URL) {
	const [path, ...params] = splitUrlPath(url)	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const handler = figmaUrlPathHandlers.get(path) ?? figmaUrlPathHandlers.get('*')

	if (handler) handler({ path, params })
}

export const handleLocalhost: sidePanelUrlHandler = async function (url: URL) {
	for (const file of localStorage_figmaFiles()) {
		await renderFigmaDoc(file.docId)
	}
}

async function renderFigmaDoc(docId: string) {
	const contentElement = getContentElement()

	//TODO: actually diff the dom tree and apply granular replacements
	clearChildren(contentElement)

	try {
		displayStatus(`requesting figma data for "${docId}"...`)
		const { cached, request } = GetFigmaDocument({ userToken, docId, depth: 3 })

		const ui = renderFigmaFile(docId, cached.document) //render the cached version
		if (ui) {
			displayStatus('using cached figma data')
			contentElement.appendChild(ui)
		}

		const file = await request //wait for the requested updated version
		const newUi = renderFigmaFile(docId, file) //render the updated version
		if (ui) {
			displayStatus('updated figma data')
			ui.replaceWith(newUi) 
		}
		else contentElement.appendChild(newUi)

	} catch (err) {
		console.error(err)
		displayStatus(err as string)
	}
}

function renderFigmaFile(docId: string, figmaFile: figma.GetFileResponse) {
	const div = document.createElement('div')
	div.classList.add(figmaFile.editorType)
	div.classList.add(figmaFile.role)

	//TODO: replace with full text search of figma.GetFileResponse
	//Render filter box
	div.appendChild(TextInput({
		placeholder: 'filter', onkeyup: (value: string) => {
			const figmaElements = childrenHavingClass(div.children, 'figma')
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
	for (const child of children) div.appendChild(child)

	return div
}

function renderChildNodes(docId: string, node: figma.DocumentNode | figma.CanvasNode | figma.SectionNode) {
	const children: HTMLElement[] = []
	node.children?.forEach(figmaNode => {
		const handler = childNodeHandlers.get(figmaNode.type)
		const child = handler && handler(docId, figmaNode)

		if (child) children.push(child)
	})

	return children
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
	span.innerText = node.name
	div.appendChild(span)

	let img: HTMLImageElement | undefined
	const request = enqueueImageRequest(docId, node.id)
	if (request.cachedResult) {
		img = renderFigmaDragableImage(request.cachedResult)
		div.appendChild(img)
	}
	request.imageRequest.then(result => {
		const newImg = renderFigmaDragableImage(result[node.id])
		if (img) img.replaceWith(newImg)
		else div.appendChild(newImg)
	})

	return div
}

function renderFigmaDragableImage(imgSrc: string) {
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

	return img
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