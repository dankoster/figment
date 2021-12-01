
const figmentId = document.head.getElementsByTagName('figment')[0].id //get the ID of the browser plugin
const delayMs = 50

initMouse()

let timeout = null;
let element = null;
let comp = null;
function initMouse() {
	console.log(figmentId, 'init mouse!')

	document.addEventListener('mousemove', e => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			if (comp?.element !== e.path[0]) {				
				let debugTree = e.path
				.map(element => {
					let f = FindReactFiber(element)
					let debugOwner = f?._debugOwner
					let debugOwnerSymbolType = typeof debugOwner?.elementType?.$$typeof === 'symbol' ? Symbol.keyFor(debugOwner?.elementType?.$$typeof) : undefined
					let debugOwnerName = debugOwner?.elementType?.name 
					|| debugOwner?.elementType?.render?.name 

					//walk down the child tree until we find one with a state node
					let child = debugOwner?.child
					let stateNode = child?.stateNode
					while (!stateNode && child) {
						child = child?.child
						stateNode = child?.stateNode
					}

					let figmaId = stateNode?.getAttribute && stateNode.getAttribute('data-figment')

					return {
						element, 
						debugOwner,
						debugOwnerName,
						debugOwnerSymbolType,
						stateNode, 
						figmaId
					}
				})

				let usefulTree = debugTree.filter((e1, index, array) => 
					e1.debugOwnerName //we do have a debug name (the component name)
					&& !e1.debugOwnerSymbolType //this is not a symbolic reference
					&& !array.slice(index + 1).find(e2 => e2.debugOwnerName === e1.debugOwnerName) //there is not another one of these ahead in the list
				)
				
				comp = usefulTree[0]
				if(comp) comp.debugTree = usefulTree

				if (comp?.stateNode && comp?.stateNode?.classList) {
					let component = comp
					highlightElement({
						node: comp.stateNode, 
						label: comp.debugOwnerName, 
						onClick: (e) => handlePseudoClick(e, component)
					})
				}
			}
		}, delayMs);
	});
}

function highlightElement({node, label, onClick}) {

	if(!node || !node.getBoundingClientRect) throw `node ${node} is invalid`

	let overlay = document.querySelector('.figment-outline')
	if(overlay)  document.body.removeChild(overlay)

	overlay = document.createElement('div')
	overlay.className = 'figment-outline'
	document.body.appendChild(overlay)

	if(onClick) overlay.addEventListener('click', onClick)
	overlay.setAttribute('figment', label)

	let rect = node.getBoundingClientRect()
	overlay.style.top = rect.top + 'px' 
	overlay.style.left = rect.left + 'px'
	overlay.style.width = rect.width + 'px'
	overlay.style.height = rect.height + 'px'
}

function handlePseudoClick (e, comp) {
	e.preventDefault(true)
	chrome.runtime.sendMessage(figmentId, { name: comp.debugOwnerName, id: comp.figmaId }, function (figmaData) {
		if (figmaData) {
			renderMenu(comp.debugTree, figmaData)
			showMenu(e.pageX, e.pageY);
			document.addEventListener('mouseup', onMouseUp, false);
		}
	})
}

function onMouseUp(e) {
	hideMenu();
	document.removeEventListener('mouseup', onMouseUp);
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
			figmaId
		} = item

		let li = renderMenuItem({ text: debugOwnerName })
		li.addEventListener("mouseenter", function (e) {
			e.target.classList.add('comp-menu-item-hover')
			highlightElement({
				node: stateNode, 
				label: debugOwnerName
			})
		});
		li.addEventListener("mouseleave", function (e) {
			e.target.classList.remove('comp-menu-item-hover')
			stateNode.classList.remove('figment')
		})
		if (item.debugOwner?._debugSource?.fileName) {
			li.addEventListener('click', function (e) {
				let uri = [
					`vscode://file${item.debugOwner._debugSource.fileName}`,
					item.debugOwner._debugSource.lineNumber,
					item.debugOwner._debugSource.columnNumber
				].join(':')
				open(uri)
			})
		}
		ul.appendChild(li)
	})

	if (figmaData?.recordCount) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		ul.appendChild(sep)

		if (Number.isInteger(figmaData?.recordCount)) {
			let lastModified = new Date(figmaData.lastModified).toLocaleString()
			let info = renderMenuItem({ text: `total frames: ${figmaData?.recordCount}` })
			info.classList.add('menu-info')
			ul.appendChild(info)
		}

		if (figmaData?.lastModified) {
			let lastModified = new Date(figmaData.lastModified).toLocaleString()
			let info = renderMenuItem({ text: `last modified ${lastModified}` })
			info.classList.add('menu-info')
			ul.appendChild(info)
		}

		if (figmaData?.result?.length) {
			figmaData?.result?.forEach(item => {
				let {
					id,
					name,
					link,
					image
				} = item

				let li = renderMenuItem({ text: name, link })
				ul.appendChild(li)
			})
		}
	}

	document.body.appendChild(ul)
	menu = document.querySelector('.figment-menu');
}

function renderMenuItem({text, link, }) {
	let li = document.createElement('li')
	li.className = 'menu-item'

	let span = document.createElement('span')
	span.className = 'menu-text'
	span.textContent = text

	if (link) {
		let a = document.createElement('a')
		a.href = link
		a.target = '_blank'
		a.classList.add('menu-btn')
		li.appendChild(a)
		a.appendChild(span)
	}
	else {
		li.appendChild(span)
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

function hideMenu() {
	menu.classList.remove('menu-show');
}

let styleToInt = (value) => Number.parseInt(value.replaceAll('px', ''))
let getTotal = (style, properties) => properties.reduce((total, property) => total + styleToInt(style[property]), 0)

//https://stackoverflow.com/a/39165137
//https://github.com/Venryx/mobx-devtools-advanced/blob/master/Docs/TreeTraversal.md
function FindReactFiber(dom) {
	const key = Object.keys(dom).find(key => {
		return key.startsWith("__reactFiber$") // react 17+
			|| key.startsWith("__reactInternalInstance$"); // react <17
	});
	return dom[key]
}