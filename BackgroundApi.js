import { figmentId } from './Figment.js';

//this code is responsible for talking to the service worker (background.js)
// which has access to the extension local storage

export function SearchFigmaData({ name, id }) {
	return SendQuery({ search: { name, id } })
		.then(response => response?.search?.result)
}

export function GetFigmaImageLinks(ids) {
	return SendQuery({ images: ids })
		.then(response => response?.images?.result)
}

export function FigmaEnabled() {
	return SendQuery({ settings: 'enabled' })
		.then(response => response?.settings?.result)
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
