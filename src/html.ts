
export function childrenHavingClass(elements: HTMLCollection, className: string) {
    const result: HTMLElement[] = []
    for (const element of elements) {
        if (element.classList.contains(className))
            result.push(element as HTMLElement)
        result.push(...childrenHavingClass(element.children, className))
    }
    return result
}

export function clearChildren(element: HTMLElement) {
	while (element.firstChild)
		element.removeChild(element.firstChild)
}

//here is some typescript shenanigans we can do... it it better? Is it worse? Probably worse.
export function Image(properties: { [Property in keyof HTMLImageElement]?: HTMLImageElement[Property] }) {
    const image = document.createElement('img')
    for (const property in properties) {
        //@ts-ignore
        image[property] = properties[property]
    }
    return image
}

export function Label({ textContent, className, onClick }: { textContent: string, className: string, onClick?: (this: HTMLSpanElement, ev: MouseEvent) => any }) {
    const span = document.createElement('span')
    span.className = className
    span.textContent = textContent
    if (onClick) span.addEventListener('click', onClick)
    return span
}

export function Range({ min = 0, max = 100, value = 50, onchange }: { min?: number; max?: number; value?: number; onchange: (value: number) => void }) {
    const range = document.createElement('input')
    range.setAttribute('type', 'range')
    range.setAttribute('min', min.toString())
    range.setAttribute('max', max.toString())
    range.setAttribute('value', value.toString())
    range.oninput = () => onchange(Number.parseInt(range.value))
    return range
}

export function TextInput({ placeholder, onkeyup }: { placeholder: string, onkeyup: (value: string) => void }) {
    const div = document.createElement('div')
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = placeholder
    input.onkeyup = () => onkeyup(input.value)
    div.appendChild(input)
    return div
}
