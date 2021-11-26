	
let figma = {}

//listen for messages from figment.js
chrome.runtime.onMessage.addListener(
	//this can't be an async function!
	(request, sender, sendResponse) => {
		console.log('onMessage', {request, sender, sendResponse})
        if(request.figma) figma = request.figma
	}
);

//listen for component name requests from the web page
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		console.log(request)

		//find the figma info for the requested component name
		let result = figma?.frames?.find(frame => frame.name === request.name || frame.id === decodeURIComponent(request.id))

		if (!result) {
			//split the requested name 'MyProfile' into a lowercase regex string like 'my|profile'
			let regex = new RegExp(request.name.split(/(?=[A-Z])/).map(str => str.toLowerCase()).join('|'))
			//use the regex to see if any frame name has any word from the requested name 
			// (so, 'MyProfile' matches 'Profile / Desktop @1680')
			result = figma?.frames?.filter(frame => regex.test(frame.name.toLowerCase()))
		}
		
		console.log(result)
	
		sendResponse({ lastModified: figma?.lastModified, version: figma?.version, result, recordCount: figma?.frames?.length })
        return true //tell the api a response is pending
	}
)