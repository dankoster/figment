//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'

type ExtraClasses = string | string[]


function styleToInt(value: string): number { return Number.parseInt(value.replaceAll('px', '')) }
function getTotal(style: CSSStyleDeclaration, properties: string[]) { 
	return properties.reduce((total, property: any) => {
		const newTotal = total + styleToInt(style[property])
		console.log(property, style[property], `total: ${newTotal}`)
		return newTotal}, 0) 
}

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

	div: HTMLDivElement
	items: MenuItem[]

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		this.div = document.createElement('div')
		this.div.className = 'figment-menu'
		this.items = []

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)

		// Attach the created elements to the shadow dom
		this.shadowRoot?.appendChild(cssLink)
		this.shadowRoot?.appendChild(this.div)
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
		if (this.div) {
			this.div.classList.add('menu-show');
			this.div.style.left = x + 'px';
			this.div.style.top = y + 'px';

			//calculate max height from all the item heights
			// const children = Array.from(this.div.children)
			// const heightOfAllChildren = children.reduce((sum, node) => sum += node.clientHeight, children[0].clientHeight);
			// this.div.style.maxHeight = `${heightOfAllChildren}px`

			//there is a race condition when computing position of elements in the shadow dom...
			setTimeout(() => {
				this.FixOverflow()
			}, 5);
		}
	}

	private FixOverflow() {
		const computedStyle = getComputedStyle(this.div)
		const top = getTotal(computedStyle, ['top'])
		const left = getTotal(computedStyle, ['left'])
		const right = getTotal(computedStyle, ['left', 'width']);
		const bottom = this.div.offsetTop + this.div.offsetHeight;

		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		const overflowX = right - document.documentElement.clientWidth - window.scrollX + scrollbarWidth;
		const overflowY = bottom - window.innerHeight - window.scrollY;

		console.log({top, bottom, left, right, overflowX, overflowY});

		if (overflowX > 0) {
			this.div.style.left = (left - overflowX) + 'px';
		}
		if (overflowY > 0) {
			this.div.style.top = (top - overflowY) + 'px';
		}
	}

	AddItem(item: MenuItem) {
		this.items.push(item)
		this.div.appendChild(item.div)
	}

	AddSeparator({ extraClasses }: { extraClasses?: ExtraClasses } = {}) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		AddExtraClasses(sep, extraClasses)
		this.div.appendChild(sep)
	}

	AddScrollingContainer({ extraClasses, maxHeight }: { extraClasses?: ExtraClasses, maxHeight?: string } = {}) {
		let container = document.createElement('div')
		container.className = 'menu-scrolling-container'
		if (maxHeight) container.style.maxHeight = maxHeight
		AddExtraClasses(container, extraClasses)
		this.div.appendChild(container);
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
	div: HTMLDivElement
	// content: HTMLDivElement
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
		this.div = document.createElement('div')
		this.div.classList.add('menu-item')

		AddExtraClasses(this.div, extraClasses)

		// this.content = document.createElement('div')
		// this.content.className = 'menu-item-content menu-item-grid-component'
		// this.div.appendChild(this.content)

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
			this.div.appendChild(a);
			a.appendChild(textSpan);
		}
		else
			this.div.appendChild(textSpan)

		if (mouseEnter) this.div.addEventListener("mouseenter", mouseEnter)
		if (mouseLeave) this.div.addEventListener("mouseleave", mouseLeave)

		if (subtext) {
			let subtextSpan = document.createElement('span')
			subtextSpan.className = 'menu-subtext'
			subtextSpan.textContent = subtext
			this.div.appendChild(subtextSpan)

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
				this.div.appendChild(this.img)
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
			this.div.appendChild(this.subMenu.div)
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
			this.div.prepend(label)
			this.div.prepend(checkbox)

			let content = document.createElement('div')
			content.className = 'menu-item-grid-expando collapsible-content menu-keep-open'
			this.div.appendChild(content)
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