
import { ReactComponentInfo } from "./elementFunctions"

//This file is intended to consolidate the functions that handle message 
// passing communication between the page and the service worker. 
// This file contains functions that are used in both places. 

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action

//communicate serviceWorker events to the injected content script
export const dispatchExtensionAction = () => document.dispatchEvent(new Event("toggle_enabled"))
export const handleExtensionEvent = (event: FigmentMessageAction, handler: EventListenerOrEventListenerObject) => document.addEventListener(event, handler)

const dispatchExtensionEvent = (event: FigmentMessageAction, detail?: string) => {
	//console.log('dispatchExtensionEvent', event, detail)
	if (detail) document.dispatchEvent(new CustomEvent(event, { detail }))
	else document.dispatchEvent(new CustomEvent(event))
}

type FigmentMessageAction =
	"toggle_enabled" |
	"toggle_sidepanel" |
	"overlay_image" |
	"start_drag_from_side_panel" |
	"search_figma_data" |
	"sidepanel_has_opened" |
	"sidepanel_got_message" |
	"update_react_data" |
	"request_updated_react_data" |
	"request_sidepanel_open_state" |
	"close_sidepanel" | 
	"highlight_selector" | "clear_selector"

type FigmaMessageTarget = 'page' |
	'extension' |
	'service_worker' |
	'sidepanel' |
	'figma_sidepanel' |
	'react_sidepanel'

type MessageInit = Omit<Message, 'messageId'>

export class Message {
	source: FigmaMessageTarget
	target: FigmaMessageTarget
	action: FigmentMessageAction

	responseToMessageId?: number
	data?: string
	bool?: boolean
	str?: string

	messageId: number

	constructor(message: MessageInit) {
		//make typescript happy. Everything reassigned in the loop.
		this.source = message.source
		this.target = message.target
		this.action = message.action

		//assign optional props (actually everything)
		for (const prop in message) {
			(this as any)[prop] = (message as any)[prop]
		}

		this.messageId = Date.now() + Math.random()
	}

	static from(message: any) {
		let deserialized
		switch (typeof message) {
			case 'object':
				deserialized = message
				break
			case 'string':
				deserialized = JSON.parse(message)
				break
			default:
				throw new Error(`cannot construct Message from ${typeof message}`)
		}

		const result = new Message(deserialized)
		result.messageId = deserialized.messageId
		return result
	}

	static send(message: MessageInit) {
		return chrome.runtime.sendMessage(new Message(message))
	}
}

async function getCurrentTab() {
	const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
	//if (!tab?.id) console.log(new Error('could not get current tab'))
	return tab
}

export async function SendMessageToCurrentTab(event: FigmentMessageAction, detail?: string) {
	//chrome.tabs.sendMessage ???
	//https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage

	const tab = await getCurrentTab()
	if (tab?.id) {
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionEvent,
			args: detail ? [event, detail] : [event]
		})
	}
}
function sendMessageToExtension(extensionId: string, message: Message) {
	// console.log(message.messageId, message.target, message.action)
	chrome.runtime.sendMessage(extensionId, { message })
}

export function searchFigmaData(extensionId: string, search: string) {
	sendMessageToExtension(extensionId, new Message({
		source: 'page',
		target: 'figma_sidepanel',
		action: 'search_figma_data',
		str: search,
	}))
}

export function updateReactComponentsInSidebar(extensionId: string, components: ReactComponentInfo[]) {
	sendMessageToExtension(extensionId, new Message({
		source: 'page',
		target: 'react_sidepanel',
		action: 'update_react_data',
		data: JSON.stringify(components)
	}))
}

export function setToolbarEnabledState(extensionId: string, enabled: boolean) {
	sendMessageToExtension(extensionId, new Message({
		source: 'page',
		target: 'extension',
		action: 'toggle_enabled',
		bool: enabled,
	}))
}

export function toggleSidePanel(extensionId: string) {
	sendMessageToExtension(extensionId, new Message({
		source: 'page',
		target: 'extension',
		action: 'toggle_sidepanel',
	}))
}
