import handleFigmaUrl, { renderFigmaFileUI } from "./figma/figmaSidepanel.js";
import { clearChildren } from "./html.js";
import { figmaFiles } from "./localStorage.js";


const handlers = new Map<string, sidePanelUrlHandler>()
handlers.set('localhost', handleLocalhost)
handlers.set('www.figma.com', handleFigmaUrl)

async function handleTabUpdated(tab: chrome.tabs.Tab) {
	if (!tab.url) return

	const url = new URL(tab.url)
	clearChildren(getContentElement('URL'))
	clearChildren(getContentElement('json'))
	const handler = handlers.get(url.hostname)

	if (handler) handler(url)
}

function handleLocalhost(url: URL) {
	displayPathInfo(url)

	for(const file of figmaFiles()) {
		renderFigmaFileUI(file.docId, file.document)
	}
}

export function displayString(json: string) {
	const content = document.getElementById('json')
	if (!content) throw new Error('could not find element with id "json"')
	content.innerHTML = json
}

export function getContentElement(id: string = "content") {
	const content = document.getElementById(id)
	if (!content) throw new Error(`could not find element with id "${id}"`)
	return content
}

export type sidePanelUrlHandler = (url: URL) => void

export const splitUrlPath = (url: URL): string[] => url.pathname.split('/')?.filter(s => s)

export function displayPathInfo(url: URL) {
	const info = splitUrlPath(url)
	info.unshift(url.hostname)

	const urlElement = document.querySelector('#URL');
	if (!urlElement) throw new Error('could not find element with id "json"')
	urlElement.innerHTML = info?.join(' ');
}

export async function getCurrentTab() {
	let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
	return tab;
}


//handle side panel load
window.onload = async function () {
	const tab = await getCurrentTab()
	handleTabUpdated(tab)
}

//handle switching to a specific tab
chrome.tabs.onActivated.addListener(async (activeInfo: chrome.tabs.TabActiveInfo) => {
	const tab = await getCurrentTab()
	handleTabUpdated(tab)
})

//handle current tab content changed (most likely a URL change)
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
	switch (changeInfo?.status) {
		case 'complete':
			handleTabUpdated(tab)
			break;
	}
})

// chrome.tabs.onAttached.addListener((tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => console.log('onAttached', { tabId, attachInfo }))
// chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => console.log('onCreated', tab))
// chrome.tabs.onDetached.addListener((tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => console.log('onDetached', { tabId, detachInfo }))
// chrome.tabs.onHighlighted.addListener((highlightInfo: chrome.tabs.TabHighlightInfo) => console.log('onHighlighted', highlightInfo))
// chrome.tabs.onMoved.addListener((tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => console.log('onMoved', { tabId, moveInfo }))
// chrome.tabs.onRemoved.addListener((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => console.log('onRemoved', { tabId, removeInfo }))
// chrome.tabs.onReplaced.addListener((addedTabId: number, removedTabId: number) => console.log('onReplaced', { addedTabId, removedTabId }))
// chrome.tabs.onZoomChange.addListener((ZoomChangeInfo: chrome.tabs.ZoomChangeInfo) => console.log('onZoomChange', ZoomChangeInfo))