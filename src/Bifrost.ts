
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

type FigmentMessageAction = "toggle_enabled" | "overlay_image" | "start_drag_from_side_panel"

//communicate from the page to the service worker
export type FigmentMessage = {
	action: FigmentMessageAction,
	value: boolean,
    figmentId: string,
}
export type FigmentResponse = {
	success: boolean,
	response?: string
}

export async function SendMessageToCurrentTab(event: FigmentMessageAction, detail: string) {
	
	//chrome.tabs.sendMessage ???
	//https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage

	let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if(!tab?.id) throw new Error('could not get current tab')
	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: dispatchExtensionEvent,
		args: [event, detail]
	})
}

function sendMessageToServiceWorker(message: FigmentMessage) {
	chrome?.runtime?.sendMessage && chrome.runtime.sendMessage(message.figmentId, { message },
		function (response: FigmentResponse) {
			if (!response.success)
				console.error(response);
		});
}

export function setToolbarEnabledState (figmentId: string, enabled: boolean) {
    sendMessageToServiceWorker({
		action: 'toggle_enabled',
		value: enabled,
		figmentId
	})
}

export function handleMessageFromPage (request: any, sender: any, sendResponse: (response: FigmentResponse)=>void) {
    const action = request.message.action as FigmentMessageAction
    if (action === 'toggle_enabled') {
        chrome.action.setBadgeText({ tabId: sender.tab.id, text: request.message.value ? "ON" : "OFF" });
        sendResponse({ success: true })
    }
    else {
        sendResponse({
            success: false,
            response: `unrecognized action: ${request.action}`
        })
    }
}