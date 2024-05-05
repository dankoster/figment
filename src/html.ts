
export function childrenHavingClass(elements: HTMLCollection, classNames: string[]) {
	const result: HTMLElement[] = []
	for (const element of elements) {
		for (const className of classNames) {
			if (element.classList.contains(className))
				result.push(element as HTMLElement)
		}
		result.push(...childrenHavingClass(element.children, classNames))
	}
	return result
}

export function clearChildren(element: HTMLElement) {
	while (element.firstChild)
		element.removeChild(element.firstChild)
}

export function applyStylesheetToDocument(cssLink: string) {
	const hasCssLink = Array.from(document.head.querySelectorAll('link')).some(l => l.href.endsWith(cssLink))
	if (!hasCssLink) {
		document.head.appendChild(element('link', { href: cssLink, rel: 'stylesheet' }))
	}
}

export function applyDiff(target: Element, update: Element) {
	//https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-isEqualNode

	if (target.isEqualNode(update)) {
		return
	}
	else if (update.childNodes.length > 0) {
		if (target.childNodes.length === update.childNodes.length) {
			for (let i = 0; i < update.childNodes.length; i++) {
				applyDiff(target.childNodes[i] as Element, update.childNodes[i] as Element)
			}
		} else {
			target.replaceWith(update)
		}
	} else {
		//this target should have no children so try to just update attributes?
		// it could also be a Text element, so attributes may be undefined
		if (target.attributes?.length
			&& target.tagName === update.tagName
			&& target.attributes.length === update.attributes.length) {

			//update existing attributes and add any new attributes
			for (const newAttr of update.attributes) {
				const oldAttr = target.attributes.getNamedItem(newAttr.name)
				if (oldAttr?.value !== newAttr.value) {
					target.setAttribute(newAttr.name, newAttr.value)
				}
			}

			//remove old attributes
			for (const oldAttr of target.attributes) {
				if (!update.hasAttribute(oldAttr.name)) {
					target.removeAttribute(oldAttr.name)
				}
			}

			if (target.innerHTML !== update.innerHTML) {
				target.innerHTML = update.innerHTML
			}
		}
		else {
			target.replaceWith(update)
		}
	}
}

export function GetTotalClientHeight(elements: HTMLCollection): number {
	return Array.from(elements ?? []).reduce((sum, node) => sum += node.clientHeight, 0);
}

export function stylePxToInt(value: string): number { return Number.parseInt(value.replaceAll('px', '')) }
export function getTotal(style: CSSStyleDeclaration, properties: string[]) {
	return properties.reduce((total, property: any) => total + stylePxToInt(style[property]), 0)
}

/**
 * typescript shenanigans to build an element and add properties and children
 * 
 * @param tag Specify the kind of html element to create
 * @param properties Valid properties for the specified html tag
 * @param children Child nodes to append in order
 * @returns HTMLElement
 */
export function element<T extends keyof HTMLElementTagNameMap>(
	tag: T,
	properties: { [Property in keyof Partial<HTMLElementTagNameMap[T]>]: HTMLElementTagNameMap[T][Property] },
	children?: Node[],
	eventListeners?: { [Property in keyof Partial<HTMLElementEventMap>]: (this: HTMLInputElement, ev: HTMLElementEventMap[Property]) => any }
) {
	const el = document.createElement(tag)
	for (const property in properties) {
		el[property] = properties[property]
	}
	if (children) {
		for (const child of children) {
			el.appendChild(child)
		}
	}
	if (eventListeners) {
		for (const ev in eventListeners) {
			el.addEventListener(ev, eventListeners[ev as keyof HTMLElementEventMap] as EventListener)
		}
	}
	return el
}

export function age(date: string | number | Date, ageSuffix?:string) {
	const d = new Date(date)
	const value = d.valueOf()
	const now = Date.now()

	const format = (age: string) => [age, ageSuffix].join(' ')

	const ageInSeconds = Math.round((now - value) / 1000)
	if(ageInSeconds <= 60) 
		return format(`${ageInSeconds} second${ageInSeconds > 1 ? 's' : ''}`)

	const ageInMinutes = Math.round(ageInSeconds / 60)
	if(ageInMinutes < 60) 
		return format(`${ageInMinutes} minute${ageInMinutes > 1 ? 's':''}`)

	const ageInHours = Math.round(ageInMinutes / 60)
	if(ageInHours < 48) 
		return format(`${ageInHours} hour${ageInHours > 1 ? 's':''}`)

	const ageInDays = Math.round(ageInHours / 24)
	if(ageInDays <= 365) 
		return format(`${ageInDays} day${ageInDays > 1 ? 's': ''}`)

	return d.toLocaleDateString()
}

export function setStyles(element: HTMLElement, styles: { [key in keyof Partial<CSSStyleDeclaration>]: string }) {
	for (const style in styles) {
		element.style[style] = styles[style]
	}
}