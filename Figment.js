import DebugNode from './DebugNode.js'
import FigmentOutline from './FigmentOutline.js'
import Trace from './Trace.js'
import { FigmentMenu, MenuItem } from './Menu.js'
import Backend, { SearchFigmaData, GetFigmaImageLinks } from './serviceWorkerApi.js'

//get the ID of the browser plugin
export const figmentId = document.head.getElementsByTagName('figment')[0].id 
console.log('Figment!', figmentId)

const delayMs = 100
let timeout = null;
let debugTree = null;

//we're starting up, so connect to the backend
// and ask for the current state of the settings
Backend.connect(handleBackgroundMessage).requestSettings()

//hotkey: [alt/option + f] to toggle enabled state
document.addEventListener('keyup', (e) => {
	if(e.altKey && e.code === 'KeyF') {
		Backend.toggleEnabled()
	}
});

function handleBackgroundMessage(message) {
	if (message?.settings?.enabled) {
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
		HighlightNodeUnderMouse(e) 

	}, delayMs)
}

function HighlightNodeUnderMouse(e) {
	if (!Array.isArray(debugTree)
		|| debugTree[0]?.element !== e.path[0] //are we already on this thing?
		&& !e.path.some(b => b.className?.includes && b.className?.includes('figment'))) //is this a figment thing?
	{
		debugTree = e.path.map(element => new DebugNode(element))

		let usefulTree = debugTree
			.filter((e1, index, array) =>
				e1.debugOwnerName //we do have a debug name (the component name)
				&& e1.fiber
				&& !array.slice(index + 1).find(e2 => e2.debugOwnerName === e1.debugOwnerName
					&& e2.debugOwner?._debugSource?.fileName === e1.debugOwner?._debugSource?.fileName
					&& e2.debugOwner?._debugSource?.lineNumber === e1.debugOwner?._debugSource?.lineNumber) //there is not another one of these ahead in the list
			)

		//show the overlay for the first element that has a react statenode
		let firstStateNodeIndex = usefulTree.findIndex(node => node.stateNode)
		if (firstStateNodeIndex >= 0 && firstStateNodeIndex < usefulTree.length) {
			FigmentOutline.highlightElement({
				node: usefulTree[firstStateNodeIndex].stateNode,
				label: usefulTree[firstStateNodeIndex].debugOwnerName ?? usefulTree[firstStateNodeIndex].element.name,
				onClick: (e) => { onOverlayClick(e, usefulTree) }
			})
		}
	}
}

function onOverlayClick (e, debugTree) {
	e.preventDefault(true)
	let comp = debugTree[0]
	SearchFigmaData({ name: comp.debugOwnerName, id: comp.figmaId }).then((figmaData) => {
		let menu = renderMenu(debugTree, figmaData)
		menu.Show(e.pageX, e.pageY);
		document.addEventListener('mouseup', onMouseUp, false);
	})
}

function onMouseUp(e) {
	if (!e.path.some(node => node.classList?.contains('menu-keep-open'))) {
		FigmentMenu.RemoveOld()
		document.removeEventListener('mouseup', onMouseUp);
	}
}

function renderMenu(debugTree, figmaData) {
	FigmentMenu.RemoveOld()
	let menu = FigmentMenu.Create({extraClasses: 'menu-keep-open'})

	//menu for the stack of elements under the mouse
	// only get the first one (for now)
	debugTree.slice(0,1).forEach(debugNode => {

		let item = new MenuItem({ 
			text: debugNode.debugOwnerName, 
			subtext: debugNode.renderedByFileName, 
			onTextClick: (e) => refreshFigmaNodes({debugNode, menu}),
			onSubTextClick: (e) => openSourceFileInVsCode({debugNode, e}),
			mouseEnter: (e) => componentMenuItemHover({e, debugNode}),
		})

		menu.AddItem(item)
	})

	menu.AddSeparator()
	let container = menu.AddScrollingContainer({extraClasses: 'react-render-branch'})

	debugTree[0].betterRenderTree.forEach((node, index, array) => {
		const isDomElement = node.stateNode instanceof HTMLElement
		const domElement = isDomElement ? node.stateNode : array.slice(0, index).reverse().find(x => x.stateNode instanceof HTMLElement).stateNode
		const shortFilePath = node.file?.substr(node.file.lastIndexOf('/')+1)
		const item = new MenuItem({ 
			extraClasses: isDomElement && ['is-dom-element'],
			text: node.type, 
			textClass: node.kind,
			textData: node.kind,
			subtext: shortFilePath, 
			onTextClick: (e) => refreshFigmaNodes({name: node.type, menu}),
			onSubTextClick: node.file && ((e) => openSourceFileInVsCode({file: node.file, e})),
			mouseEnter: ((e) => componentMenuItemHover({e, domNode: domElement, label: node.debugOwnerType})),
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

function componentMenuItemHover({ e, domNode, label, debugNode }) {
	FigmentOutline.highlightElement({
		node: domNode || (debugNode?.stateNode?.getBoundingClientRect ? debugNode.stateNode : debugNode.element),
		label: label || (debugNode?.debugOwnerName)
	})
}

function openSourceFileInVsCode({file, debugNode, e}) {
	//todo: make this configurable to support other editors
	//todo: don't close the menu
	if (file) open(`vscode://file${file}`)
	else if(debugNode) open(debugNode?.renderedByVsCodeLink)
	else throw `can't open file`
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
			//update each search result with it's image url 
			menu.items.forEach(m => {
				if(m.id !== undefined) {
					m.imageSrc = linkById[m.id]
					m.imageHeight = container.offsetTop + 30 //set the height of the image so it's bottom doesnt' overlap the top of the scrolling container
				}
			})
			trace.elapsed('got image links')
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