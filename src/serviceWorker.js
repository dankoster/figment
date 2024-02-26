import { dispatchExtensionAction, handleMessageFromPage } from "./Bifrost.js";

//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action
//https://developer.chrome.com/docs/extensions/reference/api/commands#action_command
//NOTE: the keyboard shortcut is configured in manifest.json and is also handled by the action.onClicked event
chrome.action.onClicked.addListener((tab) => {
	chrome.scripting
		.executeScript({
			target: { tabId: tab.id },
			func: dispatchExtensionAction
		})
});

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
chrome.runtime.onMessageExternal.addListener(handleMessageFromPage);