
//This file is intended to consolidate the functions that handle message 
// passing communication between the page and the service worker. 
// This file contains functions that are used in both places. 

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action

//communicate serviceWorker events to the injected content script
export const dispatchExtensionAction = () => document.dispatchEvent(new Event("toggle_enabled"))
export const handleExtensionEvent = (event: FigmentMessageAction, handler: EventListenerOrEventListenerObject) => document.addEventListener(event, handler)

const dispatchExtensionEvent = (event: FigmentMessageAction, detail: string) => document.dispatchEvent(new CustomEvent(event, { detail }))

type FigmentMessageAction =
	"toggle_enabled" |
	"overlay_image" |
	"start_drag_from_side_panel" |
	"search_figma_data" | 
	"sidepanel_open" | 
	"sidepanel_got_message"

//communicate from the page to the service worker
export type FigmentMessage = {
	action: FigmentMessageAction,
	messageId: number, //kinda-unique: Date.now() + Math.random()
	bool?: boolean,
	str?: string
}
export type FigmentResponse = {
	success: boolean,
	response?: string
}

async function getCurrentTab() {
	const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
	//if (!tab?.id) console.log(new Error('could not get current tab'))
	return tab
}

export async function SendMessageToCurrentTab(event: FigmentMessageAction, detail: string) {
	//chrome.tabs.sendMessage ???
	//https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage

	const tab = await getCurrentTab()
	if (tab?.id) {
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionEvent,
			args: [event, detail]
		})
	}
}
function sendMessageToServiceWorker(extensionId: string, message: FigmentMessage) {
	chrome?.runtime?.sendMessage && chrome.runtime.sendMessage(extensionId, { message },
		function (response: FigmentResponse) {
			if (!response.success)
				console.error(response);
		});
}

export function searchFigmaData(extensionId: string, search: string) {
	sendMessageToServiceWorker(extensionId, {
		action: 'search_figma_data',
		str: search,
		messageId: Date.now() + Math.random()
	})
}

export function setToolbarEnabledState(extensionId: string, enabled: boolean) {
	sendMessageToServiceWorker(extensionId, {
		action: 'toggle_enabled',
		bool: enabled, 
		messageId: Date.now() + Math.random()
	})
}
