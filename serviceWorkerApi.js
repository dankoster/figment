import { figmentId } from './Figment.js';

//this code is responsible for talking to the service worker
// which has access to the extension local storage

class ServiceWorkerApi {
	constructor() {
	}

	onPushMessage 
	backgroundPort
	messageQueue = {}

	//TODO: implement a strategy pattern for the different message types
	toggleEnabled = () => this.sendMessage({command: 'toggle', setting: 'enabled'})
	requestSettings = () => this.sendMessage({request: 'settings'})

	//TODO: make this a better message queueing situation: sendMessage should probably just enque
	sendMessage(message) {
		return new Promise((resolve, reject) => {
			try {
				message.id = Date.now();
				this.backgroundPort.postMessage(message)
				this.messageQueue[message.id] = { message, resolve, reject }
			} catch(error) {
				if(error.message == 'Attempting to use a disconnected port object') {
					this.reconnect()
					//we failed before this message got into the queue, so we can retry
					if ((message.retries ?? 0) < 10) {
						message.retries ? message.retries++ : message.retries = 1
						console.warn(`retrying`, message)
						this.sendMessage(message)
					}
				}
				else
					reject(error)
			}
		})
	}

	onResponse = (message) => {
		if (!message.request?.id && typeof this.onPushMessage === 'function')
			this.onPushMessage(message)
		else {
			if (!this.messageQueue[message.request.id]) 
				throw `${message.request.id}: no message found for id`

			this.messageQueue[message.request.id].resolve(message.response)
			delete this.messageQueue[message.request.id]
		}
	}

	reconnect() {
		if(!this.runtimeId) throw 'missing runtimeId'
		if(!this.onPushMessage) throw 'missing onPushMessage'

		this.backgroundPort = undefined
		this.connect({ runtimeId: this.runtimeId, onUnrequestedMessage: this.onPushMessage })
	}

	connect({runtimeId, onUnrequestedMessage}) {
		this.runtimeId = runtimeId
		this.onPushMessage = onUnrequestedMessage
		if (!this.backgroundPort) {
			this.backgroundPort = chrome.runtime.connect(runtimeId, { name: "injected-background" })
	
			//listen for messages from the background service worker
			this.backgroundPort.onMessage.addListener(this.onResponse)
	
			//chrome appears to disconnect after 5:30 of inactivity. We need to remain
			// connected or we can miss messages that are triggered by the popup window
			this.backgroundPort.onDisconnect.addListener(this.reconnect)
		}

		return this
	}
}

//Use a module scoped instance to deliver a singleton: only one  
// instance is constructed regardless of how many imports there are
export default new ServiceWorkerApi()



//---------FIGMA-----------------
// TODO: migrate this into the port based API above

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
