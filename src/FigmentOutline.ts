import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js';

export default class FigmentOutline extends HTMLElement {

	overlay: HTMLDivElement
	label?: HTMLSpanElement
	target?: HTMLElement

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		this.overlay = document.createElement('div')
		this.overlay.className = 'figment-outline'

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)

		// Attach the created elements to the shadow dom
		this.shadowRoot?.appendChild(cssLink)
		this.shadowRoot?.appendChild(this.overlay)

		//watch for changes to the size of the document and move the outline to
		// match the resulting changes to the position of our target element
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (this.target) {
					this.overlay.classList.add('no-transition')
					this.setLocation(this.target.getBoundingClientRect())
					this.overlay.classList.remove('no-transition')
				}	
			}
		});

		resizeObserver.observe(document.body);
	}

	setLabel({ label, onClick }: { label: string, onClick?: (this: HTMLSpanElement, ev: MouseEvent) => any }) {

		//remove the old label to avoid accumulating event handlers
		this.shadowRoot?.querySelectorAll('.figment-outline-label').forEach(e => e.remove())

		this.label = document.createElement('span')
		this.label.className = 'figment-outline-label'
		this.label.textContent = label
		if (onClick) this.label.addEventListener('click', onClick)
		this.overlay.appendChild(this.label)
	}

	setStyles(styles: { [key in keyof CSSStyleDeclaration]?: any }) {
		for (const style in styles) {
			this.overlay.style[style] = styles[style]
		}
	}

	setLocation(rect: DOMRect) {
		const bodyRect = document.body.getBoundingClientRect()
		this.setStyles({
			top: window.scrollY + rect.top + 'px'
			, left: rect.left + 'px'
			, width: rect.right < bodyRect.right ? (rect.width + 'px') : (bodyRect.right - rect.left + 'px')
			, height: rect.bottom < bodyRect.bottom ? (rect.height + 'px') : (bodyRect.bottom - rect.top + 'px')
		})
	}

	trackNode(node: HTMLElement) {
		if (!node.getBoundingClientRect) throw new Error(`missing 'getBoundingClientRect' on node ${(node as any)?.__proto__?.constructor?.name ?? node}`)

		this.target = node
		this.setLocation(node.getBoundingClientRect())
	}

	static removeHighlight() {
		removeElementsByTagName('figment-outline')
	}

	static Create() {
		let overlay = document.querySelector('figment-outline') as FigmentOutline

		if (!overlay) {
			// Define the outline element
			if (!customElements.get('figment-outline'))
				customElements.define('figment-outline', FigmentOutline);

			overlay = document.createElement('figment-outline') as FigmentOutline
			document.body.appendChild(overlay)
		}

		return overlay
	}

	static highlightElement({ node, label, onClick }: { node: HTMLElement, label: string, onClick?: (this: HTMLElement, ev: MouseEvent) => any }) {
		if (node) {
			let overlay = FigmentOutline.Create()
			overlay.setLabel({ label, onClick })

			try {
				overlay.trackNode(node)
			} catch(error) {
				console.warn(error)
			}
		}
	}
}