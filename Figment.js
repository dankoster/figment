import DebugNode from './DebugNode.js'
import FigmentOutline from './FigmentOutline.js'
import { Menu, MenuItem } from './Menu.js'

//get the ID of the browser plugin
export const figmentId = document.head.getElementsByTagName('figment')[0].id 

const delayMs = 50

initFigma()

let timeout = null;
let debugTree = null;

function initFigma() {
	console.log(figmentId, 'Figment!')

	document.addEventListener('mousemove', e => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			if (!Array.isArray(debugTree) 
			|| debugTree[0]?.element !== e.path[0] //are we already on this thing?
			&& !e.path.some(b => b.className?.includes && b.className?.includes('figment'))) //is this a figment thing?
			{
				debugTree = e.path.map(element => new DebugNode(element))

				let usefulTree = debugTree
				.filter((e1, index, array) => 
					//e1.debugOwner
					e1.debugOwnerName //we do have a debug name (the component name)
					//&& !e1.debugOwnerSymbolType //this is not a symbolic reference
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
		}, delayMs);
	});
}

function SearchFigmaData({ name, id }) {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(figmentId, { search : {name, id} }, function (response) { 
			resolve(response) 
		})
	})
}

function onOverlayClick (e, debugTree) {
	e.preventDefault(true)
	let comp = debugTree[0]
	SearchFigmaData({ name: comp.debugOwnerName, id: comp.figmaId }).then((figmaData) => {
		if (figmaData) {
			let menu = renderMenu(debugTree, figmaData)
			menu.Show(e.pageX, e.pageY);
			document.addEventListener('mouseup', onMouseUp, false);
		}
	})
}

function onMouseUp(e) {
	if(!e.path[0].classList.contains('menu-keep-open')){
		Menu.Hide()
		document.removeEventListener('mouseup', onMouseUp);
	}
}

function renderMenu(debugTree, figmaData) {
	Menu.RemoveOld()
	let menu = new Menu()

	debugTree.forEach(debugNode => {

		let item = new MenuItem({ 
			text: debugNode.debugOwnerName ?? `${debugNode.fiber.elementType} (${debugNode.debugOwnerSymbolType})`, 
			subtext: debugNode.renderedByFileName, 
			onTextClick: (e) => refreshFigmaNodes(debugNode, menu),
			onSubTextClick: (e) => openSourceFileInVsCode(debugNode, e),
			mouseEnter: (e) => componentMenuItemHover({e, debugNode}),
			mouseLeave: (e) => componentMenuItemHover({e, hovering: false}),
		})

		menu.AddItem(item)

		//display a "rendered by" tree in a sub-menu
		// TODO: add styling like menu-btn
		// TODO: only popup submenu when hovering over right end of parent
		// debugNode.renderTree.forEach(({name, file}) => {
		// 	item.AddSubMenuItem(new MenuItem({
		// 		text: name,
		// 		subtext: file?.substr(file.lastIndexOf('/')+1),
		// 		onTextClick: (e) => file && open(`vscode://file${file}`),
		// 		onSubTextClick: (e) => file && open(`vscode://file${file}`)
		// 	}))
		// })
	})

	if (figmaData?.recordCount) {
		renderFigmaMenuItems(figmaData, menu);
	}

	document.body.appendChild(menu.ul)
	return menu;
}

function componentMenuItemHover({ e, debugNode, hovering = true }) {
	if (hovering) {
		e.target.classList.add('comp-menu-item-hover')
		FigmentOutline.highlightElement({
			node: debugNode.stateNode.getBoundingClientRect ? debugNode.stateNode : debugNode.element,
			label: debugNode.debugOwnerName
		})
	}
	else {
		e.target.classList.remove('comp-menu-item-hover')
	}
}

function openSourceFileInVsCode(debugNode, e) {
	//todo: make this configurable to support other editors
	open(debugNode.renderedByVsCodeLink);
}

function refreshFigmaNodes(debugNode, menu) {
	SearchFigmaData({ name: debugNode.debugOwnerName, id: debugNode.figmaId }).then((figmaData) => {
		if (figmaData) {
			document.querySelectorAll('.menu-btn, .figma-info').forEach(e => e.remove());
			renderFigmaMenuItems(figmaData, menu);
		}
	})
}

function renderFigmaMenuItems(figmaData, menu) {

	menu.AddSeparator()

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

	//add an array of results
	if (Array.isArray(figmaData?.result) && figmaData?.result?.length) {
		let container = menu.AddScrollingContainer()
		figmaData?.result?.forEach(item => addFigmaItem(item, container))
	}
	//add a single result
	else if(figmaData?.result?.id) {
		addFigmaItem(figmaData.result)
	}

	function addFigmaItem(item, container) {
		let { id, name, link, image } = item
		menu.AddItem(new MenuItem({
			text: name,
			href: link
		}), container)
	}
}