import { figmentId } from './Figment.js';

//this code is responsible for talking to the service worker
// which has access to the extension local storage

class ServiceWorkerApi {
	constructor() {
	}

	backgroundPort
	onMessage

	toggleEnabled () { this.sendMessage({command: 'toggle', setting: 'enabled'}) }
	requestSettings () { this.sendMessage({request: 'settings'}) }

	connect(onMessage) {
		this.onMessage = onMessage
		if (!this.backgroundPort) {
			this.backgroundPort = chrome.runtime.connect(figmentId, { name: "injected-background" })
	
			//listen for messages from the background service worker
			this.backgroundPort.onMessage.addListener(onMessage)
	
			//chrome appears to disconnect after 5:30 of inactivity
			this.backgroundPort.onDisconnect.addListener((event) => {
				this.backgroundPort = undefined
				this.connect(onMessage) //just immediately reconnect
			})
		}

		return this
	}
	
	reconnect() {
		console.log('Attempting to reconnect...')
		if(this.onMessage) this.connect(this.onMessage)
		else throw 'call Connect first to set onMessage'
	}
	
	sendMessage(message) {
		try {
			this.backgroundPort.postMessage(message)
		} catch(e) {
			if(e.message === `Attempting to use a disconnected port object`) {
				console.warn(e.message)
				this.backgroundPort = undefined
				this.reconnect()
				this.backgroundPort.postMessage(message) //try one more time
			}
			else throw e
		}
	}
}

//Use a module scoped instance to deliver a singleton: only one  
// instance is constructed regardless of how many imports there are
export default new ServiceWorkerApi()



//---------FIGMA-----------------

export function SearchFigmaData({ name, id }) {
	return SendQuery({ search: { name, id } })
		.then(response => response?.search?.result)
}

export function GetFigmaImageLinks(ids) {
	return SendQuery({ images: ids })
		.then(response => response?.images?.result)
}

function SendQuery(query) {
	return new Promise((resolve) => {
		//this should be returning a promise, according to the docs?
		//https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage
		chrome.runtime.sendMessage(figmentId, query, function (response) {
			resolve(response);
		});
	});
}
