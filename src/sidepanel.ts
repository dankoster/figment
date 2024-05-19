import { FigmentMessage } from "./Bifrost.js";
import * as figmaSidepanel from "./figma/figmaSidepanel.js";
import * as reactSidepanel from "./react/reactSidepanel.js";
import { element } from "./html.js";


export type sidePanelUrlHandler = (url: URL) => void

const handlers = new Map<string, sidePanelUrlHandler[]>()
handlers.set('localhost', [reactSidepanel.addTab, figmaSidepanel.handleLocalhost])
handlers.set('www.figma.com', [figmaSidepanel.handleFigmaUrl])

async function handleTabUpdated(tab: chrome.tabs.Tab) {
	if (!tab.url) return

	const url = new URL(tab.url)
	displayStatus(`_____________________________`)
	displayStatus(` `)
	displayStatus(`${url.toString()}`)
	const handlerList = handlers.get(url.hostname)

	if (handlerList) {
		for (const handler of handlerList) {
			handler(url)
		}
	}
	else displayStatus(`NO HANDLER for ${url.hostname}`)
}

export function displayStatus(value: string, source?: string) {
	const status = document.getElementById('status')
	if (!status) throw new Error(`could not find element with id "${status}"`)
	const newStatus = element('pre', { innerText: `${source ? `[${source}] `:''}${value}` })
	status.appendChild(newStatus)
	newStatus.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
}

export const splitUrlPath = (url: URL): string[] => url.pathname.split('/')?.filter(s => s)

async function getCurrentTab() {
	let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
	return tab;
}

window.onload = async function () {
	const tab = await getCurrentTab()
	handleTabUpdated(tab)

	//tell the service worker
	chrome.runtime.sendMessage({
		action: 'sidepanel_has_opened',
		messageId: Date.now() + Math.random()
	} as FigmentMessage)
}

//handle switching to a specific tab
chrome.tabs.onActivated.addListener(async (activeInfo: chrome.tabs.TabActiveInfo) => {
	const tab = await getCurrentTab()
	handleTabUpdated(tab)
})

//handle current tab content changed (most likely a URL change)
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
	switch (changeInfo?.status) {
		case 'complete':
			const curTab = await getCurrentTab()
			if (tabId === curTab?.id) {
				handleTabUpdated(tab)
			}
			break;
	}
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message) {
		case 'are you still there':
			sendResponse('still alive')
			break;
		case 'goodbye':
			window.close()
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