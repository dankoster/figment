//inspired by https://codepen.io/ryanmorr/pen/JdOvYR
import { figmentId } from './Figment.js'
import { removeElementsByTagName } from './elementFunctions.js'
import { GetTotalClientHeight, element, getTotal, stylePxToInt } from './html.js'

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
	target?: HTMLElement

	constructor() {
		super();

		this.attachShadow({ mode: 'open' })

		// Apply external styles to the shadow dom
		const cssLink = document.createElement('link')
		cssLink.setAttribute('rel', 'stylesheet')
		cssLink.setAttribute('href', `chrome-extension://${figmentId}/styles.css`)
		this.shadowRoot?.appendChild(cssLink)

		// TODO: consider moving the menu and outline into the same shadow dom. 
		// Making the menu track the location of a target element that is in a
		// different shadow dom appears to be problematic for reading position data. 

		//watch for changes to the size of the document and just close the menu
		const resizeObserver = new ResizeObserver(() => {
			this.Clear()
		});

		resizeObserver.observe(document.body);

		//ensure any submenus scroll with the document
		document.addEventListener('scroll', () =>
			this.container?.querySelectorAll('.submenu')
				?.forEach(subMenu =>
					FigmentMenu.updateSubmenuPosition(subMenu as HTMLDivElement)
				)
		)
	}

	Clear() {
		this.container?.remove()
		this.container = undefined
		this.items.length = 0
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

	private setLocation(rect: DOMRect) {
		if (!this.container) throw new Error('no container')

		this.container.style.left = rect.x + 'px'
		this.container.style.top = rect.y + 'px'
	}

	static calcPlacement(target: HTMLElement): DOMRect {
		const x = (target?.parentElement?.offsetLeft ?? 0) + target.offsetLeft + target.offsetWidth
		const y = (target?.parentElement?.offsetTop ?? 0) + target.clientHeight
		return new DOMRect(x, y)
	}


	ShowFor(target: HTMLElement, extra?: HTMLElement) {
		if (!target) throw new Error('invalid target:', target)
		this.target = target

		this.container = FigmentMenu.buildMenuElements(this.items)

		if (extra) {
			this.container.appendChild(extra)
		}

		this.setLocation(FigmentMenu.calcPlacement(this.target))

		this.shadowRoot?.appendChild(this.container)

		FigmentMenu.fixSmallMenuScroll(this.container.querySelector('div.figment-menu') as HTMLDivElement)
		FigmentMenu.fixContainerOverflow(this.container)
	}

	private static fixSmallMenuScroll(menu: HTMLDivElement | null, minChildrenForScrolling = 3) {
		//allow a specified number of children to scroll, 
		// but expand the menu max-height if there are fewer than that

		if (!menu) throw new Error(`menu is ${menu}`)

		const childrenHeight = GetTotalClientHeight(menu?.children)
		const lastChildHeight = menu?.children[menu.children.length - 1].clientHeight
		const menuHeight = stylePxToInt(getComputedStyle(menu).height)

		const allowableOverflow = lastChildHeight * minChildrenForScrolling
		const overflowHeight = childrenHeight - menuHeight
		if (overflowHeight < allowableOverflow) {
			menu.style.maxHeight = childrenHeight + 'px'
		}
	}

	private static fixContainerOverflow(container: HTMLDivElement) {
		//move the container to not overflow the viewport

		const computedContainerStyle = getComputedStyle(container)
		const top = getTotal(computedContainerStyle, ['top'])
		const left = getTotal(computedContainerStyle, ['left'])
		const right = getTotal(computedContainerStyle, ['left', 'width'])
		const bottom = container.offsetTop + container.offsetHeight

		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

		const overflowX = right - document.documentElement.clientWidth - window.scrollX + scrollbarWidth
		const overflowY = bottom - document.documentElement.clientHeight - window.scrollY + (2 * scrollbarWidth)

		if (overflowX > 0) {
			//console.log(`Fix overflow X: ${left} - ${overflowX} = ${left - overflowY}px`, container)

			if (overflowX > 50) {
				//move the submenu to the left side
				container.style.left = (left - container.clientWidth - (container.parentElement?.clientWidth ?? 0) + 'px')
				container.previousElementSibling?.classList.add('left')
			}
			else {
				container.style.left = (left - overflowX) + 'px'
			}
		}
		if (overflowY > 0) {
			//console.log(`Fix overflow Y: ${top} - ${overflowY} = ${top - overflowY}px`)
			container.style.top = (top - overflowY) + 'px'
		}
	}

	private static buildMenuElements(menuItems: MenuItem[]): HTMLDivElement {
		const container = document.createElement('div')
		container.className = 'figment-menu-container'

		const menu = document.createElement('div')
		menu.className = 'figment-menu'
		container.appendChild(menu)

		//recursively add submenus
		for (const menuItem of menuItems) {
			menu.appendChild(menuItem.div)
			if (menuItem.subMenuItems?.length) {
				const subMenu = FigmentMenu.buildMenuElements(menuItem.subMenuItems)
				subMenu.classList.add('submenu')

				//add invisible hover target to cover lower menu items but remove it 
				// if the mouse starts moving left. This is to let the user shortcut
				// across other menu items while moving the cursor to a submenu. 
				// If the menu appears to the left instead of the right, we will add
				// an other class that overrides the shape of the hover target polygon
				const hoverTarget = document.createElement('div')
				hoverTarget.className = 'submenu-hover-target'
				hoverTarget.style.display = 'none'
				hoverTarget.addEventListener('mousemove', (ev) => {
					if (ev.movementX != 0) {
						const menuIsLeft = hoverTarget.classList.contains('left')
						const menuIsRight = !menuIsLeft
						const movementIsLeft = ev.movementX < 0
						const movementIsRight = ev.movementX > 0
						//did the pointer move away from the submenu?
						//console.log(movementIsRight ? '→' : movementIsLeft ? '←' : '0')
						if ((menuIsLeft && movementIsRight) || (menuIsRight && movementIsLeft)) {
							hoverTarget.style.display = 'none'
						}
					}
				})
				menuItem.div.addEventListener('mouseleave', () => hoverTarget.style.display = 'none' )
				menuItem.div.addEventListener('mouseenter', () => hoverTarget.style.display = 'block' )
				menuItem.div.appendChild(hoverTarget)

				menuItem.div.appendChild(subMenu)
				menuItem.div.classList.add('has-submenu')
				menuItem.div.parentElement?.addEventListener('scroll', () => FigmentMenu.updateSubmenuPosition(subMenu))
				menuItem.div.parentElement?.addEventListener('mouseenter', () => FigmentMenu.updateSubmenuPosition(subMenu))
			}
		}

		return container
	}

	private static updateSubmenuPosition(submenu: HTMLDivElement) {
		const parentRect = submenu.parentElement?.getBoundingClientRect();
		submenu.style.top = `${parentRect?.top}px`
		submenu.style.left = `${parentRect?.right}px`

		FigmentMenu.fixContainerOverflow(submenu)

		const submenuRect = submenu.getBoundingClientRect()
		const hoverTarget = submenu.parentElement?.querySelector('div.submenu-hover-target') as HTMLDivElement

		hoverTarget.style.top = `${parentRect?.top}px`
		//todo: get (submenu.parentElement?.style.paddingBlockEnd ?? 0) instead of hardcoding -3
		hoverTarget?.style.setProperty('margin-top', `${(parentRect?.height ?? 0) - 3}px`)
		hoverTarget?.style.setProperty('width', `${parentRect?.width}px`)
		hoverTarget?.style.setProperty('height', `${submenuRect.height - (parentRect?.height ?? 0)}px`)
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
	onSubTextMouseDown?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	onSubTextMouseUp?: (this: HTMLSpanElement, ev: MouseEvent) => any,
	mouseEnter?: (this: HTMLSpanElement, ev: MouseEvent) => void,
	mouseLeave?: (this: HTMLSpanElement, ev: MouseEvent) => void,
	subItems?: MenuItem[],
}

export class MenuItem {

	id?: string
	div: HTMLDivElement
	img?: HTMLImageElement
	expando?: HTMLDivElement
	subMenuItems: MenuItem[] = []
	text: string

	constructor({
		id,
		text,
		textClass,
		textData,
		subtext,
		href,
		extraClasses,
		imageSrc,
		subItems,
		onTextClick,
		onSubTextClick,
		onSubTextMouseUp,
		onSubTextMouseDown,
		mouseEnter,
		mouseLeave
	}: MenuItemOptions) {
		this.id = id
		this.div = document.createElement('div')
		this.div.classList.add('menu-item')
		this.text = text

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

			if (onSubTextMouseUp) subtextSpan.addEventListener('mouseup', onSubTextMouseUp)
			if (onSubTextMouseDown) subtextSpan.addEventListener('mousedown', onSubTextMouseDown)
		}

		if (imageSrc) this.imageSrc = imageSrc

		subItems?.forEach(s => this.AddSubItem(s))
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