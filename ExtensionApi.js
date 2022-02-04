
export const settings = {
	enabled: 'enabled'
}

export function SaveSettings(settings) {
	//todo: merge settings instead of overwriting
	chrome.storage.local.set({'settings': settings})
}

export function GetSettings() {
	const key='settings'
	return chrome.storage.local.get(key).then(result => result[key])
}

export function SetExtensionSetting(key, value) {
	validate(key)
	return GetSettings().then(settings => {
		settings = settings ?? {}
		settings[key] = value
		chrome.storage.local.set({'settings': settings})
		return settings
	})
}

function validate(key) {
	if (!Object.values(settings).includes(key))
		throw `${key} is not a valid setting`
}
