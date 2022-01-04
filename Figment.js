import DebugNode from './DebugNode.js'
import FigmentOutline from './FigmentOutline.js'
import { Menu, MenuItem } from './Menu.js'
import { SearchFigmaData, GetFigmaImageLinks } from './BackgroundApi.js'

//get the ID of the browser plugin
export const figmentId = document.head.getElementsByTagName('figment')[0].id 
console.log(figmentId, 'Figment!')

const delayMs = 50
let timeout = null;
let debugTree = null;

document.addEventListener('mousemove', e => {
	if (timeout) clearTimeout(timeout)
	timeout = setTimeout(() => HighlightNodeUnderMouse(e), delayMs);
});

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

		if (usefulTree[0]?.stateNode) {
			FigmentOutline.highlightElement({
				node: usefulTree[0].stateNode,
				label: usefulTree[0].debugOwnerName ?? usefulTree[0].element.name,
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
		Menu.Hide()
		document.removeEventListener('mouseup', onMouseUp);
	}
}

function renderMenu(debugTree, figmaData) {
	Menu.RemoveOld()
	let menu = new Menu({extraClasses: 'menu-keep-open'})

	//menu for the stack of elements under the mouse
	// only get the first one (for now)
	debugTree.slice(0,1).forEach(debugNode => {

		let item = new MenuItem({ 
			text: debugNode.debugOwnerName, 
			subtext: debugNode.renderedByFileName, 
			onTextClick: (e) => refreshFigmaNodes({debugNode, menu}),
			onSubTextClick: (e) => openSourceFileInVsCode({debugNode, e}),
			mouseEnter: (e) => componentMenuItemHover({e, debugNode}),
			mouseLeave: (e) => componentMenuItemHover({e, hovering: false}),
		})

		menu.AddItem(item)
	})

	menu.AddSeparator()
	let container = menu.AddScrollingContainer({extraClasses: 'react-render-branch'})

	debugTree[0].betterRenderTree.forEach(node => {
		let isDomElement = node.stateNode instanceof HTMLElement
		let shortFilePath = node.file?.substr(node.file.lastIndexOf('/')+1)
		let item = new MenuItem({ 
			extraClasses: isDomElement && ['is-dom-element'],
			text: node.type, 
			textClass: node.kind,
			textData: node.kind,
			subtext: shortFilePath, 
			onTextClick: (e) => refreshFigmaNodes({name: node.type, menu}),
			onSubTextClick: node.file && ((e) => openSourceFileInVsCode({file: node.file, e})),
			mouseEnter: isDomElement && ((e) => componentMenuItemHover({e, node: node.stateNode, label: node.debugOwnerType})),
			mouseLeave: isDomElement && ((e) => componentMenuItemHover({e, hovering: false})),
		})
		menu.AddItem(item, container)

		let span = document.createElement('span')
		span.innerText = node.kind
		span.className = node.kind
		item.AddExpandoItem(span)

		Object.keys(node.fiber.memoizedProps).forEach(p => {
			let span = document.createElement('span')
			span.innerText = `${p}: ${node.fiber.memoizedProps[p]}`
			item.AddExpandoItem(span)
		})
	})

	if (figmaData?.recordCount) {
		renderFigmaMenuItems(figmaData, menu);
	}

	return menu;
}

function componentMenuItemHover({ e, node, label, debugNode, hovering = true }) {
	if (hovering) {
		FigmentOutline.highlightElement({
			node: node || (debugNode?.stateNode.getBoundingClientRect ? debugNode.stateNode : debugNode.element),
			label: label || (debugNode?.debugOwnerName)
		})
	}
	else FigmentOutline.removeHighlight()
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
				m.imageSrc = linkById[m.id]
				m.imageHeight = container.offsetTop + 30 //set the height of the image so it's bottom doesnt' overlap the top of the scrolling container
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



function Trace(message) {
	let trace = {}
	Error.captureStackTrace(trace) //in typescript: eval('Error.captureStackTrace(this.trace)')
	let stack = Array.from(trace.stack.normalize().matchAll('(?<=at ).*'), at => at[0])
	let caller = stack[2]
	let callee = stack[1].substring(0, stack[1].indexOf(' '))
	console.groupCollapsed(message || `${caller} --> ${callee}`)
	stack.slice(1).forEach(s => console.log(s))
	console.groupEnd()
	let started = new Date()

	return {
		caller, callee, stack, started,
		elapsed: (message) => {
			let d = new Date(Date.now() - started).toISOString()
			console.log(message || caller, d.substring(d.lastIndexOf('T') + 1, d.length - 1))
		}
	}
}