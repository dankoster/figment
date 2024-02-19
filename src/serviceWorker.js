//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
//https://developer.chrome.com/docs/extensions/reference/api/action
chrome.action.onClicked.addListener((tab) => {
	chrome.scripting
		.executeScript({
			target: { tabId: tab.id },
			func: () => document.dispatchEvent(new Event('toggleFigmentOverlay'))
		})
		.then((e) => {
			console.log("chrome.action.onClicked", e)
		})
});

//https://developer.chrome.com/docs/extensions/develop/concepts/messaging 
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		console.log(sender, request)
		if (request.message.action === 'toggle_enabled') {
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
);