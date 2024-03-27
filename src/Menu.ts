//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js'
import { GetTotalClientHeight, getTotal, stylePxToInt } from './html.js'

type ExtraClasses = string | string[]


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

	

	ShowFor(target: HTMLElement) {
		if (!target) throw new Error('invalid target:', target)
		const x = (target?.parentElement?.offsetLeft ?? 0) + target.offsetLeft + target.offsetWidth
		const y = (target?.parentElement?.offsetTop ?? 0) + target.clientHeight
		this.Show(x, y)
	}

	Show(x: number, y: number) {

		this.container = FigmentMenu.buildMenuElements(this.items)
		this.container.style.left = x + 'px'
		this.container.style.top = y + 'px'

		this.shadowRoot?.appendChild(this.container)

		FigmentMenu.setSizeConstraints(this.container)
		FigmentMenu.positionSubmenus(this.container)
	}

	private static positionSubmenus(container: HTMLDivElement) {

		const menu = container.firstChild as HTMLDivElement
		
		menu.querySelectorAll('.submenu').forEach(sm => {
			if(!sm.parentElement) throw new Error('no parent element?!?!')
			const rect = sm.parentElement.getBoundingClientRect();

			//TODO: this is calculated before any scrolling happens so it's wrong
			// if the menu appears after scrolling and the submenu doesn't scroll
			// with the parent
	
			(sm as HTMLElement).style.top = `${rect.top}px`; //ASI actually breaks here!!! Cool!
			(sm as HTMLElement).style.left = `${rect.right}px`;
		})

	}
	
	private static setSizeConstraints(container: HTMLDivElement) {
		const computedContainerStyle = getComputedStyle(container)
		const top = getTotal(computedContainerStyle, ['top'])
		const left = getTotal(computedContainerStyle, ['left'])
		const right = getTotal(computedContainerStyle, ['left', 'width'])
		const bottom = container.offsetTop + container.offsetHeight

		const menu = container.firstChild as HTMLDivElement
		const childrenHeight = GetTotalClientHeight(menu?.children)
		const lastChildHeight = menu?.children[menu.children.length - 1].clientHeight
		const menuHeight = stylePxToInt(getComputedStyle(menu).height)

		//allow a specified number of children to scroll, 
		// but expand the menu max-height if there are fewer than that
		const allowableOverflow = lastChildHeight * 3
		const overflowHeight = childrenHeight - menuHeight
		if (overflowHeight < allowableOverflow) {
			menu.style.maxHeight = childrenHeight + 'px'
		}

		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

		const overflowX = right - document.documentElement.clientWidth - window.scrollX + scrollbarWidth
		const overflowY = bottom - document.documentElement.clientHeight - window.scrollY + (2 * scrollbarWidth)

		if (overflowX > 0) {
			//console.log(`Fix overflow X: ${left} - ${overflowX} = ${left - overflowY}px`)
			container.style.left = (left - overflowX) + 'px'
		}
		if (overflowY > 0) {
			//console.log(`Fix overflow Y: ${top} - ${overflowY} = ${top - overflowY}px`)
			container.style.top = (top - overflowY) + 'px'
		}
	}

	private static buildMenuElements(menuItems: MenuItem[]): HTMLDivElement {
		const con = document.createElement('div')
		con.className = 'figment-menu-container'

		const div = document.createElement('div')
		div.className = 'figment-menu'
		con.appendChild(div)

		for (const item of menuItems) {
			div.appendChild(item.div)
			if (item.subMenuItems?.length) {
				const subMenu = FigmentMenu.buildMenuElements(item.subMenuItems)
				subMenu.classList.add('submenu')
				item.div.appendChild(subMenu)
				item.div.classList.add('has-submenu')
			}
		}

		return con
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
	textClass?: string,
	textData?: string,
	onTextClick?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	subtext?: string,
	href?: string,
	extraClasses?: ExtraClasses,
	imageSrc?: string,
	onSubTextClick?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	mouseEnter?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	mouseLeave?: (this: HTMLSpanElement, ev: MouseEvent) => any,
}

export class MenuItem {

	id?: string
	div: HTMLDivElement
	img?: HTMLImageElement
	expando?: HTMLDivElement
	subMenuItems: MenuItem[] = []

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

	AddSubItem(item: MenuItem) {
		this.subMenuItems.push(item)
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
}