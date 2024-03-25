import { getApiKey, setApiKey } from "./localStorage.js"


const keyInput = document.getElementById('key') as HTMLInputElement

const apiKey = getApiKey()
if(apiKey) keyInput.value = apiKey

keyInput.onchange = (e) => {
    const newValue = (e.target as HTMLInputElement)?.value

    console.log(newValue)
    setApiKey(newValue)
}