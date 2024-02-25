import { sendToolbarClicked, handleMessageFromPage } from "./Bifrost.js";

//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action
chrome.action.onClicked.addListener((tab) => {
	chrome.scripting
		.executeScript({
			target: { tabId: tab.id },
			func: sendToolbarClicked
		})
	}
);

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
chrome.runtime.onMessageExternal.addListener(handleMessageFromPage);