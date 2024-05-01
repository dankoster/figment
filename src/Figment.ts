import { handleExtensionEvent, searchFigmaData, setToolbarEnabledState } from './Bifrost.js'
import FigmentDragable from './FigmentDragable.js'
import FigmentOutline from './FigmentOutline.js'
import { FigmentMenu, MenuItem } from './Menu.js'
import { RenderTreeNode, getElementPath, getReactRenderTree } from "./elementFunctions.js"

//This code runs in the context of the page
// - set up hotkeys
// - handle mousemove and clicks
// - show and hide overlays and menus

//get the ID of the browser plugin (added by contentscript.js when the plugin is initialized for the page)
export const figmentId = document.head.getElementsByTagName('figment')[0].id

const mouseMoveDetectionDelayMs = 50
let mouseMoveDelayTimeout: number | undefined = undefined
let frozenRenderTree: RenderTreeNode[] | undefined = undefined
let menu: FigmentMenu | undefined = undefined
let outline: FigmentOutline | undefined = undefined
let dragable: FigmentDragable | undefined = undefined
let enabled = false;

//handle events from the service worker
handleExtensionEvent("toggle_enabled", toggleEnabled)
handleExtensionEvent("overlay_image", handleOverlayImageEvent)
handleExtensionEvent("start_drag_from_side_panel", handleDragFromSidePanel)

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
		document.addEventListener('mousemove', mouseMoved)

		//create the menu and outline elements to get the CSS pre-loaded before we need it
		// (this avoids a race condition later when using them for the first time, 
		// which would cause the css to be loaded too late for that first use)
		menu = FigmentMenu.Create({ extraClasses: 'menu-keep-open' }) as FigmentMenu
		outline = FigmentOutline.Create()
		dragable = FigmentDragable.Create()
	}
	else {
		document.removeEventListener('mousemove', mouseMoved)
		FigmentOutline.removeHighlight()
		FigmentMenu.removeMenu()
	}

	setToolbarEnabledState(figmentId, enable)
}

function mouseMoved(e: MouseEvent) {
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



	// menu.AddItem(new MenuItem({
	// 	text: 'submenu test',
	// 	subItems: [
	// 		new MenuItem({
	// 			text: 'item A'
	// 		}),
	// 		new MenuItem({
	// 			text: 'item B'
	// 		}),
	// 		new MenuItem({
	// 			text: 'item C'
	// 		}),
	// 	]
	// }))

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
				onClick: undefined //no action for clicking the element/component name in the menu
			}))
		})
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

	menu.ShowFor(e.target as HTMLElement)

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
