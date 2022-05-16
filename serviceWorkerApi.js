import { figmentId } from './Figment.js';

//this code is responsible for talking to the service worker
// which has access to the extension local storage

class ServiceWorkerApi {
	constructor() {
	}

	#onPushMessage
	backgroundPort
	messageQueue = {}

	toggleEnabled () { return this.sendMessage({command: 'toggle', setting: 'enabled'}) }
	requestSettings = () => this.sendMessage({request: 'settings'}) 

	sendMessage(message) {
		return new Promise((resolve, reject) => {
			try {
				message.id = Date.now();
				this.messageQueue[message.id] = { message, resolve, reject }
				this.backgroundPort.postMessage(message)
			} catch(error) {
				reject(error)
			}
		})
	}

	onResponse = (message) => {
		if (!message.request?.id && typeof this.#onPushMessage === 'function')
			this.#onPushMessage(message)
		else {
			if (!this.messageQueue[message.request.id]) 
				throw `${message.request.id}: no message found for id`

			this.messageQueue[message.request.id].resolve(message.response)
			delete this.messageQueue[message.request.id]
		}
	}

	connect({runtimeId, onUnrequestedMessage}) {
		this.#onPushMessage = onUnrequestedMessage
		if (!this.backgroundPort) {
			this.backgroundPort = chrome.runtime.connect(runtimeId, { name: "injected-background" })
	
			//listen for messages from the background service worker
			this.backgroundPort.onMessage.addListener(this.onResponse)
	
			//chrome appears to disconnect after 5:30 of inactivity
			this.backgroundPort.onDisconnect.addListener((event) => {
				this.backgroundPort = undefined
				this.connect(onMessage) //just immediately reconnect
			})
		}

		return this
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
