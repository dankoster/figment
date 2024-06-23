import { Message, SendMessageToCurrentTab } from "../Bifrost.js";
import { SidePanelTab } from "../SidePanelTab.js";
import { ReactComponentInfo } from "../elementFunctions.js";
import { applyStylesheetToDocument, element } from "../html.js";
import { displayStatus, sidePanelUrlHandler } from "../sidepanel.js";

let urlString = ''
const reactTab = new SidePanelTab(tabTitle('Components'), renderReactTabUi(urlString))

//Inject css, if necessary
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

	const shortUrl = (url?: string) => url?.substring(url.lastIndexOf('/') + 1)
	const shortSel = (selector?: string) => selector?.replaceAll(':nth-child', '').replaceAll('#', '')

	return element('div', { className: 'react-tab' }, [
		element('h2', { innerText: `React Components for ${url}` }),
		data && element('div', { className: 'react-component-list' },
			data.map((component) => element('div', { className: 'react-component' }, [
				element('div', { className: 'component-info' }, [
					element('span', { innerText: component.name }),
					element('a', { innerText: shortUrl(component.url), href: component.url, target: '_vscode' }),
				]),
				element('div', { className: 'dom-selectors' },
					component.selectors.map((s) => element('div', { className: 'dom-selector' }, [
						element('pre', { innerText: shortSel(s.selector) }, []),
						element('a', { innerText: shortUrl(s.url), href: s.url, target: '_vscode' }),
					], {
						mouseenter: () => { SendMessageToCurrentTab('highlight_selector', s.selector) },
						mouseleave: () => { SendMessageToCurrentTab('clear_selector', s.selector) },
					})
				))

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
			if (!message.data) throw new Error(`update_react_data: data invalid! ${message.data}`)

			const data = JSON.parse(message.data) as ReactComponentInfo[]
			displayStatus(`got updated react data for ${urlString}`, 'react')
			reactTab.setTabBody(renderReactTabUi(urlString, data))
			reactTab.setActive()

			break;
	}
}
