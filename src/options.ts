
export type Option<T> = {
	name: string,
	desc: string,
	value: T
}

export type OptionName = 'figmaEnabled' | 'propsSubmenu'
export type Options = {[key in OptionName]:Option<string|boolean>}

export const DEFAULT_OPTIONS: Options = {
	figmaEnabled: {
		name: "Figma Integration (beta)",
		desc: "Quick Reference Figma Documents",
		value: false
	},
	propsSubmenu: {
		name: "React Props Submenu",
		desc: "Show React Props in a submenu for react elements",
		value: true
	}
}


export function setOption<T extends keyof Options> (key: T, value: Options[T]) {
	const update = {} as Options
	update[key] = value
	return chrome.storage.sync.set(update)
};

export async function getOption<T extends keyof Options> (key: T): Promise<Options[T]> {
	const result = await chrome.storage.sync.get(key)
	return result[key]
}

export async function getAllOptions(): Promise<Options> { 
	return chrome.storage.sync.get() as Promise<Options>
}

export function clearAllOptions() {
	return chrome.storage.sync.clear()
}

export function setAllOptions(options: Options) {
	return chrome.storage.sync.set(options)
}