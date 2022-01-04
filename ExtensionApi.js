
export const settings = {
	enabled: 'enabled'
}

export function GetExtensionSetting(key) {
	validate(key)
	return chrome.storage.local.get([key]).then(result => result[key])
}

export function SetExtensionSetting(key, value) {
	validate(key)
	let setting = {}
	setting[key] = value
	chrome.storage.local.set(setting)
}

function validate(key) {
	if (!Object.values(settings).includes(key))
		throw `${key} is not a valid setting`
}
