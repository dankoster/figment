import { FigmaNode, FigmaSearch, GetLocalFigmaData } from "./FigmaApi.js"

//listen for component name requests from the web page
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		console.log('request', request)

		GetLocalFigmaData().then((figma) => {

			console.log('got figma data',figma)

			let searchResult = SearchFigmaData(figma, request.search);

			console.log({searchResult})
			let result = {}

			if(searchResult) result.search = {...request.search, ...searchResult}
			console.log(result)
			sendResponse(searchResult)

		});

        return true //tell the api a response is pending
	}
)

function SearchFigmaData(figma, search) {
	let result = FigmaSearch.FindByExactNameOrId({ figma, ...search }) //figma?.frames?.find(frame => frame.name === request.name || frame.id === decodeURIComponent(request.id))
	let searchTerms = [Object.values(search).filter((v)=>v)].join(',')


	if (!result) {
		//split the requested name 'MyProfile' into a lowercase regex string like 'my|profile'
		let regex = FigmaSearch.SplitByCaps(search.name)
		searchTerms = [search.name.split(/(?=[A-Z])/)].join(',')
		//use the regex to see if any frame name has any word from the requested name 
		// (so, 'MyProfile' matches 'Profile / Desktop @1680')
		result = FigmaSearch.FindByRegex({ figma, regex })
	}

	let searchResult = {
		lastModified: figma?.lastModified,
		version: figma?.version,
		recordCount: figma?.frames?.length,
		searchTerms,
		result,
	}
	return searchResult
}
