import { handleExtensionEvent, toggleSidePanel, setToolbarEnabledState, updateReactComponentsInSidebar, getOptions } from './Bifrost.js'
import FigmentDragable from './FigmentDragable.js'
import FigmentOutline from './FigmentOutline.js'
import { FigmentMenu, MenuItem } from './Menu.js'
import { RenderTreeNode, getElementPath, getReactRenderTree, findReactComponents } from "./elementFunctions.js"
import { element } from './html.js'
import { Options } from './options.js'

//This code runs in the context of the page
// - set up hotkeys
// - handle mousemove and clicks
// - show and hide overlays and menus

//get the ID of the browser plugin (added by contentscript.js when the plugin is initialized for the page)
export const figmentId = document.head.getElementsByTagName('figment')[0].id

const mouseMoveDetectionDelayMs = 50
let mouseMoveDelayTimeout: number | undefined
let frozenRenderTree: RenderTreeNode[] | undefined
let menu: FigmentMenu | undefined
let outline: FigmentOutline | undefined
let dragable: FigmentDragable | undefined
let options: Options | undefined
let enabled = false

//handle events from the service worker
handleExtensionEvent("toggle_enabled", toggleEnabled)
handleExtensionEvent("overlay_image", handleOverlayImageEvent)
handleExtensionEvent("start_drag_from_side_panel", handleDragFromSidePanel)
handleExtensionEvent("request_updated_react_data", sendPageComponentsToSidebar)
handleExtensionEvent('highlight_selector', highlightSelector)
//handleExtensionEvent('clear_selector', clearSelector)
handleExtensionEvent('got_options', gotOptions)

getOptions(figmentId)

// When the dom changes, we want to be alerted so we can update the react sidebar
//TODO: only enable the observer when the sidebar is active!
const observer = new MutationObserver((mutationList, observer) => sendPageComponentsToSidebar())
observer.observe(document, { attributes: false, childList: true, subtree: true });

function highlightSelector({ detail: selector }: CustomEventInit) {
	const element = document.querySelector(selector) as HTMLElement
	if (element) {
		element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
		//element.classList.add('figment-highlight')
		FigmentOutline.highlightElement({
			node: element,
			label: '',
			onClick: undefined //no action for clicking the element/component name in the menu
		})
	}
}

function gotOptions({ detail }: CustomEventInit) {
	options = JSON.parse(detail)
}

function clearSelector({ detail: selector }: CustomEventInit) {
	console.log('clearSelector', selector)
	//const element = document.querySelector(selector)
	//element.classList.remove('figment-highlight')
	//FigmentOutline.removeHighlight()
}

function sendPageComponentsToSidebar() {
	const components = findReactComponents(document.getElementById('root'))
	updateReactComponentsInSidebar(figmentId, components)
}

function toggleEnabled() {
	enabled = !enabled
	enableOverlay(enabled)
}

function handleOverlayImageEvent(e: CustomEventInit) {
	ShowDragableImage(e.detail)
}

function ShowDragableImage(imgSrc: any, x: number = 100, y: number = 100) {
	if (!dragable) dragable = FigmentDragable.Create()
	dragable?.show(new DOMRect(x, y, 300), imgSrc)
}

function handleDragFromSidePanel(e: CustomEventInit) {

	//https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList#javascript

	document.ondragover = (ev: DragEvent) => {
		ev.preventDefault();
		if (ev.dataTransfer)
			ev.dataTransfer.dropEffect = "copy"
	}

	document.ondrop = (ev: DragEvent) => {
		ev.preventDefault();
		const data = ev.dataTransfer?.items;
		if (!data) throw new Error('no data in drop')
		for (let i = 0; i < data.length; i++) {
			if (
				data[i].kind === "string" &&
				data[i].type.match("^text/uri-list")
			) {
				// Drag data item is URI
				data[i].getAsString((s) => ShowDragableImage(s, ev.clientX - 150, ev.clientY - 100))
			}
		}
	}
}

function enableOverlay(enable: boolean) {
	if (enable) {
		document.addEventListener('mousemove', document_mouseMoved)

		//create the menu and outline elements to get the CSS pre-loaded before we need it
		// (this avoids a race condition later when using them for the first time, 
		// which would cause the css to be loaded too late for that first use)
		menu = FigmentMenu.Create({ extraClasses: 'menu-keep-open' }) as FigmentMenu
		outline = FigmentOutline.Create()
		dragable = FigmentDragable.Create()
	}
	else {
		document.removeEventListener('mousemove', document_mouseMoved)
		FigmentOutline.removeHighlight()
		FigmentMenu.removeMenu()
	}

	setToolbarEnabledState(figmentId, enable)
}

function document_mouseMoved(e: MouseEvent) {
	if (mouseMoveDelayTimeout) clearTimeout(mouseMoveDelayTimeout)
	mouseMoveDelayTimeout = setTimeout(() => {
		handleMouseMoved(e)
	}, mouseMoveDetectionDelayMs)
}

function handleMouseMoved(e: MouseEvent) {
	const element = e?.target as HTMLElement
	if (element?.localName?.includes("figment-")) return //ignore this element

	if (element) {
		const renderTree = frozenRenderTree || getReactRenderTree(element)

		FigmentOutline.highlightElement({
			node: renderTree[0]?.stateNode,
			label: renderTree[0]?.type,
			onClick: (e: MouseEvent) => { onOverlayClick(e, renderTree) }
		})
	} else throw new Error(`element is ${element}`)
}

function onOverlayClick(e: MouseEvent, renderTree: RenderTreeNode[]) {
	e.preventDefault()

	//save this tree so we can keep displaying it until the menu closes
	frozenRenderTree = renderTree

	if (menu) menu.Clear()
	else menu = FigmentMenu.Create({ extraClasses: 'menu-keep-open' }) as FigmentMenu

	//create a menu UI from this tree
	renderTree.forEach(node => {
		const isDomElement = node.kind === 'HostComponent'
		const item = new MenuItem({
			extraClasses: ['is-dom-element'],
			// extraClasses: isDomElement ? ['is-dom-element'] : undefined,
			text: node.type,
			textClass: node.kind,
			textData: node.kind,
			subtext: node.fileName,
			onSubTextClick: () => open(node.vsCodeUrl),
			mouseEnter: ((e: MouseEvent) => FigmentOutline.highlightElement({
				node: node.stateNode,
				label: node.type,
			}))
		})

		//make a submenu for the props
		if (options?.propsSubmenu.value) {
			for (const prop in node.fiber.memoizedProps) {
				if (prop !== 'children') {
					let subtext = ''
					switch (typeof node.fiber.memoizedProps[prop]) {
						case 'symbol':
							subtext = node.fiber.memoizedProps[prop].toString()
							break
						case 'object':
							try {
								subtext = JSON.stringify(node.fiber.memoizedProps[prop])
							} catch (err) {
								subtext = err as string
							}
							break
						default:
							subtext = `${node.fiber.memoizedProps[prop]}`
							break
					}
					item.AddSubItem(new MenuItem({
						text: `${prop}:`,
						subtext,
						onSubTextClick: () => navigator.clipboard.writeText(subtext),
						onSubTextMouseDown: (ev: MouseEvent) => (ev.target as HTMLSpanElement).textContent = `✂︎ ${subtext}`,
						onSubTextMouseUp: (ev: MouseEvent) => (ev.target as HTMLSpanElement).textContent = subtext
					}))
				}
			}
		}

		// if(!isDomElement) {
		// 	item.AddSubItem(new MenuItem({
		// 		text: "Find in Figma",
		// 		onTextClick: () => {
		// 			searchFigmaData(figmentId, node.type)
		// 			menu?.Clear() //close the menu
		// 		}
		// 	}))
		// }

		menu?.AddItem(item)
	})

	// const search_onKeyDown = (ev: KeyboardEvent) => {
	// 	console.log((ev.target as HTMLInputElement)?.value + (ev.key.length === 1 ? ev.key : ''))
	// }

	const extensionOptions = element('div', { className: 'figment-extension-options' }, [
		element('button', { textContent: '🛑' }, undefined, { click: () => toggleEnabled() })
		, element('button', { textContent: '⇥' }, undefined, { click: () => toggleSidePanel(figmentId) })
		// , element('button', { textContent: '✅' }, undefined, { click: () => getOptions(figmentId) })
		// , element('input', { type: 'text', placeholder: 'search' }, undefined, { keydown: search_onKeyDown })
	])

	menu.ShowFor(e.target as HTMLElement, extensionOptions)

	//detect when the menu should close
	document.addEventListener('mouseup', onMouseUp, false)
}

function onMouseUp(e: MouseEvent) {
	if (menu) {
		const path = getElementPath(e.target)

		//don't close the menu when clicking on it
		if (!path.some(node => node.classList?.contains('menu-keep-open'))) {
			menu.Clear()
			frozenRenderTree = undefined
			document.removeEventListener('mouseup', onMouseUp)
		}
	}
}
