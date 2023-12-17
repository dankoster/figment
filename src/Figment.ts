import FigmentOutline from './FigmentOutline.js'
import Trace from './Trace.js'
import { FigmentMenu, MenuItem } from './Menu.js'
import ServiceWorkerApi, { SearchFigmaData, GetFigmaImageLinks } from './serviceWorkerApi.js'
import { RenderTreeNode, getElementPath, getRenderTree } from "./elementFunctions.js"

//This code runs in the context of the page
// - set up hotkeys
// - handle mousemove and clicks
// - show and hide overlays and menus

//get the ID of the browser plugin
export const figmentId = document.head.getElementsByTagName('figment')[0].id 
//console.log('Figment!', figmentId)

const mouseMoveDetectionDelayMs = 50
let mouseMoveDelayTimeout: number | undefined = undefined
let frozenRenderTree: RenderTreeNode[] | undefined = undefined

//we're starting up, so connect to the backend
// and ask for the current state of the settings
ServiceWorkerApi.connect({runtimeId: figmentId, onUnrequestedMessage: handleMessageFromServiceWorker})
ServiceWorkerApi.requestSettings().then(handleMessageFromServiceWorker)

function handleMessageFromServiceWorker(message: any) {
	enableOverlay(message?.settings?.enabled)
}

//hotkey: [alt/option + f] to toggle enabled state
document.addEventListener('keyup', (e) => {
	if(e.altKey && e.code === 'KeyF') {
		ServiceWorkerApi.toggleEnabled()
	}
})

function enableOverlay(enable: boolean) {
	if (enable) {
		document.addEventListener('mousemove', mouseMoved)
	}
	else {
		document.removeEventListener('mousemove', mouseMoved)
		FigmentOutline.removeHighlight()
	}
}

function mouseMoved(e: MouseEvent)  {
	if (mouseMoveDelayTimeout) clearTimeout(mouseMoveDelayTimeout)
	mouseMoveDelayTimeout = setTimeout(() => { 
		handleMouseMoved(e) 

	}, mouseMoveDetectionDelayMs)
}

function handleMouseMoved(e: MouseEvent) {
	const element = e?.target as HTMLElement
	if(element?.localName?.includes("figment-")) return 

	if (element) {
		const renderTree = frozenRenderTree || getRenderTree(element)

		FigmentOutline.highlightElement({
			node: renderTree[0]?.stateNode,
			label: renderTree[0]?.type,
			onClick: (e: MouseEvent) => { onOverlayClick(e, renderTree) }
		})
	} else throw `element is ${element}`
}

function onOverlayClick (e: MouseEvent, renderTree: RenderTreeNode[]) {
	e.preventDefault()
	
	//save this tree so we can keep displaying it until the menu closes
	frozenRenderTree = renderTree

	//create a menu UI from this tree
	let menu = renderMenu({renderTree, figmaData: undefined})
	const target = e.target as HTMLElement
	const x = (target?.parentElement?.offsetLeft ?? 0) + target.offsetLeft + target.offsetWidth
	const y = (target?.parentElement?.offsetTop ?? 0) + target.clientHeight
	menu.Show(x, y)

	//detect when the menu should close
	document.addEventListener('mouseup', onMouseUp, false)

	//TODO: refactor figma stuff

	// let comp = renderTree[0]
	// SearchFigmaData({ name: comp.debugOwnerName, id: comp.figmaId }).then((figmaData) => {
	// 	let menu = renderMenu({renderTree, figmaData})
	// 	menu.Show(e.pageX, e.pageY)
	// 	document.addEventListener('mouseup', onMouseUp, false)
	// })
}

function onMouseUp(e: MouseEvent) {
	const path = getElementPath(e.target)

	if (!path.some(node => node.classList?.contains('menu-keep-open'))) {
		FigmentMenu.RemoveOld()
		frozenRenderTree = undefined
		document.removeEventListener('mouseup', onMouseUp)
	}
}

function renderMenu({renderTree, figmaData}: {renderTree: RenderTreeNode[], figmaData?: any}) : FigmentMenu {
	FigmentMenu.RemoveOld()
	let menu = FigmentMenu.Create({extraClasses: 'menu-keep-open'}) as FigmentMenu

	//let container = menu.AddScrollingContainer({extraClasses: 'react-render-branch', maxHeight: undefined})

	renderTree.forEach((node) => {
		const isDomElement = node.stateNode instanceof HTMLElement
		// const domElement = isDomElement ? node.stateNode : array.slice(0, index).reverse().find(x => x.stateNode instanceof HTMLElement).stateNode
		// const shortFilePath = node.debugSource?.fileName?.substr(node.debugSource.fileName.lastIndexOf('/')+1)
		const item = new MenuItem({ 
			extraClasses: isDomElement ? ['is-dom-element'] : undefined,
			text: node.type, 
			textClass: node.kind,
			textData: node.kind,
			subtext: node.fileName, 
			onTextClick: undefined, //(e) => refreshFigmaNodes({name: node.type, menu}),
			onSubTextClick: () => open(node.vsCodeUrl),
			mouseEnter: ((e: MouseEvent) => FigmentOutline.highlightElement({
				node: node.stateNode,
				label: node.type, 
				onClick: undefined
			}))
		})
		menu.AddItem(item)

		// const span = document.createElement('span')
		// span.innerText = node.kind
		// span.className = node.kind
		// item.AddExpandoItem(span)

		// Object.keys(node.fiber.memoizedProps).forEach(p => {
		// 	const span = document.createElement('span')
		// 	span.innerText = `${p}: ${node.fiber.memoizedProps[p]}`
		// 	item.AddExpandoItem(span)
		// })
	})

	if (figmaData?.recordCount) {
		renderFigmaMenuItems(figmaData, menu)
	}

	return menu
}
