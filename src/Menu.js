//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'

function styleToInt(value) { Number.parseInt(value.replaceAll('px', '')) }
function getTotal(style, properties) { properties.reduce((total, property) => total + styleToInt(style[property]), 0) }

function AddExtraClasses(target, extraClasses) {
	if (extraClasses) {
		if (!target.classList) throw `${target} does not have a classList`
		if (typeof extraClasses === 'string') extraClasses = extraClasses.split(' ')
		if (!Array.isArray(extraClasses) || extraClasses.some(c => typeof c !== 'string'))
			throw `${extraClasses} must be a string or an array of strings`

		extraClasses.forEach(c => target.classList.add(c))
	}
}

export class FigmentMenu extends HTMLElement {

	constructor() {
		super();

		this.shadow = this.attachShadow({ mode: 'open' })

		this.ul = document.createElement('ul')
		this.ul.className = 'figment-menu'
		this.items = []

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)

		// Attach the created elements to the shadow dom
		this.shadow.appendChild(cssLink)
		this.shadow.appendChild(this.ul)

		//document.body.appendChild(this.ul)
	}

	static Create({ extraClasses }) {
		if (!customElements.get('figment-menu'))
			customElements.define('figment-menu', FigmentMenu)

		let menu = document.createElement('figment-menu')

		AddExtraClasses(menu, extraClasses)
		document.body.appendChild(menu)

		return menu
	}

	static RemoveOld() {
		//remove old menu(s)
		document.querySelectorAll('figment-menu').forEach(element => element.remove())
	}

	Show(x, y) {
		if (this.ul) {
			//there is some issue with computing width in the shadow dom...
			//const ulWidth = getTotal(getComputedStyle(this.ul), ['width'])
			//use maxWidth instead
			const ulWidth = 400
			const overflowX = (x + ulWidth) - window.innerWidth
			if (overflowX > 0) x -= overflowX

			this.ul.style.left = x + 'px';
			this.ul.style.top = y + 'px';
			this.ul.classList.add('menu-show');
		}
	}

	AddItem(item, container) {
		this.items.push(item)
		if (container) container.appendChild(item.li)
		else this.ul.appendChild(item.li)
	}

	AddSeparator({ extraClasses } = {}) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		AddExtraClasses(sep, extraClasses)
		this.ul.appendChild(sep)
	}

	AddScrollingContainer({ extraClasses, maxHeight } = {}) {
		let container = document.createElement('div')
		container.className = 'menu-scrolling-container'
		if (maxHeight) container.style.maxHeight = maxHeight
		AddExtraClasses(container, extraClasses)
		this.ul.appendChild(container);
		return container;
	}

}

export class MenuItem {
	constructor({
		id,
		text,
		textClass,
		textData,
		onTextClick,
		subtext,
		href,
		extraClasses,
		imageSrc,
		onSubTextClick,
		mouseEnter,
		mouseLeave
	}) {
		this.id = id
		this.li = document.createElement('li')
		this.li.classList.add('menu-item')

		AddExtraClasses(this.li, extraClasses)

		this.content = document.createElement('div')
		this.content.className = 'menu-item-content menu-item-grid-component'
		this.li.appendChild(this.content)

		let textSpan = document.createElement('span')
		textSpan.className = 'menu-text'
		textSpan.textContent = text
		if (textData) textSpan.setAttribute('data-text', textData)
		if (textClass) textSpan.classList.add(textClass)

		if (onTextClick) {
			textSpan.classList.add('menu-keep-open')
			textSpan.addEventListener('click', onTextClick)
		}

		if (href) {
			let a = document.createElement('a');
			a.href = href;
			a.target = '_blank';
			a.classList.add('menu-btn');
			this.content.appendChild(a);
			a.appendChild(textSpan);
		}
		else
			this.content.appendChild(textSpan)

		if (mouseEnter) this.li.addEventListener("mouseenter", mouseEnter)
		if (mouseLeave) this.li.addEventListener("mouseleave", mouseLeave)

		if (subtext) {
			let subtextSpan = document.createElement('span')
			subtextSpan.className = 'menu-subtext'
			subtextSpan.textContent = subtext
			this.content.appendChild(subtextSpan)

			if (onSubTextClick) {
				subtextSpan.classList.add('menu-keep-open')
				subtextSpan.addEventListener('click', onSubTextClick)
			}
		}

		if (imageSrc) this.imageSrc = imageSrc
	}

	get imageSrc() { return this.img?.src }

	set imageSrc(value) {
		if (value) {
			if (!this.img) {
				this.img = document.createElement('img')
				this.li.appendChild(this.img)
				this.img.className = 'menu-image'
			}
			this.img.src = value ?? ''
		}
		else if (this.img) this.img.remove()
	}

	set imageHeight(value) {
		if (Number.isSafeInteger(value) && this.img) this.img.height = value
	}

	get SubMenu() {
		if (!this.subMenu) {
			this.subMenu = new FigmentMenu()
			this.li.appendChild(this.subMenu.ul)
		}
		return this.subMenu
	}

	get Expando() {
		if (!this.expando) {
			let checkbox = document.createElement('input')
			checkbox.id = `collapsible-${Math.random().toString(16).slice(2)}`
			checkbox.className = "menu-item-grid-prefix toggle"
			checkbox.type = "checkbox"

			let label = document.createElement('label')
			label.setAttribute('for', checkbox.id)
			label.className = 'menu-item-grid-prefix lbl-toggle menu-keep-open'
			this.li.prepend(label)
			this.li.prepend(checkbox)

			let content = document.createElement('div')
			content.className = 'menu-item-grid-expando collapsible-content menu-keep-open'
			this.li.appendChild(content)
			let inner = document.createElement('div')
			inner.className = 'content-inner'
			content.appendChild(inner)

			this.expando = inner
		}
		return this.expando
	}

	AddExpandoItem(item) {
		this.Expando.appendChild(item)
	}

	AddSubMenuItem(item) {
		this.SubMenu.AddItem(item)
		this.li.className = 'menu-item menu-item-submenu'
	}
}