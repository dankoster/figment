
const figmentId = document.head.getElementsByTagName('figment')[0].id

initMouse()

let timeout = null;
let element = null;
let comp = null;
function initMouse() {
	console.log(figmentId, 'init mouse!')
	var style = document.createElement('style');
	style.innerHTML = `
	.figment {
		border: 1px solid #ff000099;
		position: relative;
	}
	  .figment::before {
		content: attr(figment);
		position: absolute;
		right: 0;
		top: 0;
		background: #ff0000eb;
		padding-left: 5px;
		padding-right: 5px;
		border-bottom-left-radius: 5px;
		font-size: 13px;
		z-index: 1;
		color: #ffffff
	}`
	document.head.appendChild(style)

	document.addEventListener('mousemove', e => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			if (comp?.element !== e.path[0]) {
				if (comp?.node) {
					comp.node.classList.remove('figment')
					comp.node.removeAttribute('figment')
					comp.node.removeEventListener('click', handlePseudoClick)
				}
				
				element = e.path[0]
				let fiber = FindReactFiber(element, 0)
				
				//walk up the tree until we get a named component
				while(fiber && !fiber?._debugOwner?.elementType?.name) {
					fiber = fiber?._debugOwner
				}

				comp = {
					element,
					node: fiber?._debugOwner?.child?.stateNode,
					name: fiber?._debugOwner?.elementType?.name, 
					file: fiber?._debugSource?.fileName
				}

				if (comp?.node) {
					comp.node.classList.add('figment')
					comp.node.setAttribute('figment', comp.name)
					comp.node.addEventListener('click', handlePseudoClick)
				}
			}
		}, 250);
	});
}

function handlePseudoClick (e) {
	let style = getComputedStyle(comp.node, ':before')
	let left = styleToInt(style.left)
	let top = styleToInt(style.right)
	let height = getTotal(style, ['height', 'borderWidth', 'paddingTop', 'paddingBottom'])
	let width = getTotal(style, ['width', 'borderWidth', 'paddingLeft', 'paddingRight'])

	let clickedOnPseudoElement = (
		e.offsetX >= left && e.offsetX <= (left + width) &&
		e.offsetY >= top && e.offsetY <= (top + height)
	)

	if(clickedOnPseudoElement) {
		e.preventDefault(true)
		console.log({component: comp.name, file: comp.file})
		//chrome.runtime.sendMessage(figmentId, {name: comp.name, file: comp.file})
	}
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