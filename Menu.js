//inspired by https://codepen.io/ryanmorr/pen/JdOvYR

let styleToInt = (value) => Number.parseInt(value.replaceAll('px', ''))
let getTotal = (style, properties) => properties.reduce((total, property) => total + styleToInt(style[property]), 0)

export class Menu {
	constructor() {
		this.ul = document.createElement('ul')
		this.ul.className = 'figment-menu'
		this.items = []
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
		if (container) container.appendChild(item.li);
		else this.ul.appendChild(item.li)
	}

	AddSeparator() {
		let sep = document.createElement('li')
		sep.className = 'menu-separator'
		sep.classList.add('figma-info')
		this.ul.appendChild(sep)
	}

	AddScrollingContainer() {
		let container = document.createElement('div');
		container.className = 'menu-scrolling-container';
		this.ul.appendChild(container);
		return container;
	}
	
}

export class MenuItem {
	constructor({text, onTextClick, subtext, href, extraClasses, onSubTextClick, mouseEnter, mouseLeave}) {
		this.li = document.createElement('li')
		this.li.classList.add('menu-item')
		Array.isArray(extraClasses) && extraClasses.forEach(c => this.li.classList.add(c))
		
		let textSpan = document.createElement('span')
		textSpan.className = 'menu-text'
		textSpan.textContent = text
		
		if(onTextClick) {
			textSpan.classList.add('menu-keep-open')
			textSpan.addEventListener('click', onTextClick)
		}

		if(href) {
			let a = document.createElement('a');
			a.href = href;
			a.target = '_blank';
			a.classList.add('menu-btn');
			this.li.appendChild(a);
			a.appendChild(textSpan);
		}
		else 
			this.li.appendChild(textSpan)
		
		if(mouseEnter) this.li.addEventListener("mouseenter", mouseEnter)
		if(mouseLeave) this.li.addEventListener("mouseleave", mouseLeave)
		
		if(subtext) {
			let subtextSpan = document.createElement('span')
			subtextSpan.className = 'menu-subtext'
			subtextSpan.textContent = subtext
			this.li.appendChild(subtextSpan)
	
			if(onSubTextClick) subtextSpan.addEventListener('click', onSubTextClick)
		}
	}
}