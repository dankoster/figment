import { figmentId } from './Figment.js'

export default class FigmentOutline extends HTMLElement {
	
	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' })

		this.overlay = document.createElement('div')
		this.overlay.className = 'figment-outline'

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)

		// Attach the created elements to the shadow dom
		this.shadow.appendChild(cssLink)
		this.shadow.appendChild(this.overlay)
	}

	setLabel({label, onClick}) {

		//remove the old label to avoid accumulating event handlers
		this.shadow.querySelectorAll('.figment-outline-label').forEach(e => e.remove())
		
		this.label = document.createElement('span')
		this.label.className = 'figment-outline-label'
		this.label.textContent = label
		if(onClick) this.label.addEventListener('click', onClick)
		this.overlay.appendChild(this.label)
	}

	setStyles(styles) {
		for(const style in styles) {
			this.overlay.style[style] = styles[style]
		}
	}

	setAttributes(attributes) {
		for(const attribute in attributes) {
			this.overlay.setAttribute(attribute, attributes[attribute])
		}
	}
}