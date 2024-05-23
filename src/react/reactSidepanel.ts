import { Message, SendMessageToCurrentTab } from "../Bifrost.js";
import { SidePanelTab } from "../SidePanelTab.js";
import { ReactComponentInfo } from "../elementFunctions.js";
import { applyStylesheetToDocument, element } from "../html.js";
import { displayStatus, sidePanelUrlHandler } from "../sidepanel.js";

let urlString = ''
const reactTab = new SidePanelTab(tabTitle('Components'), renderReactTabUi(urlString))

//Inject figma css, if necessary
applyStylesheetToDocument('reactSidePanel.css')

export const addTab: sidePanelUrlHandler = function (url: URL) {
	urlString = url.toString()
	displayStatus(`requesting react update for ${url}`, 'react')
	SendMessageToCurrentTab('request_updated_react_data')
}

function tabTitle(text: string) {
	return element('div', { className: 'title react-tab-title' }, [
		element('img', { src: 'reactLogo.svg', className: 'react-logo' }),
		element('span', { innerText: text })
	])
}

function renderReactTabUi(url: string, data?: ReactComponentInfo[]) {
	displayStatus(`rendering react tab for ${url}`, 'react')

	const shorten = (url: string) => url.substring(url.lastIndexOf('/') + 1)

	return element('div', { className: 'react-tab' }, [
		element('h2', { innerText: `React Components for ${url}` }),
		data && element('div', { className: 'react-component-list'}, 
			data.map(({name, url, selectors}) => element('div', { className: 'react-component'}, [
				element('span', { innerText: name }),
				element('a', { innerText: shorten(url), href: url, target: '_vscode' }),
				element('div', {}, selectors.map((selector) => element('pre', {innerText: selector.replaceAll(':nth-child', '')}, [], {
					mouseenter: () => { SendMessageToCurrentTab('highlight_selector', selector) },
					mouseleave: () => { SendMessageToCurrentTab('clear_selector', selector)},
				})))
				
			]))
		)
	])
}

//from inside the extension
// chrome.runtime.onMessage.addListener((request, sender) => {
// 	const message = Message.from(request)
// 	console.log('onMessage', message)
// 	handleFigmentMessage(message)
// })

//from the page
chrome.runtime.onMessageExternal.addListener((request, sender) => {
	// console.log('onMessageExternal', request.message)
	handleFigmentMessage(request.message)
})

function handleFigmentMessage(message: Message) {
	switch (message.action) {
		case 'update_react_data':
			if(!message.data) throw new Error(`update_react_data: data invalid! ${message.data}`)

			const data = JSON.parse(message.data) as ReactComponentInfo[]
			displayStatus(`got updated react data for ${urlString}`, 'react')
			reactTab.setTabBody(renderReactTabUi(urlString, data))
			reactTab.setActive()

			break;
	}
}
