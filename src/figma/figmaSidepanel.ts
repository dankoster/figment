import {
	displayStatus,
	getContentElement,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { GetFigmaDocument, enqueueImageRequest } from './figmaApi.js'
import { FigmentMessage, SendMessageToCurrentTab } from '../Bifrost.js'
import { applyDiff, childrenHavingClass, element } from '../html.js'

import { getApiKey, figmaFiles as localStorage_figmaFiles } from './localStorage.js'


//see api docs here for return data structure: https://www.figma.com/developers/api#files
//using a custom namespaced version of the REST API types: https://github.com/figma/rest-api-spec
//
//Every file in Figma consists of a tree of nodes. At the root of every file is a DOCUMENT
//node, and from that node stems any CANVAS nodes. Every canvas node represents a PAGE in
//a Figma file. A canvas node can then have any number of nodes as its children. Each
//subtree stemming from a canvas node will represent a layer (e.g an object) on the canvas.


//const figmaNodeLink = (id: string) => `https://www.figma.com/file/${CurrentDocument.id}/${CurrentDocument.name}?node-id=${id}`


type FigmaHandlerParams = { path: string, params: string[] }
type FigmaHandlerFunction = (params: FigmaHandlerParams) => void | Promise<void>

const figmaUrlPathHandlers = new Map<string, FigmaHandlerFunction>()
figmaUrlPathHandlers.set('file', ({ params: [docId] }: FigmaHandlerParams) => handleFigmaDoc(docId)) //handle https://www.figma.com/file....
figmaUrlPathHandlers.set('*', ({ path }) => displayStatus(`Open a specific figma file to read it`))

const childNodeHandlers = new Map<figma.Node['type'], (docId: string, node: any) => HTMLElement>()
childNodeHandlers.set('CANVAS', renderFigmaCanvasNode)
childNodeHandlers.set('FRAME', renderFigmaFrameNode)
childNodeHandlers.set('SECTION', renderFigmaSectionNode)

const elementById: { [key: string]: HTMLElement[] | undefined } = {}
let file: figma.GetFileResponse | undefined
let filter: string

//tell the service worker the sidepanel has opened
chrome.runtime.sendMessage({
	action: 'sidepanel_open',
	messageId: Date.now() + Math.random()
} as FigmentMessage)

chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
	console.log('figmaSidePanel.onUserScriptMessage', { message, sender })
})
chrome.runtime.onMessage.addListener((message: FigmentMessage, sender, sendResponse) => {
	handleFigmentMessage(message)
})
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
	handleFigmentMessage(request.message)
})

function handleFigmentMessage(message: FigmentMessage) {
	switch (message.action) {
		case 'search_figma_data':
			if (!message.str) throw new Error(`${message.str} is not a valid value`)

			filter = message.str
			const filterInput = document.querySelector('input[placeholder=filter]') as HTMLInputElement
			if (filterInput) {
				filterInput.value = filter
			}
			if (file) {
				filterFigmaData(file, filter)
			}

			//acknowledge reciept of this message
			chrome.runtime.sendMessage({
				action: 'sidepanel_got_message',
				messageId: message.messageId
			} as FigmentMessage)
			break;
	}
}

export const handleFigmaUrl: sidePanelUrlHandler = function (url: URL) {
	const [path, ...params] = splitUrlPath(url)	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const handler = figmaUrlPathHandlers.get(path) ?? figmaUrlPathHandlers.get('*')

	if (handler) handler({ path, params })
}

export const handleLocalhost: sidePanelUrlHandler = async function (url: URL) {
	const userToken = getApiKey()
	if (!userToken) {
		window.location.href = 'figmaApiKeyForm.html'
	}
	else {
		const files = localStorage_figmaFiles()
		if (files?.length) {
			for (const file of files) {
				await handleFigmaDoc(file.docId)
			}
		} else {
			displayStatus('No figma file loaded. Visit figma.com to load a file.')
		}
	}
}

async function handleFigmaDoc(docId: string) {

	const userToken = getApiKey()

	if (!userToken) {
		window.location.href = 'figmaApiKeyForm.html'
	}
	else {
		await renderFigmaDoc(docId, userToken)
	}
}

async function renderFigmaDoc(docId: string, userToken: string) {
	try {
		//get the cached document AND submit a request for an update
		const { cached, request } = GetFigmaDocument({ userToken, docId, depth: 4 })
		const cachedDocTimestamp = cached?.document && new Date(cached.document.lastModified).getTime()

		const contentElement = getContentElement()

		//TODO: handle multiple figma files?
		let figmaFileElement = contentElement?.querySelector(".figma-file")

		//render the cached version
		if (cached?.document) {
			file = cached.document
			const ui = renderFigmaFile(docId, cached.document)
			if (ui) {
				displayStatus('using cached figma data')
				if (figmaFileElement) {
					applyDiff(figmaFileElement, ui)
				}
				else {
					figmaFileElement = ui
					contentElement.appendChild(ui)
				}

				if (filter) filterFigmaData(file, filter)
			}
		}

		//wait for the requested updated version
		file = await request

		const updateTimestamp = new Date(file.lastModified).getTime()
		//console.log(cachedDocTimestamp, updateTimestamp, cachedDocTimestamp === updateTimestamp ? 'same' : 'updated')
		if (cachedDocTimestamp !== updateTimestamp) {
			const newUi = renderFigmaFile(docId, file) //render the updated version
			if (figmaFileElement) {
				applyDiff(figmaFileElement, newUi)
				displayStatus('updated figma data')
			}
			else contentElement.appendChild(newUi)

			if (filter) filterFigmaData(file, filter)
		}

	} catch (err) {
		console.error(err)
		displayStatus(err as string)
	}
}

function renderFigmaFile(docId: string, figmaFile: figma.GetFileResponse) {
	const div = document.createElement('div')
	div.classList.add('figma-file')
	div.classList.add(figmaFile.role) //'owner'

	//@ts-ignore
	div.figmaDocId = docId
	//@ts-ignore
	div.figmaNode = figmaFile

	//ui controls like access token and filter input
	let filterTimeout: number | undefined
	div.appendChild(element('a', { href: 'figmaApiKeyForm.html', text: 'Access Token' }))
	div.appendChild(element('input', {
		type: 'text', placeholder: 'filter', value: filter ?? '',
		onkeyup: (e) => {
			if (filterTimeout) clearTimeout(filterTimeout)
			filterTimeout = setTimeout(() => {
				filter = (e.target as HTMLInputElement)?.value
				filterFigmaData(figmaFile, filter)
			}, 400)
		}
	}))

	//render children
	const children = renderChildNodes(docId, figmaFile.document)
	for (const child of children) div.appendChild(child)

	return div
}

function filterFigmaData(figmaFile: figma.GetFileResponse, searchString: string) {
	const results = findString(figmaFile.document, searchString)
	const resultElements = Array.from(results).flatMap((r: any) => elementById[r.id])

	const figmaElements = childrenHavingClass(document.children, ['figma'])
	for (const element of figmaElements) {
		if (resultElements.includes(element))
			element.classList.remove('filtered')

		else
			element.classList.add('filtered')
	}
}

function findString(node: any, searchString: string) {
	const result = new Set()
	const search = searchString.toLowerCase()

	if (node?.name?.toLowerCase && node.name.toLowerCase().includes(search)) {
		result.add(node)
	}

	if (node?.children) {
		for (const child of node.children) {
			if ((child?.characters?.toLowerCase && child.characters.toLowerCase().includes(search))
				|| child?.name?.toLowerCase && child?.name?.toLowerCase().includes(search)) {
				result.add(child)
			}

			findString(child, searchString).forEach(childResult => result.add(childResult))
		}
	}

	return result
}

function renderChildNodes(docId: string, node: figma.DocumentNode | figma.CanvasNode | figma.SectionNode) {
	const children: HTMLElement[] = []
	node.children?.forEach(figmaNode => {
		const handler = childNodeHandlers.get(figmaNode.type)
		const child = handler && handler(docId, figmaNode)

		if (child) {
			//@ts-ignore
			child.figmaDocId = docId
			//@ts-ignore
			child.figmaNode = figmaNode

			const mapChildren = (figmaNode: any) => {
				if (!Array.isArray(elementById[figmaNode.id])) {
					elementById[figmaNode.id] = []
				}

				elementById[figmaNode.id]?.push(child)

				if (figmaNode?.children && typeof figmaNode?.children[Symbol.iterator] === 'function')
					for (const child of figmaNode.children) {
						mapChildren(child)
					}
			}

			mapChildren(figmaNode)

			children.push(child)
		}
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
	const userToken = getApiKey()
	if (!userToken) throw new Error('no user token')

	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type);

	const span = document.createElement('span')
	span.innerText = node.name
	div.appendChild(span)

	let img: HTMLImageElement | undefined
	const request = enqueueImageRequest(userToken, docId, node.id)
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