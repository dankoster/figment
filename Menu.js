//inspired by https://codepen.io/ryanmorr/pen/JdOvYR

let styleToInt = (value) => Number.parseInt(value.replaceAll('px', ''))
let getTotal = (style, properties) => properties.reduce((total, property) => total + styleToInt(style[property]), 0)

export class Menu {
	constructor() {
		this.ul = document.createElement('ul')
		this.ul.className = 'figment-menu'
		this.items = []

		document.body.appendChild(this.ul)
	}

	static Hide() { Menu.Current?.classList.remove('menu-show') }

	static get Current() { return document.querySelector('.figment-menu') }

	static RemoveOld () {
		//remove old menu(s)
		document.querySelectorAll('.figment-menu').forEach(element => element.remove())
	}

	Show(x, y) {
		if (this.ul) {
			let overflowX = x + getTotal(getComputedStyle(this.ul), ['width']) - window.innerWidth
			if (overflowX > 0) x -= (overflowX + 50)

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

	AddSeparator({extraClasses} = {}) {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		if(extraClasses) sep.classList.add(extraClasses)
		this.ul.appendChild(sep)
	}

	AddScrollingContainer({extraClasses, maxHeight} = {}) {
		let container = document.createElement('div')
		container.className = 'menu-scrolling-container'
		if(maxHeight) container.style.maxHeight = maxHeight
		if(extraClasses) container.classList.add(extraClasses)
		this.ul.appendChild(container);
		return container;
	}
	
}

export class MenuItem {
	constructor({id, text, textClass, textData, onTextClick, subtext, href, extraClasses, imageSrc, onSubTextClick, mouseEnter, mouseLeave}) {
		this.id = id
		this.li = document.createElement('li')
		this.li.classList.add('menu-item')
		Array.isArray(extraClasses) && extraClasses.forEach(c => this.li.classList.add(c))

		this.content = document.createElement('div')
		this.content.className = 'menu-item-content menu-item-grid-component'
		this.li.appendChild(this.content)
		
		let textSpan = document.createElement('span')
		textSpan.className = 'menu-text'
		textSpan.textContent = text
		if(textData) textSpan.setAttribute('data-text', textData)
		if(textClass) textSpan.classList.add(textClass)
		
		if(onTextClick) {
			textSpan.classList.add('menu-keep-open')
			textSpan.addEventListener('click', onTextClick)
		}

		if(href) {
			let a = document.createElement('a');
			a.href = href;
			a.target = '_blank';
			a.classList.add('menu-btn');
			this.content.appendChild(a);
			a.appendChild(textSpan);
		}
		else 
			this.content.appendChild(textSpan)
		
		if(mouseEnter) this.li.addEventListener("mouseenter", mouseEnter)
		if(mouseLeave) this.li.addEventListener("mouseleave", mouseLeave)
		
		if(subtext) {
			let subtextSpan = document.createElement('span')
			subtextSpan.className = 'menu-subtext'
			subtextSpan.textContent = subtext
			this.content.appendChild(subtextSpan)
	
			if(onSubTextClick) {
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
		else if(this.img) this.img.remove() 
	}

	set imageHeight(value) {
		if(Number.isSafeInteger(value) && this.img) this.img.height = value
	}

	get SubMenu () {
		if(!this.subMenu) {
			this.subMenu = new Menu()
			this.li.appendChild(this.subMenu.ul)
		}
		return this.subMenu
	}

	get Expando () {
		if(!this.expando) {
			let checkbox = document.createElement('input')
			checkbox.id=`collapsible-${Math.random().toString(16).slice(2)}`
			checkbox.className = "menu-item-grid-prefix toggle"
			checkbox.type="checkbox"

			let label = document.createElement('label')
			label.setAttribute('for', checkbox.id)
			label.className='menu-item-grid-prefix lbl-toggle menu-keep-open'
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