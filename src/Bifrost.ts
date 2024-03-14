//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action

//communicate serviceWorker events to the injected content script
export const dispatchExtensionAction = () => document.dispatchEvent(new Event("toggle_enabled"))
export const handleExtensionEvent = (event: FigmentMessageAction, handler: EventListenerOrEventListenerObject) => document.addEventListener(event, handler)

export const dispatchExtensionEvent = (event: FigmentMessageAction, detail: string) => document.dispatchEvent(new CustomEvent(event, { detail }))

type FigmentMessageAction = "toggle_enabled" | "overlay_image"

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