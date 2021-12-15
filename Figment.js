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

//https://codepen.io/ryanmorr/pen/JdOvYR
class Menu {
	constructor() {
		this.ul = document.createElement('ul')
		this.ul.className = 'figment-menu'
		this.items = []
	}

	static Hide() { Menu.Current?.classList.remove('menu-show') }

	static get Current() { return document.querySelector('.figment-menu') }

	static RemoveOld () {
		//remove old menu(s)
		document.querySelectorAll('.figment-menu').forEach(element => element.remove())
	}

	Show(x, y) {
		if (this.ul) {
			let overflowX = x + getTotal(getComputedStyle(this.ul), ['width']) - window.innerWidth
			if (overflowX > 0) x -= (overflowX + 50)

			this.ul.style.left = x + 'px';
			this.ul.style.top = y + 'px';
			this.ul.classList.add('menu-show');
		}
	}

	AddItem(item, container) {
		this.items.push(item)
		if (container) container.appendChild(item.li);
		else this.ul.appendChild(item.li)
	}

	AddSeparator() {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		sep.classList.add('figma-info')
		this.ul.appendChild(sep)
	}

	AddScrollingContainer() {
		let container = document.createElement('div');
		container.className = 'menu-scrolling-container';
		this.ul.appendChild(container);
		return container;
	}
	
}

class MenuItem {
	constructor({text, onTextClick, subtext, href, extraClasses, onSubTextClick, mouseEnter, mouseLeave}) {
		this.li = document.createElement('li')
		this.li.classList.add('menu-item')
		Array.isArray(extraClasses) && extraClasses.forEach(c => this.li.classList.add(c))
		
		let textSpan = document.createElement('span')
		textSpan.className = 'menu-text'
		textSpan.textContent = text
		
		if(onTextClick) {
			textSpan.classList.add('menu-keep-open')
			textSpan.addEventListener('click', onTextClick)
		}

		if(href) {
			let a = document.createElement('a');
			a.href = href;
			a.target = '_blank';
			a.classList.add('menu-btn');
			this.li.appendChild(a);
			a.appendChild(textSpan);
		}
		else 
			this.li.appendChild(textSpan)
		
		if(mouseEnter) this.li.addEventListener("mouseenter", mouseEnter)
		if(mouseLeave) this.li.addEventListener("mouseleave", mouseLeave)
		
		if(subtext) {
			let subtextSpan = document.createElement('span')
			subtextSpan.className = 'menu-subtext'
			subtextSpan.textContent = subtext
			this.li.appendChild(subtextSpan)
	
			if(onSubTextClick) subtextSpan.addEventListener('click', onSubTextClick)
		}
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
		let renderedBy = []
		debugNode.renderTree.forEach(({name, file}) => {
			let li = document.createElement('li')
			li.className = 'menu-item'
			li.innerHTML = `<button type="button" class="menu-btn">
						<span class="menu-text">${name} - ${file?.substr(file.lastIndexOf('/')+1)}</span>
					</button>`
			renderedBy.push(li)
		})

		if(renderedBy.length > 0){
			let subMenu = document.createElement('ul')
			subMenu.className = 'figment-menu'
			renderedBy.forEach(li => subMenu.appendChild(li))
			item.li.className = 'menu-item menu-item-submenu'
			item.li.appendChild(subMenu)
		}
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
		highlightElement({
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
	chrome.runtime.sendMessage(figmentId, { name: debugNode.debugOwnerName, id: debugNode.figmaId }, function (figmaData) {
		if (figmaData) {
			figmaData.searchTerms = [debugNode.debugOwnerName.split(/(?=[A-Z])/), debugNode.figmaId].join(' ');
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

	if (figmaData?.result?.length) {
		let container = menu.AddScrollingContainer();
		figmaData?.result?.forEach(item => {
			let { id, name, link, image } = item;
			menu.AddItem(new MenuItem({ 
				text: name, 
				href: link
			}), container)
		});
	}
}

let styleToInt = (value) => Number.parseInt(value.replaceAll('px', ''))
let getTotal = (style, properties) => properties.reduce((total, property) => total + styleToInt(style[property]), 0)