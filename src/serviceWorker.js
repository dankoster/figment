//https://developer.chrome.com/docs/extensions/reference/api/scripting#runtime_functions
function toggleFigmentOverlay() {
	document.dispatchEvent(new Event('toggleFigmentOverlay'))
}

//https://developer.chrome.com/docs/extensions/reference/api/action
chrome.action.onClicked.addListener((tab) => {
	chrome.scripting
		.executeScript({
			target: {tabId: tab.id},
			//files: ['content.js'], 
			func: toggleFigmentOverlay 
		})
		.then(() => console.log("chrome.action.onClicked"))
  });
