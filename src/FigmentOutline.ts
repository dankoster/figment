import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js';

export default class FigmentOutline extends HTMLElement {
	
	overlay: HTMLDivElement
	label?: HTMLSpanElement

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
	}

	setLabel({label, onClick}: {label: string, onClick?: (this: HTMLSpanElement, ev: MouseEvent) => any}) {

		//remove the old label to avoid accumulating event handlers
		this.shadowRoot?.querySelectorAll('.figment-outline-label').forEach(e => e.remove())
		
		this.label = document.createElement('span')
		this.label.className = 'figment-outline-label'
		this.label.textContent = label
		if(onClick) this.label.addEventListener('click', onClick)
		this.overlay.appendChild(this.label)
	}

	// setAttributes(attributes: {[key: string]:any}) {
	// 	for(const attribute in attributes) {
	// 		this.overlay.setAttribute(attribute, attributes[attribute])
	// 	}
	// }

	setStyles(styles: {[key in keyof CSSStyleDeclaration]?:any}) {
		for(const style in styles) {
			this.overlay.style[style] = styles[style]
		}
	}

	setLocation(rect: DOMRect) {
		this.setStyles({
			top: window.scrollY + rect.top + 'px'
			, left: rect.left + 'px'
			, width: rect.width + 'px'
			, height: rect.height + 'px'
		})
	}

	static removeHighlight() {
		removeElementsByTagName('figment-outline')
	}

	static highlightElement({node, label, onClick}: {node: HTMLElement, label: string, onClick?: (this: HTMLElement, ev: MouseEvent) => any}) {

		if (node && node.getBoundingClientRect) {
	
			let overlay = document.querySelector('figment-outline') as FigmentOutline
	
			if(!overlay) {
				// Define the outline element
				if (!customElements.get('figment-outline'))
					customElements.define('figment-outline', FigmentOutline);

				overlay = document.createElement('figment-outline') as FigmentOutline
				document.body.appendChild(overlay)
			}
	
			overlay.setLabel({label, onClick})
			overlay.setLocation(node.getBoundingClientRect())
		}
	}	
}