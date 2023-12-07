import FigmentOutline from './FigmentOutline.js'
import Trace from './Trace.js'
import { FigmentMenu, MenuItem } from './Menu.js'
import ServiceWorkerApi, { SearchFigmaData, GetFigmaImageLinks } from './serviceWorkerApi.js'

import { getElementPath, getRenderTree } from "./elementFunctions.js"

//get the ID of the browser plugin
export const figmentId = document.head.getElementsByTagName('figment')[0].id 
console.log('Figment!', figmentId)

const delayMs = 100
let timeout = null;
let debugTree = null;

//we're starting up, so connect to the backend
// and ask for the current state of the settings
ServiceWorkerApi.connect({runtimeId: figmentId, onUnrequestedMessage: handleMessageFromServiceWorker})
ServiceWorkerApi.requestSettings().then(handleMessageFromServiceWorker)

function handleMessageFromServiceWorker(message) {
	enableOverlay(message?.settings?.enabled)
}

//hotkey: [alt/option + f] to toggle enabled state
document.addEventListener('keyup', (e) => {
	if(e.altKey && e.code === 'KeyF') {
		ServiceWorkerApi.toggleEnabled()
	}
});

function enableOverlay(enable) {
	if (enable) {
		document.addEventListener('mousemove', mouseMoved)
	}
	else {
		document.removeEventListener('mousemove', mouseMoved)
		FigmentOutline.removeHighlight()
	}
}

function mouseMoved(e) {
	if (timeout) clearTimeout(timeout)
	timeout = setTimeout(() => { 
		handleMouseMoved(e) 

	}, delayMs)
}

let frozenTree = undefined;
function handleMouseMoved(e) {

	const element = e?.target;
	if(element?.localName?.includes("figment-")) return 

	console.log('handleMouseMoved', element)

	if (element) {
		const renderTree = frozenTree || getRenderTree(element);

		FigmentOutline.highlightElement({
			node: renderTree[0].stateNode,
			label: renderTree[0]?.type,
			onClick: (e) => { onOverlayClick(e, renderTree) }
		})
	} else throw `element is ${element}`
}

function onOverlayClick (e, renderTree) {
	e.preventDefault(true)
	
	//save this tree so we can keep displaying it until the menu closes
	frozenTree = renderTree

	//create a menu UI from this tree
	let menu = renderMenu({renderTree})
	menu.Show(e.pageX, e.pageY);
	document.addEventListener('mouseup', onMouseUp, false);

	//TODO: refactor figma stuff

	// let comp = renderTree[0]
	// SearchFigmaData({ name: comp.debugOwnerName, id: comp.figmaId }).then((figmaData) => {
	// 	let menu = renderMenu({renderTree, figmaData})
	// 	menu.Show(e.pageX, e.pageY);
	// 	document.addEventListener('mouseup', onMouseUp, false);
	// })
}

function onMouseUp(e) {
	const path = e.path || getElementPath(e.target);

	if (!path.some(node => node.classList?.contains('menu-keep-open'))) {
		FigmentMenu.RemoveOld()
		frozenTree = undefined
		document.removeEventListener('mouseup', onMouseUp);
	}
}

function renderMenu({renderTree, figmaData}) {
	FigmentMenu.RemoveOld()
	let menu = FigmentMenu.Create({extraClasses: 'menu-keep-open'})

	let container = menu.AddScrollingContainer({extraClasses: 'react-render-branch'})

	renderTree.forEach((node, index, array) => {
		const isDomElement = node.stateNode instanceof HTMLElement
		// const domElement = isDomElement ? node.stateNode : array.slice(0, index).reverse().find(x => x.stateNode instanceof HTMLElement).stateNode
		// const shortFilePath = node.debugSource?.fileName?.substr(node.debugSource.fileName.lastIndexOf('/')+1)
		const item = new MenuItem({ 
			extraClasses: isDomElement && ['is-dom-element'],
			text: node.type, 
			textClass: node.kind,
			textData: node.kind,
			subtext: node.fileName, 
			//onTextClick: (e) => refreshFigmaNodes({name: node.type, menu}),
			onSubTextClick: (e) => open(node.vsCodeUrl),
			mouseEnter: ((e) => componentMenuItemHover({e, domNode: node.stateNode, label: node.type})),
		})
		menu.AddItem(item, container)

		const span = document.createElement('span')
		span.innerText = node.kind
		span.className = node.kind
		item.AddExpandoItem(span)

		Object.keys(node.fiber.memoizedProps).forEach(p => {
			const span = document.createElement('span')
			span.innerText = `${p}: ${node.fiber.memoizedProps[p]}`
			item.AddExpandoItem(span)
		})
	})

	if (figmaData?.recordCount) {
		renderFigmaMenuItems(figmaData, menu);
	}

	return menu;
}

function componentMenuItemHover({ domNode, label }) {
	FigmentOutline.highlightElement({
		node: domNode,
		label: label
	})
}

function refreshFigmaNodes({debugNode, name, figmaId, menu}) {
	SearchFigmaData({ name: name || debugNode?.debugOwnerName, id: figmaId || debugNode?.figmaId })
	.then((figmaData) => renderFigmaMenuItems(figmaData, menu))
}

function renderFigmaMenuItems(figmaData, menu) {

	//remove old items
	document.querySelectorAll('.menu-btn, .figma-info').forEach(e => e.remove());
	
	menu.AddSeparator({extraClasses: 'figma-info'})

	if (Number.isInteger(figmaData?.recordCount)) {
		menu.AddItem(new MenuItem({
			text: `total frames: ${figmaData?.recordCount}`,
			extraClasses: ['menu-info', 'figma-info']
		}))
	}

	if (figmaData?.lastModified) {
		let lastModified = new Date(figmaData.lastModified).toLocaleString()
		menu.AddItem(new MenuItem({
			text: `last modified ${lastModified}`,
			extraClasses: ['menu-info', 'figma-info']
		}))
	}

	if (figmaData?.searchTerms) {
		menu.AddItem(new MenuItem({
			text: `search terms: ${figmaData?.searchTerms}`,
			extraClasses: ['menu-info','figma-info']
		}))
	}

	let container = menu.AddScrollingContainer({extraClasses: 'figma-info'})

	//add an array of results
	if (Array.isArray(figmaData?.result) && figmaData?.result?.length) {
		figmaData?.result?.forEach(item => addFigmaItem(item, container))
	}
	//add a single result
	else if(figmaData?.result?.id) {
		addFigmaItem(figmaData.result, container)
	}

	//requet image links for each figma item
	let ids = figmaData?.result?.map(r => r.id)
	if(Array.isArray(ids) && ids.length) {
		let trace = Trace('request image links')
		GetFigmaImageLinks(ids).then(linkById => {
			trace.elapsed('got image links')
			console.log({ linkById })
			//update each search result with it's image url 
			menu.items.forEach(m => {
				if(m.id !== undefined && linkById.hasOwnProperty(m.id)) {
					m.imageSrc = linkById[m.id]
					m.imageHeight = container.offsetTop + 30 //set the height of the image so it's bottom doesnt' overlap the top of the scrolling container
				}
				else {
					console.warn(`linkById does not have property m.id which is ${m.id}`, {m})
				}
			})
		}).catch(e => {
			console.warn(e)
		}).finally(() => {
			trace.elapsed('done processing images')
		})
	}

	function addFigmaItem(item, container) {
		let { id, name, link, imageSrc } = item
		menu.AddItem(new MenuItem({
			id,
			text: name,
			href: link,
		}), container)
	}
}