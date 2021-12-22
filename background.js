import { FigmaNode, FigmaSearch, GetLocalFigmaData } from "./FigmaApi.js"

//listen for component name requests from the web page
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		console.log('request', request)

		GetLocalFigmaData().then((figma) => {

			console.log('got figma data',figma)

			//find the figma info for the requested component name
			let result = FigmaSearch.FindByExactNameOrId({figma, ...request}); //figma?.frames?.find(frame => frame.name === request.name || frame.id === decodeURIComponent(request.id))

			if (!result) {
				//split the requested name 'MyProfile' into a lowercase regex string like 'my|profile'
				let regex = FigmaSearch.SplitByCaps(request.name)
				//use the regex to see if any frame name has any word from the requested name 
				// (so, 'MyProfile' matches 'Profile / Desktop @1680')
				result = FigmaSearch.FindByRegex({figma, regex })
			}

			let test = result.map(r => new FigmaNode(r))
			console.log('search result', {result, test})

			sendResponse({ lastModified: figma?.lastModified, version: figma?.version, result, recordCount: figma?.frames?.length })

		});

        return true //tell the api a response is pending
	}
)