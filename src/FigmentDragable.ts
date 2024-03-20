
import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js';

export default class FigmentDragable extends HTMLElement {

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
		const div = document.createElement('div')
		div.className = 'figment-dragable'
		this.shadowRoot?.appendChild(div)

		const img = this.image(imgSrc)
		div.appendChild(img)
		div.appendChild(this.label({ textContent: 'remove', onClick: () => div.remove() }))
		div.appendChild(this.range({ onchange: (value) => this.setStyles(img, {opacity: Number.parseInt(value)/100}) }))

		this.setLocation(div, target)

		//define a handler function here so we can remove it from the event listeners on mouseup
		const overlayRef = div
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
					if (!overlayRef.classList.contains('with-transition'))
						overlayRef.classList.add('with-transition')

					overlayRef.style.left = targetRect.left + 'px'
					overlayRef.style.top = targetRect.top + 'px'
					overlayRef.style.width = targetRect.width + 'px'
					overlayRef.style.height = targetRect.height + 'px'
				}, mouseMoveDetectionDelayMs)
			} else {
				//remove css transition or dragging is broken
				if (overlayRef.classList.contains('with-transition'))
					overlayRef.classList.remove('with-transition')

				//add mouse displacement to object position
				const getContainerStyle = window.getComputedStyle(overlayRef);
				const leftValue = parseInt(getContainerStyle.left);
				const topValue = parseInt(getContainerStyle.top);
				const newLeft = `${leftValue + event.movementX}px`
				const newTop = `${topValue + event.movementY}px`
				overlayRef.style.left = newLeft;
				overlayRef.style.top = newTop;
			}
		}

		div.addEventListener("mousedown", () => {
			document.addEventListener("mousemove", onMouseMove);
		});
		document.addEventListener("mouseup", () => {
			document.removeEventListener("mousemove", onMouseMove);
		});
	}

	private image(imgSrc: string) {
		const img = document.createElement('img');
		img.setAttribute('src', imgSrc);
		img.setAttribute('draggable', "false"); //turn off drag/drop
		return img;
	}

	private range({ onchange }: { onchange: (value: string) => void }) {
		const range = document.createElement('input')
		range.setAttribute('type', 'range')
		range.setAttribute('min', '0')
		range.setAttribute('max', '100')
		range.setAttribute('value', '50')
		range.onchange = (ev) => {
			ev.preventDefault()
			onchange(range.value)
		}
		return range
	}

	private label({ textContent, onClick }: { textContent: string, onClick?: (this: HTMLSpanElement, ev: MouseEvent) => any }) {

		const span = document.createElement('span')
		span.className = 'figment-dragable-label'
		span.textContent = textContent
		if (onClick) span.addEventListener('click', onClick)
		return span
	}

	setStyles(element: HTMLElement, styles: { [key in keyof CSSStyleDeclaration]?: any }) {
		for (const style in styles) {
			element.style[style] = styles[style]
		}
	}

	setLocation(element: HTMLElement, rect: DOMRect) {
		this.setStyles(element, {
			top: window.scrollY + rect.top + 'px',
			left: rect.left + 'px'
		})
	}
	setSize(element: HTMLElement, rect: DOMRect) {
		this.setStyles(element, {
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