import { FigmentMessage, FigmentResponse, SendMessageToCurrentTab } from "../Bifrost.js";
import { SidePanelTab } from "../SidePanelTab.js";
import { applyStylesheetToDocument, element } from "../html.js";
import { displayStatus, sidePanelUrlHandler } from "../sidepanel.js";

let urlString = ''
let cachedData: string[][] | undefined
const reactTab = new SidePanelTab(tabTitle('Components'), renderReactTabUi(urlString))

//Inject figma css, if necessary
applyStylesheetToDocument('reactSidePanel.css')

export const addTab: sidePanelUrlHandler = async function (url: URL) {

	displayStatus(`requesting react update`, 'react')
	await SendMessageToCurrentTab('request_updated_react_data')

	urlString = url.toString()
	reactTab.setTabBody(renderReactTabUi(urlString, cachedData))
	reactTab.setActive()
}

function tabTitle(text: string) {
	return element('div', { className: 'react-tab-title' }, [
		element('img', { src: 'reactLogo.svg', className: 'react-logo' }),
		element('span', { innerText: text })
	])
}

function renderReactTabUi(url: string, data?: string[][]) {
	displayStatus(`rendering react tab`, 'react')

	const shorten = (url: string) => url.substring(url.lastIndexOf('/') + 1)

	return element('div', { className: 'react-tab' }, [
		element('h2', { innerText: 'React Components on this page' }),
		element('span', {innerText: url, className: 'url'}),
		data && element('div', { className: 'react-component-list'}, 
			data.map(([name, url]) => element('div', { className: 'react-component'}, [
				element('span', { innerText: name }),
				element('a', { innerText: shorten(url), href: url, target: '_vscode' })
			]))
		)
	])
}

//from inside the extension
chrome.runtime.onMessage.addListener((message: FigmentMessage, sender, sendResponse) => {
	handleFigmentMessage(message, sendResponse)
})

//from the page
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
	handleFigmentMessage(request.message, sendResponse)
})

function handleFigmentMessage(message: FigmentMessage, sendResponse: (response?: FigmentResponse) => void) {
	switch (message.action) {
		case 'update_react_data':

			const data = JSON.parse(message.data)
			cachedData = data;
			displayStatus(`got updated react data`, 'react')
			reactTab.setTabBody(renderReactTabUi(urlString, data))
			reactTab.setActive()

			//acknowledge reciept of this message
			chrome.runtime.sendMessage({
				action: 'sidepanel_got_message',
				messageId: message.messageId
			} as FigmentMessage)

			sendResponse({ success: true })

			break;
	}
}
