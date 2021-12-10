import DebugNode from './DebugNode.js'
import FigmentOutline from './FigmentOutline.js'

// Define the outline element
customElements.define('figment-outline', FigmentOutline);

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
			&& !e.path.some(b => b.className?.includes('figment'))) //is this a figment thing?
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
					highlightElement({
						node: usefulTree[0].stateNode, 
						label: usefulTree[0].debugOwnerName ?? usefulTree[0].element.name, 
						onClick: (e) => { onOverlayClick(e, usefulTree) }
					})
				}
			}
		}, delayMs);
	});
}

function highlightElement({node, label, onClick}) {

	if (node && node.getBoundingClientRect) {

		let overlay = document.querySelector('figment-outline')

		if(!overlay) {
			overlay = document.createElement('figment-outline')
			document.body.appendChild(overlay)
		}

		overlay.setAttribute('data-text', label) //this is the text label for the overlay

		let rect = node.getBoundingClientRect()
		overlay.setLabel({label, onClick})
		overlay.setStyles({
			top: window.scrollY + rect.top + 'px'
			, left: rect.left + 'px'
			, width: rect.width + 'px'
			, height: rect.height + 'px'
		})
	}
}

function onOverlayClick (e, debugTree) {
	e.preventDefault(true)
	let comp = debugTree[0]
	chrome.runtime.sendMessage(figmentId, { name: comp.debugOwnerName, id: comp.figmaId }, function (figmaData) {
		if (figmaData) {
			figmaData.searchTerms = [comp.debugOwnerName.split(/(?=[A-Z])/), comp.figmaId].join(' ')
			renderMenu(debugTree, figmaData)
			showMenu(e.pageX, e.pageY);
			document.addEventListener('mouseup', onMouseUp, false);
		}
	})
}


function onMouseUp(e) {
	if(!e.path[0].classList.contains('menu-keep-open')){
		menu.classList.remove('menu-show');
		document.removeEventListener('mouseup', onMouseUp);
	}
}

function renderMenu(debugTree, figmaData) {
	document.querySelectorAll('.figment-menu').forEach(element => element.remove())
	let ul = document.createElement('ul')
	ul.className = 'figment-menu'

	debugTree.forEach(item => {
		let {
			element, 
			debugOwner,
			debugOwnerName,
			debugOwnerSymbolType,
			stateNode, 
			figmaId,
			fiber
		} = item

		let ds = debugOwner?._debugSource // fiber?._debugSource
		let debugFile = ds?.fileName?.substr(ds?.fileName?.lastIndexOf('/')+1)
		let debugPath = debugFile && [debugFile, ds?.lineNumber, ds?.columnNumber].join(':')
		let sourceUrl = ds && `vscode://file${ds?.fileName}:${ds?.lineNumber}:${ds?.columnNumber}`
		let renderedAtUrl = ds && [
			`vscode://file${ds?.fileName}`,
			ds?.lineNumber,
			ds?.columnNumber
		].join(':')

		let onTextClick = function (e) { 
			console.log(item)
			chrome.runtime.sendMessage(figmentId, { name: debugOwnerName, id: figmaId }, function (figmaData) {
				if (figmaData) {
					figmaData.searchTerms = [debugOwnerName.split(/(?=[A-Z])/), figmaId].join(' ')
					document.querySelectorAll('.menu-btn, .figma-info').forEach(e => e.remove())
					renderFigmaMenuItems(figmaData, ul);
				}
			})
		}

		//todo: make this configurable to support other editors
		let onSubTextClick = function (e) {
			if (item.debugOwner?._debugSource?.fileName) {
				open(sourceUrl)
			}
			else console.log('no subtext click!', e)
		}

		let text = debugOwnerName ?? `${item.fiber.elementType} (${debugOwnerSymbolType})`
		let li = renderMenuItem({ text, subtext: debugPath, onTextClick, onSubTextClick })
		li.addEventListener("mouseenter", function (e) {
			e.target.classList.add('comp-menu-item-hover')
			highlightElement({
				node: stateNode.getBoundingClientRect ? stateNode : element, //the stateNode may not be a DOM element 
				label: debugOwnerName
			})
		});
		li.addEventListener("mouseleave", function (e) {
			e.target.classList.remove('comp-menu-item-hover')
		})




		//TODO: build a "rendered by" tree to display in a sub-menu
		let owner = fiber._debugOwner
		let source = fiber._debugSource
		let renderedBy = []
		while(owner) {


			let li = document.createElement('li')
			li.className = 'menu-item'
			li.innerHTML = `<button type="button" class="menu-btn">
						<span class="menu-text">${owner?.elementType?.name} - ${source?.fileName?.substr(ds?.fileName?.lastIndexOf('/')+1)}</span>
					</button>`

			renderedBy.push(li)

			owner = owner._debugOwner
			source = owner?._debugSource

		}

		if(renderedBy.length > 0){
			let subMenu = document.createElement('ul')
			subMenu.className = 'figment-menu'
			renderedBy.forEach(li => subMenu.appendChild(li))
			li.className = 'menu-item menu-item-submenu'
			li.appendChild(subMenu)
		}

		ul.appendChild(li)
	})

	if (figmaData?.recordCount) {
		renderFigmaMenuItems(figmaData, ul);
	}

	document.body.appendChild(ul)
	menu = document.querySelector('.figment-menu');
}

function renderFigmaMenuItems(figmaData, ul) {
	let sep = document.createElement('li')
	sep.className = 'menu-separator'
	sep.classList.add('figma-info')
	ul.appendChild(sep)

	if (Number.isInteger(figmaData?.recordCount)) {
		let info = renderInfoMenuItem({ text: `total frames: ${figmaData?.recordCount}` })
		info.classList.add('figma-info')
		ul.appendChild(info)
	}

	if (figmaData?.lastModified) {
		let lastModified = new Date(figmaData.lastModified).toLocaleString()
		let info = renderInfoMenuItem({ text: `last modified ${lastModified}` })
		info.classList.add('figma-info')
		ul.appendChild(info)
	}

	if (figmaData?.searchTerms) {
		let info = renderInfoMenuItem({ text: `search terms: ${figmaData?.searchTerms}` })
		info.classList.add('figma-info')
		ul.appendChild(info)
	}

	if (figmaData?.result?.length) {
		let container = document.createElement('div')
		container.className = 'menu-scrolling-container'
		ul.appendChild(container)
		figmaData?.result?.forEach(item => {
			let { id, name, link, image } = item;

			let li = document.createElement('li');
			li.className = 'menu-item';

			let textSpan = document.createElement('span');
			textSpan.className = 'menu-text';
			textSpan.textContent = name;

			let a = document.createElement('a');
			a.href = link;
			a.target = '_blank';
			a.classList.add('menu-btn');
			li.appendChild(a);
			a.appendChild(textSpan);
			container.appendChild(li);
		});
	}
}

function renderInfoMenuItem({text}) {
	let li = document.createElement('li')
	li.classList.add('menu-item')
	li.classList.add('menu-info')

	let textSpan = document.createElement('span')
	textSpan.className = 'menu-text'
	textSpan.textContent = text

	li.appendChild(textSpan)

	return li
}

function renderMenuItem({text, onTextClick, subtext, onSubTextClick}) {
	let li = document.createElement('li')
	li.className = 'menu-item'

	let textSpan = document.createElement('span')
	textSpan.className = 'menu-text'
	textSpan.textContent = text
	
	if(onTextClick) {
		textSpan.classList.add('menu-keep-open')
		textSpan.addEventListener('click', onTextClick)
	}

	li.appendChild(textSpan)

	if(subtext) {
		let subtextSpan = document.createElement('span')
		subtextSpan.className = 'menu-subtext'
		subtextSpan.textContent = subtext
		li.appendChild(subtextSpan)

		if(onSubTextClick) subtextSpan.addEventListener('click', onSubTextClick)
	}

	return li
}

https://codepen.io/ryanmorr/pen/JdOvYR
var menu = document.querySelector('.figment-menu');

function showMenu(x, y) {
	if (menu) {
		let overflowX = x + getTotal(getComputedStyle(menu), ['width']) - window.innerWidth
		if(overflowX > 0) x -= (overflowX + 50)

		menu.style.left = x + 'px';
		menu.style.top = y + 'px';
		menu.classList.add('menu-show');
	}
}

let styleToInt = (value) => Number.parseInt(value.replaceAll('px', ''))
let getTotal = (style, properties) => properties.reduce((total, property) => total + styleToInt(style[property]), 0)