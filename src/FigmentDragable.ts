
import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js';

export default class FigmentDragable extends HTMLElement {

	overlay?: HTMLImageElement
	label?: HTMLSpanElement

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('blocking', 'render')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/dragable.css`)

		// Attach the created elements to the shadow dom
		this.shadowRoot?.appendChild(cssLink)
	}

	show(target: DOMRect, imgSrc: string) {
		this.overlay = document.createElement('img')
		this.overlay.className = 'figment-dragable'
		this.overlay.setAttribute('draggable', "false") //turn off drag/drop
		this.overlay.setAttribute('src', imgSrc)
		this.shadowRoot?.appendChild(this.overlay)

		console.log('setLocation')

		this.setLocation(target)

		//define a handler function here so we can remove it from the event listeners on mouseup
		const overlayRef = this.overlay
		const mouseMoveDetectionDelayMs = 25
		let mouseMoveDelayTimeout: number | undefined = undefined

		function onMouseMove(event: MouseEvent) {

			if (event.altKey) {
				//snap to the element under the mouse (after a delay)
				if (mouseMoveDelayTimeout) 
					clearTimeout(mouseMoveDelayTimeout)

				mouseMoveDelayTimeout = setTimeout(() => {
					const target = document.elementsFromPoint(event.clientX, event.clientY)[1]
					const targetRect = target.getBoundingClientRect();

					//snap smoothly
					if(!overlayRef.classList.contains('with-transition')) 
						overlayRef.classList.add('with-transition')

					overlayRef.style.left = targetRect.left + 'px'
					overlayRef.style.top = targetRect.top + 'px'
					overlayRef.style.width = targetRect.width + 'px'
					overlayRef.style.height = targetRect.height + 'px'
				}, mouseMoveDetectionDelayMs)
			} else {
				//remove css transition or dragging is broken
				if(overlayRef.classList.contains('with-transition')) 
					overlayRef.classList.remove('with-transition')

				//add mouse displacement to object position
				const getContainerStyle = window.getComputedStyle(overlayRef);
				const leftValue = parseInt(getContainerStyle.left);
				const topValue = parseInt(getContainerStyle.top);
				const newLeft = `${leftValue + event.movementX}px`
				const newTop = `${topValue + event.movementY}px`
				console.log(event.movementX, event.movementY, {leftValue, topValue, newLeft, newTop})
				overlayRef.style.left = newLeft;
				overlayRef.style.top = newTop;
			}
		}

		this.overlay.addEventListener("mousedown", () => {
						document.addEventListener("mousemove", onMouseMove);
		});
		document.addEventListener("mouseup", () => {
						document.removeEventListener("mousemove", onMouseMove);
		});
	}

	setLabel({ label, onClick }: { label: string, onClick?: (this: HTMLSpanElement, ev: MouseEvent) => any }) {

		//remove the old label to avoid accumulating event handlers
		this.shadowRoot?.querySelectorAll('.figment-dragable-label').forEach(e => e.remove())

		this.label = document.createElement('span')
		this.label.className = 'figment-dragable-label'
		this.label.textContent = label
		if (onClick) this.label.addEventListener('click', onClick)
		this.overlay?.appendChild(this.label)
	}

	setStyles(styles: { [key in keyof CSSStyleDeclaration]?: any }) {
		if (this.overlay)
			for (const style in styles) {
				this.overlay.style[style] = styles[style]
			}
	}

	setLocation(rect: DOMRect) {
		this.setStyles({
			top: window.scrollY + rect.top + 'px',
			left: rect.left + 'px'
		})
	}
	setSize(rect: DOMRect) {
		this.setStyles({
			width: rect.width + 'px',
			height: rect.height + 'px'
		})
	}

	static removeAll() {
		removeElementsByTagName('figment-dragable')
	}

	static Create() {
		let overlay = document.querySelector('figment-dragable') as FigmentDragable

		if (!overlay) {
			// Define the dragable element
			if (!customElements.get('figment-dragable'))
				customElements.define('figment-dragable', FigmentDragable);

			overlay = document.createElement('figment-dragable') as FigmentDragable
			document.body.appendChild(overlay)
		}

		return overlay
	}
}