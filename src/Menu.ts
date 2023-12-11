//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'

type ExtraClasses = string | string[]


function styleToInt(value: string): number { return Number.parseInt(value.replaceAll('px', '')) }
//function getTotal(style: CSSStyleDeclaration, properties: string[]) { return properties.reduce((total, property) => total + styleToInt(style[property]), 0) }

function AddExtraClasses(target: HTMLElement, extraClasses?: string | string[]) {
	if (extraClasses) {
		if (!target.classList) throw `${target} does not have a classList`
		if (typeof extraClasses === 'string') extraClasses = extraClasses.split(' ')
		if (!Array.isArray(extraClasses) || extraClasses.some(c => typeof c !== 'string'))
			throw `${extraClasses} must be a string or an array of strings`

		extraClasses.forEach(c => target.classList.add(c))
	}
}

export class FigmentMenu extends HTMLElement {

	ul: HTMLUListElement
	items: MenuItem[]

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		this.ul = document.createElement('ul')
		this.ul.className = 'figment-menu'
		this.items = []

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)

		// Attach the created elements to the shadow dom
		this.shadowRoot?.appendChild(cssLink)
		this.shadowRoot?.appendChild(this.ul)

		//document.body.appendChild(this.ul)
	}

	static Create({ extraClasses }: { extraClasses: ExtraClasses }) {
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

	Show(x: number, y: number) {
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

	AddItem(item: MenuItem, container: HTMLElement) {
		this.items.push(item)
		if (container) container.appendChild(item.li)
		else this.ul.appendChild(item.li)
	}

	AddSeparator({ extraClasses }: { extraClasses?: ExtraClasses } = {}) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		AddExtraClasses(sep, extraClasses)
		this.ul.appendChild(sep)
	}

	AddScrollingContainer({ extraClasses, maxHeight }: { extraClasses?: ExtraClasses, maxHeight?: string } = {}) {
		let container = document.createElement('div')
		container.className = 'menu-scrolling-container'
		if (maxHeight) container.style.maxHeight = maxHeight
		AddExtraClasses(container, extraClasses)
		this.ul.appendChild(container);
		return container;
	}

}

type MenuItemOptions = {
	id?: string,
	text: string,
	textClass: string,
	textData: string,
	onTextClick?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	subtext: string,
	href?: string,
	extraClasses?: ExtraClasses,
	imageSrc?: string,
	onSubTextClick: (this: HTMLSpanElement, ev: MouseEvent) => any,
	mouseEnter: (this: HTMLSpanElement, ev: MouseEvent) => any,
	mouseLeave?: (this: HTMLSpanElement, ev: MouseEvent) => any,
}

export class MenuItem {

	id?: string
	li: HTMLLIElement
	content: HTMLDivElement
	img?: HTMLImageElement
	subMenu?: FigmentMenu
	expando?: HTMLDivElement

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
	}: MenuItemOptions) {
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

	set imageHeight(value: number) {
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

	AddExpandoItem(item: HTMLElement) {
		this.Expando.appendChild(item)
	}

	// AddSubMenuItem(item: MenuItem) {
	// 	this.SubMenu.AddItem(item)
	// 	this.li.className = 'menu-item menu-item-submenu'
	// }
}