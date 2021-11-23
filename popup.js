// Initialize button with user's preferred color
let changeColor = document.getElementById("changeColor")
let loadFigmaDoc = document.getElementById("loadFigmaDoc")
let docIdInput = document.getElementById("docId")
let docNameInput = document.getElementById("docName")
let userTokenInput = document.getElementById("userToken")

//TODO: store user token

loadFigmaDoc.addEventListener('click', async (e) => {
	loadFigmaDoc.setAttribute('disabled', 'disabled')
	chrome.runtime.sendMessage({
		docId: docIdInput.value,
		docName: docNameInput.value,
		userToken: userTokenInput.value
	}, function (response) {
		console.log(response);
		loadFigmaDoc.disabled = false
	});
})