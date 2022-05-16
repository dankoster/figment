import { GetSettings, SetExtensionSetting } from "./ExtensionApi.js";
import { FigmaSearch, GetFigmentImages, GetLocalFigmaData } from "./FigmaApi.js"

//listen for the injected script to open a port
let injectedScriptPort = null
chrome.runtime.onConnectExternal.addListener((port) => {
	if (port.name === "injected-background") {
		injectedScriptPort = port

		//listen for requests from the injected script
		port.onMessage.addListener(function (message) {
			if (message.request === 'settings') {
				GetSettings().then(settings => {
					port.postMessage({ request: message, response: { settings } })
				})
			}

			if(message.command) {
				switch(message.command) {
					case 'toggle': 
						GetSettings().then(settings => {
							let settingValue = settings[message.setting]
							SetExtensionSetting(message.setting, !settingValue).then(newSettings => {
								port.postMessage({ request: message, response: { settings: newSettings} })
							})
						})
					break;
				}
			}
		})
	}
});

//if the settings change, send that info to the injected script
//https://developer.chrome.com/docs/extensions/reference/storage/#synchronous-response-to-storage-updates
chrome.storage.onChanged.addListener(function (changes, namespace) {
	for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
		const message = {}
		message[key] = newValue
		injectedScriptPort?.postMessage(message)
	}
});

//listen for requests from the web page
chrome.runtime.onMessageExternal.addListener(
	function (request, sender, sendResponse) {
		console.log('request', request)

		if (request.search || request.images) {
			GetLocalFigmaData().then((figma) => {
				console.log('got figma data', figma)
				let result = { }

				if (request.search) {
					let searchResult = SearchFigmaData(figma, request.search);
					result.search = { ...request.search, result: { ...searchResult } }

					console.log(result)
					sendResponse(result)
				}

				if (request.images) {
					//TODO: optimize this to only get images for items that don't already have an image url cached
					GetFigmentImages({ ...figma, ids: request.images }).then((images) => {
						result.images = { ...request.images, result: images }

						//TODO: update each figma result with it's image url and update local storage with a ttl of 30 days
						// see FigmaApi.UpdateLocalStorageFigmaNode

						console.log(result)
						sendResponse(result)
					})
				}
			})
		}

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
