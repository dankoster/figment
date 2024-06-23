import { SidePanelTab } from "../SidePanelTab.js";
import { applyDiff, applyStylesheetToDocument, element } from "../html.js";
import { DEFAULT_OPTIONS, OptionName, Options, clearAllOptions, getAllOptions, setAllOptions, setOption } from "../options.js";
import { displayStatus, sidePanelUrlHandler } from "../sidepanel.js";

let urlString = ''
const tab = new SidePanelTab(tabTitle('Options'), await renderTabUi(urlString))

//Inject css, if necessary
applyStylesheetToDocument('optionsSidePanel.css')

export const addTab: sidePanelUrlHandler = async function (url: URL) {
	urlString = url.toString()
	displayStatus(`requesting react update for ${url}`, 'react')

	tab.setTabBody(await renderTabUi(urlString))
	tab.setActive()

}

chrome.storage.onChanged.addListener(async (changes, area) => {
	console.log(`storage.onChanged(${area})`, changes)
	const original = document.querySelector(`div.options-tab`)
	if (original) {
		applyDiff(original, await renderTabUi(urlString))
	}

})

function tabTitle(text: string) {
	return element('div', { className: 'title react-tab-title' }, [
		element('img', { src: 'reactLogo.svg', className: 'react-logo' }),
		element('span', { innerText: text })
	])
}

async function renderTabUi(url: string) {
	displayStatus(`getting settings`)
	const options = await getAllOptions()
	const keys = Object.keys(options) as (keyof Options)[]
	console.log('renderTabUi', options)
	displayStatus(`rendering options tab`)

	return element('div', { className: 'options-tab' }, [
		element('h2', { innerText: `Options` }),
		element('button', { innerText: 'clear' }, undefined, { click: () => clearAllOptions() }),
		element('button', { innerText: 'default' }, undefined, { click: () => setAllOptions(DEFAULT_OPTIONS) }),
		element('div', { className: 'options' },
			keys.map(key => renderOptionUi(options, key, (newValue) => {
				const newOption = { ...options[key], value: newValue }
				console.log('SET', key, { old: options[key], new: newOption })
				setOption(key, newOption)
			})))
	])
}

function renderOptionUi(options: Options, key: string, changed: (newValue: string | boolean) => void) {
	const option = options[key as keyof Options]
	const optionType = typeof option.value

	if (optionType === 'string') return element('div', { className: 'option' }, [
		element('div', {}, [
			element('label', { innerText: option.name, htmlFor: key }),
			element('input', { id: key, type: 'text', value: option.value as string }, undefined, {
				'change': (ev: Event) => changed((ev.target as HTMLInputElement)?.value)
			}),
		]),
		element('p', { innerText: option.desc })
	])

	if (optionType === 'boolean') return element('div', { className: 'option' }, [
		element('div', {}, [
			element('input', { id: key, type: 'checkbox', checked: option.value as boolean }, undefined, {
				'change': (ev: Event) => changed((ev.target as HTMLInputElement)?.checked)
			}),
			element('label', { innerText: option.name, htmlFor: key }),
		]),
		element('p', { innerText: option.desc })
	])

	return element('p', { innerText: `No UI element strategy for ${key} as ${optionType}` })
	//throw new Error(`No UI element strategy for ${key} as ${optionType}`)
}
