import {
	displayStatus,
	sidePanelUrlHandler,
	splitUrlPath
} from '../sidepanel.js'
import { SidePanelTab } from "../SidePanelTab.js"
import { GetUpdatedFigmaDocument, enqueueImageRequest } from './figmaApi.js'
import { Message, SendMessageToCurrentTab } from '../Bifrost.js'
import { applyStylesheetToDocument, applyDiff, childrenHavingClass, element, age } from '../html.js'

import * as figmaLocalStorage from './localStorage.js'
import { setApiKey } from './localStorage.js'


chrome.runtime.onUserScriptMessage.addListener((message, sender) => {
	console.log('figmaSidePanel.onUserScriptMessage', { message, sender })
})

//from inside the extension
chrome.runtime.onMessage.addListener((request, sender) => {
	const message = Message.from(request)
	// console.log('onMessage', request, message)
	handleFigmentMessage(message)
})

//from the page
chrome.runtime.onMessageExternal.addListener((request, sender) => {
	const message = Message.from(request.message)
	// console.log('onMessageExternal', request, message)
	handleFigmentMessage(message)
})

function handleFigmentMessage(message: Message) {
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
			Message.send({
				source: 'figma_sidepanel',
				target: 'service_worker',
				action: 'sidepanel_got_message',
				responseToMessageId: message.messageId
			})

			break;
	}
}

//see api docs here for return data structure: https://www.figma.com/developers/api#files
//using a custom namespaced version of the REST API types: https://github.com/figma/rest-api-spec
//
//Every file in Figma consists of a tree of nodes. At the root of every file is a DOCUMENT
//node, and from that node stems any CANVAS nodes. Every canvas node represents a PAGE in
//a Figma file. A canvas node can then have any number of nodes as its children. Each
//subtree stemming from a canvas node will represent a layer (e.g an object) on the canvas.


const figmaNodeLink = (docId: string, docName: string, nodeId: string) => `https://www.figma.com/file/${docId}/${docName}?node-id=${nodeId}`
const figmaFileLink = (docId: string) => `https://www.figma.com/file/${docId}`

type FigmaHandlerParams = { path: string, params: string[] }
type FigmaHandlerFunction = (params: FigmaHandlerParams) => void | Promise<void>

const figmaUrlPathHandlers = new Map<string, FigmaHandlerFunction>()
figmaUrlPathHandlers.set('file', ({ params: [docId] }: FigmaHandlerParams) => handleFigmaFileURL(docId)) //handle https://www.figma.com/file....
figmaUrlPathHandlers.set('design', ({ params: [docId] }: FigmaHandlerParams) => handleFigmaFileURL(docId)) //handle https://www.figma.com/file....
figmaUrlPathHandlers.set('*', ({ path }) => displayStatus(`Open a specific figma file to read it`, 'figma'))

const childNodeHandlers = new Map<figma.Node['type'], (docId: string, docName: string, node: any) => HTMLElement>()
childNodeHandlers.set('CANVAS', renderFigmaCanvasNode)
childNodeHandlers.set('FRAME', renderFigmaFrameNode)
childNodeHandlers.set('SECTION', renderFigmaSectionNode)

const elementById: { [key: string]: HTMLElement[] | undefined } = {}
let file: figma.GetFileResponse | undefined
let filter: string

const figmaTabTitle = (text: string) => element('div', { className: 'title figma-tab-title' }, [
	element('img', { src: 'figmaLogo.svg', className: 'figma-logo' }),
	element('span', { innerText: text })
])

//Inject figma css, if necessary
applyStylesheetToDocument('figmaSidePanel.css')

let figmaDocsListRefreshTimer: number | undefined = undefined

const figmaDataTab = new SidePanelTab(figmaTabTitle('Localhost'), renderFigmaDataUi())
const figmaListTab = new SidePanelTab(figmaTabTitle('Docs'), renderFigmaDocsList())
const figmaConfigTab = new SidePanelTab(figmaTabTitle('Config'), renderFigmaConfigUi())

export const handleFigmaUrl: sidePanelUrlHandler = function (url: URL) {
	const [path, ...params] = splitUrlPath(url)	//file d8BAC23FK8bcpIGmkgwjYk Figma-basics
	const handler = figmaUrlPathHandlers.get(path) ?? figmaUrlPathHandlers.get('*')

	if (handler) handler({ path, params })
}

async function handleFigmaFileURL(docId: string) {

	const userToken = figmaLocalStorage.getApiKey()
	if (!userToken) {
		displayStatus('no user token found!', 'figma')
		return figmaConfigTab.setActive()
	}

	displayStatus(`FETCHING ${docId}`, 'figma')
	const doc = await GetUpdatedFigmaDocument({ docId, userToken })

	displayStatus(`GOT ${docId} last modified ${doc.lastModified}`, 'figma')

	figmaListTab.setTabBody(renderFigmaDocsList())
	figmaListTab.setActive()
}

/**
 * Focused tab URL has changed (or the page refreshed)
 * @param url the url loaded in the focused tab
 * @returns void
 */
export const handleLocalhost: sidePanelUrlHandler = function (url: URL) {
	const userToken = figmaLocalStorage.getApiKey()
	if (!userToken) {
		displayStatus('no user token found!', 'figma')
		return figmaConfigTab.setActive()
	}

	const figmaDataUi = renderFigmaDataUi()
	if (!figmaDataUi) throw new Error(`figmaDataUi cannot be ${figmaDataUi}`)
	figmaDataTab.setTabBody(figmaDataUi)
	figmaDataTab.setActive()
}

function renderFigmaDocsList() {
	const userToken = figmaLocalStorage.getApiKey()
	if (!userToken) {
		return renderFigmaConfigUi()
	}

	const renderList = () => {
		const list = element('div', { className: 'figma-files' })
		list.appendChild(element('span', { innerText: 'Visit a document at figma.com to add it here' }))

		const files = figmaLocalStorage.figmaFiles()
		for (const file of files) {
			if (!file.document) throw new Error('cannot render a missing document')

			//render the cached file
			const fileDiv = element('div', { className: 'figma-file', id: `file_${file.docId}` })
			fileDiv.appendChild(element('div', { className: 'doc-info' }, [
				element('h3', { innerText: file.document?.name ?? '[UNNAMED DOCUMENT]' }),
				renderFigmaFileLink(file.docId),
				element('span', { innerText: `fetched ${age(file.updated, 'ago')}` }),
				element('span', { innerText: `modified ${file.document?.lastModified ? age(file.document?.lastModified, 'ago') : '[UNKNOWN]'}` }),
				element('button', { innerText: 'remove' }, [], {
					'click': () => {
						figmaLocalStorage.removeDocument(file)
						fileDiv.remove()
					}
				}),
			]))
			fileDiv.appendChild(element('img', { src: file.document?.thumbnailUrl }))

			list.appendChild(fileDiv)
		}
		return list
	}

	//update every second, if visible
	if (figmaDocsListRefreshTimer) clearInterval(figmaDocsListRefreshTimer)
	figmaDocsListRefreshTimer = setInterval(() => {
		const original = document.querySelector(`div.figma-files`)
		if (original) {
			applyDiff(original, renderList())
		}
	}, 1000)

	return renderList()
}

function renderFigmaDataUi() {
	const userToken = figmaLocalStorage.getApiKey()
	if (!userToken) {
		return renderFigmaConfigUi()
	}

	//Render figma UI for localhost, Header then list of figma files
	const newFigmaUI = element('div', { id: 'figmaUi' })

	const files = figmaLocalStorage.figmaFiles()
	if (!files?.length) {
		const errorMessage = 'No figma file loaded. Visit figma.com to load a file.'
		displayStatus(errorMessage, 'figma')
		newFigmaUI.appendChild(element('span', { innerText: errorMessage }))
		return newFigmaUI
	}

	const header = document.createElement('header')
	newFigmaUI.appendChild(header)

	//filter input
	let filterTimeout: number | undefined
	header.appendChild(element('input', {
		type: 'text', placeholder: 'filter', value: filter ?? '',
		onkeyup: (e) => {
			if (filterTimeout) clearTimeout(filterTimeout)
			filterTimeout = setTimeout(() => {
				filter = (e.target as HTMLInputElement)?.value
				for (const file of files) {
					if (file.document)
						filterFigmaData(file.document, filter)
				}
			}, 400)
		}
	}))

	for (const file of files) {
		if (!file.document) throw new Error('cannot render a missing document')

		//render the cached data
		//console.log('render cached file', file.docId)
		const fileDiv = renderFigmaFile(file.docId, file.document)
		newFigmaUI.appendChild(fileDiv)

		const handleUpdatedDoc = (updatedDoc: figma.GetFileResponse) => {
			displayStatus(`GOT ${file.docId} Last modified: ${updatedDoc.lastModified}`, 'figma')
			const newFileDiv = renderFigmaFile(file.docId, updatedDoc)
			//console.log('render updated file', file.docId)
			applyDiff(fileDiv, newFileDiv)
		}

		//get updated data and render that next (also updates the cache)
		displayStatus(`FETCHING ${file.docId}`, 'figma')
		GetUpdatedFigmaDocument({ docId: file.docId, userToken })
			.then(handleUpdatedDoc)
	}

	return newFigmaUI
}

function renderFigmaConfigUi() {
	return element('div', { className: 'figma-config' }, [
		element('h2', { innerText: 'API Key' }),
		element('ul', {}, [
			element('li', { innerText: 'Open Figma.com and login' }),
			element('li', { innerText: 'Open your "Account Settings" from the menu on the top left' }),
			element('li', { innerText: 'Scroll down to "Personal access tokens"' }),
			element('li', { innerText: 'Follow the instructions to create a new token (it just needs read only access to File content)' }),
			element('li', { innerText: 'Paste the generated token here' }),
		]),
		element('input', { id: 'key', type: 'text', placeholder: 'figma api key', value: figmaLocalStorage.getApiKey() },
			[], { 'change': (e) => {
				setApiKey((e.target as HTMLInputElement)?.value)
				displayStatus('saved api key!', 'figma')
			} }
		)
	])
}

function renderFigmaFile(docId: string, figmaFile: figma.GetFileResponse) {
	const div = document.createElement('div')
	div.id = docId
	div.classList.add('figma-file')
	div.classList.add(figmaFile.role) //'owner'

	div.appendChild(element('h1', { textContent: figmaFile.name }))
	div.appendChild(renderFigmaFileLink(docId))

	//@ts-ignore
	div.figmaDocId = docId
	//@ts-ignore
	div.figmaNode = figmaFile

	//render children
	const children = renderChildNodes(docId, figmaFile.document?.name, figmaFile.document)
	for (const child of children) div.appendChild(child)

	return div
}

function renderFigmaFileLink(docId: string): HTMLAnchorElement {
	return element('a', { textContent: docId, href: figmaFileLink(docId), target: '_figma' })
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

function renderChildNodes(docId: string, docName: string, node: figma.DocumentNode | figma.CanvasNode | figma.SectionNode) {
	const children: HTMLElement[] = []
	node?.children?.forEach(figmaNode => {
		const handler = childNodeHandlers.get(figmaNode.type)
		const child = handler && handler(docId, docName, figmaNode)

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

function renderFigmaCanvasNode(docId: string, docName: string, node: figma.CanvasNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.appendChild(element('h2', { innerText: node.type + ' - ' + node.name }))

	const children = renderChildNodes(docId, docName, node)
	for (const child of children) div.appendChild(child)

	return div
}

function renderFigmaFrameNode(docId: string, docName: string, node: figma.FrameNode) {
	const userToken = figmaLocalStorage.getApiKey()
	if (!userToken) throw new Error('no user token')

	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type);
	const nodeLink = element('a', { href: figmaNodeLink(docId, docName, node.id), target: '_figma' })
	nodeLink.appendChild(element('h4', { innerText: node.name, className: 'name' }))
	div.appendChild(nodeLink)

	let img: HTMLImageElement | undefined
	const request = enqueueImageRequest(userToken, docId, node.id)
	if (request.cachedResult) {
		img = renderFigmaDragableImage(request.cachedResult)
		div.appendChild(img)
	}
	request.imageRequest?.then(result => {
		const newImgSrc = result[node.id]
		if (!newImgSrc) {
			console.warn(`request for img src returned invalid value: "${newImgSrc}" for node: "${node.id}"`)
		} else {
			const newImg = renderFigmaDragableImage(newImgSrc)
			if (img) img.replaceWith(newImg)
			else div.appendChild(newImg)
		}
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

function renderFigmaSectionNode(docId: string, docName: string, node: figma.SectionNode) {
	const div = document.createElement('div')
	div.classList.add('figma')
	div.classList.add(node.type)
	div.appendChild(element('h3', { innerText: node.type }))
	div.appendChild(element('h4', { innerText: node.name }))
	div.appendChild(element('span', { innerText: node.devStatus?.type }))

	const children = renderChildNodes(docId, docName, node)
	for (const child of children) div.appendChild(child)

	return div
}