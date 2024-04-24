import { FigmentMessage, dispatchExtensionAction } from "./Bifrost.js"

//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action
//https://developer.chrome.com/docs/extensions/reference/api/commands#action_command
//NOTE: the keyboard shortcut is configured in manifest.json and is also handled by the action.onClicked event
chrome.action.onClicked.addListener((tab) => {
	toggleExtensionAction(tab);
});

chrome.commands.onCommand.addListener((command, tab) => {
	switch (command) {
		case 'configure':
			openSidePanel(tab)
			break
		default:
			throw new Error(`unrecognized command: ${command}`)
	}
});

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
//handle messages that happen inside the extension (between the sidepanel and service worker, for example)
chrome.runtime.onMessage.addListener((message: FigmentMessage, sender, sendResponse) => {
	switch (message.action) {
		case 'sidepanel_got_message':
			//discard the message after confirmed reciept
			const index = messagesForSidePanel.findIndex(m => m.messageId === message.messageId)
			if (index > -1) {
				messagesForSidePanel.splice(index, 1)
			}
			break
		case 'sidepanel_open':
			//send any queued messages to the sidepanel (first in, first out)
			while (messagesForSidePanel.length) {
				const message = messagesForSidePanel.shift()
				chrome.runtime.sendMessage(message)
			}
			break;
	}
})

/**
 * This is to account for cases where the same message may be handled here AND elsewhere 
 * such as in a side-panel. For example, a message may need to cause multiple actions such 
 * as opening the side panel and then searching for something inside the side panel. In that
 * case, the message can trigger the first action and then be queued to be re-sent when the
 * side panel finally opens and is ready to process the next action.
 * 
 * We need this mechanism because we don't have a good way of knowing if the side panel
 * is actually open or a better way to reilably wait for it to open. The API for that seems
 * to be broken at this time.
 */
const messagesForSidePanel: FigmentMessage[] = []

chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
	const message = request.message as FigmentMessage
	switch (message.action) {
		case 'toggle_enabled':
			chrome.action.setBadgeText({ tabId: sender.tab?.id, text: message.bool ? "ON" : "OFF" });
			sendResponse({ success: true })
			break;
		case 'search_figma_data':
			chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
				if (tab?.windowId) {
					//this causes the sidepanel to open, but it's not immediately available for messaging
					// and there doesn't appear to be a good way to wait for it to be available.
					chrome.sidePanel.open({ windowId: tab.windowId })

					//queue the message for sending when the sidepanel is ready
					messagesForSidePanel.push(message)
				}
			})
			break;
		default:
			console.log(`handleMessageFromPage - unrecognized action ${message.action}`, message)
			sendResponse({
				success: false,
				response: `unrecognized action: ${request.action}`
			})
			break;
	}
});

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: 'openToggleEnabled',
		title: 'Toggle DOM Inspection',
		contexts: ['all']
	});
	chrome.contextMenus.create({
		id: 'openSidePanel',
		title: 'Open side panel',
		contexts: ['all']
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	switch (info.menuItemId) {
		case 'openSidePanel':
			openSidePanel(tab);
			break;
		case 'openToggleEnabled':
			toggleExtensionAction(tab)
			break;
		default:
			throw new Error(`unhandled context menu: ${info.menuItemId}`)
	}
});

function openSidePanel(tab: chrome.tabs.Tab | undefined) {
	// This will open the panel in all the pages on the current window.
	if (tab?.windowId)
		chrome.sidePanel.open({ windowId: tab.windowId });
}

function toggleExtensionAction(tab?: chrome.tabs.Tab) {
	if (!tab?.id) throw new Error(`Tab id ${tab?.id} is invalid`)

	chrome.scripting
		.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionAction
		});
}

