import { dispatchExtensionAction, handleMessageFromPage } from "./Bifrost.js"

//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action
//https://developer.chrome.com/docs/extensions/reference/api/commands#action_command
//NOTE: the keyboard shortcut is configured in manifest.json and is also handled by the action.onClicked event
chrome.action.onClicked.addListener((tab) => {
	if(!tab?.id) throw new Error(`Tab id ${tab?.id} is invalid`)

	chrome.scripting
		.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionAction
		})
});

chrome.commands.onCommand.addListener((command, tab) => {
	switch (command) {
		case 'configure':
			chrome.sidePanel.open({ windowId: tab.windowId });
			break
		default:
			throw new Error(`unrecognized command: ${command}`)
	}
});

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
chrome.runtime.onMessageExternal.addListener(handleMessageFromPage);

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: 'openSidePanel',
		title: 'Open side panel',
		contexts: ['all']
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if(!tab?.windowId) throw new Error(`Tab id ${tab?.windowId} is invalid`)

	if (info.menuItemId === 'openSidePanel') {
		// This will open the panel in all the pages on the current window.
		chrome.sidePanel.open({ windowId: tab.windowId });
	}
});
