//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js'

type ExtraClasses = string | string[]


function stylePxToInt(value: string): number { return Number.parseInt(value.replaceAll('px', '')) }
function getTotal(style: CSSStyleDeclaration, properties: string[]) { 
	return properties.reduce((total, property: any) => total + stylePxToInt(style[property]), 0) 
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
	container?: HTMLDivElement
	menu?: HTMLDivElement
	items: MenuItem[] = []

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)
		this.shadowRoot?.appendChild(cssLink)
	}

	Clear() {
		this.container?.remove()
		this.items = []
	}

	static removeMenu() {
		removeElementsByTagName('figment-menu')
	}
	 
	static Create({ extraClasses }: { extraClasses: ExtraClasses }) {
		if (!customElements.get('figment-menu'))
			customElements.define('figment-menu', FigmentMenu)

		let figmentMenu = document.createElement('figment-menu')

		AddExtraClasses(figmentMenu, extraClasses)
		document.body.appendChild(figmentMenu)

		return figmentMenu
	}

	GetTotalClientHeight(elements: HTMLCollection): number {
		return Array.from(elements ?? []).reduce((sum, node) => sum += node.clientHeight, 0);
	}

	ShowFor(target: HTMLElement) {
		if(!target) throw new Error('invalid target:', target)
		const x = (target?.parentElement?.offsetLeft ?? 0) + target.offsetLeft + target.offsetWidth
		const y = (target?.parentElement?.offsetTop ?? 0) + target.clientHeight
		this.Show(x, y)
	}

	Show(x: number, y: number) {
		this.container = document.createElement('div')
		this.container.className = 'figment-menu-container'
		this.container.style.left = x + 'px'
		this.container.style.top = y + 'px'
		this.shadowRoot?.appendChild(this.container)

		this.menu = document.createElement('div')
		this.menu.className = 'figment-menu'
		this.items.forEach(item => this.menu?.appendChild(item.div))
		this.container.appendChild(this.menu)

		const computedContainerStyle = getComputedStyle(this.container)
		const top = getTotal(computedContainerStyle, ['top'])
		const left = getTotal(computedContainerStyle, ['left'])
		const right = getTotal(computedContainerStyle, ['left', 'width']);
		const bottom = this.container.offsetTop + this.container.offsetHeight;

		const childrenHeight = this.GetTotalClientHeight(this.menu?.children)
		const lastChildHeight = this.menu?.children[this.menu.children.length - 1].clientHeight
		const menuHeight = stylePxToInt(getComputedStyle(this.menu).height)

		//allow a specified number of children to scroll, 
		// but expand the menu max-height if there are fewer than that
		const allowableOverflow = lastChildHeight * 3
		const overflowHeight = childrenHeight - menuHeight
		if(overflowHeight < allowableOverflow) {
			this.menu.style.maxHeight = childrenHeight + 'px'
		}

		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		const overflowX = right - document.documentElement.clientWidth - window.scrollX + scrollbarWidth;
		const overflowY = bottom - document.documentElement.clientHeight - window.scrollY + (2 * scrollbarWidth);

		if (overflowX > 0) {
			//console.log(`Fix overflow X: ${left} - ${overflowX} = ${left - overflowY}px`)
			this.container.style.left = (left - overflowX) + 'px';
		}
		if (overflowY > 0) {
			//console.log(`Fix overflow Y: ${top} - ${overflowY} = ${top - overflowY}px`)
			this.container.style.top = (top - overflowY) + 'px';
		}
	}

	AddItem(item: MenuItem) {
		this.items.push(item)
	}

	AddSeparator({ extraClasses }: { extraClasses?: ExtraClasses } = {}) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		AddExtraClasses(sep, extraClasses)
		this.menu?.appendChild(sep)
	}

	AddScrollingContainer({ extraClasses, maxHeight }: { extraClasses?: ExtraClasses, maxHeight?: string } = {}) {
		let scrollingContainer = document.createElement('div')
		scrollingContainer.className = 'menu-scrolling-container'
		if (maxHeight) scrollingContainer.style.maxHeight = maxHeight
		AddExtraClasses(scrollingContainer, extraClasses)
		this.menu?.appendChild(scrollingContainer);
		return scrollingContainer;
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
			if(!this.subMenu.menu) throw new Error('failed to create submenu')
			this.div.appendChild(this.subMenu.menu)
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