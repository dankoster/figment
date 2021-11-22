

//needs manifest config:
// "action": {
// 	"default_popup": "popup.html"
// },
// "background": {
// 	"service_worker": "background.js"
// },


let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.sync.set({ color });
	console.log('Default background color set to %cgreen', `color: ${color}`);
});

//https://developer.chrome.com/docs/extensions/mv3/messaging/#external-webpage
//needs manifest config:
// "externally_connectable": {
// 	"matches": [
// 		"http://localhost/*",
// 		"https://2b1e-50-53-69-236.ngrok.io/*"
// 	]
// }
// chrome.runtime.onMessageExternal.addListener(
// 	function (request, sender, sendResponse) {
// 		console.log({request, sender})

// 		chrome.notifications.create('NOTFICATION_ID', {
// 			type: 'image',
// 			iconUrl: 'F.png',
// 			title: request.name,
// 			message: request.file,
// 			priority: 2
// 		})
// 	}
// )

async function getCurrentTab() {
	let queryOptions = { active: true, currentWindow: true };
	let [tab] = await chrome.tabs.query(queryOptions);
	return tab;
}

