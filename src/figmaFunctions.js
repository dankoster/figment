
function refreshFigmaNodes({name, figmaId, menu}) {
	SearchFigmaData({ name: name, id: figmaId })
	.then((figmaData) => renderFigmaMenuItems(figmaData, menu))
}

function renderFigmaMenuItems(figmaData, menu) {

	//remove old items
	document.querySelectorAll('.menu-btn, .figma-info').forEach(e => e.remove());
	
	menu.AddSeparator({extraClasses: 'figma-info'})

	if (Number.isInteger(figmaData?.recordCount)) {
		menu.AddItem(new MenuItem({
			text: `total frames: ${figmaData?.recordCount}`,
			extraClasses: ['menu-info', 'figma-info']
		}))
	}

	if (figmaData?.lastModified) {
		let lastModified = new Date(figmaData.lastModified).toLocaleString()
		menu.AddItem(new MenuItem({
			text: `last modified ${lastModified}`,
			extraClasses: ['menu-info', 'figma-info']
		}))
	}

	if (figmaData?.searchTerms) {
		menu.AddItem(new MenuItem({
			text: `search terms: ${figmaData?.searchTerms}`,
			extraClasses: ['menu-info','figma-info']
		}))
	}

	let container = menu.AddScrollingContainer({extraClasses: 'figma-info'})

	//add an array of results
	if (Array.isArray(figmaData?.result) && figmaData?.result?.length) {
		figmaData?.result?.forEach(item => addFigmaItem(item, container))
	}
	//add a single result
	else if(figmaData?.result?.id) {
		addFigmaItem(figmaData.result, container)
	}

	//requet image links for each figma item
	let ids = figmaData?.result?.map(r => r.id)
	if(Array.isArray(ids) && ids.length) {
		let trace = Trace('request image links')
		GetFigmaImageLinks(ids).then(linkById => {
			trace.elapsed('got image links')
			console.log({ linkById })
			//update each search result with it's image url 
			menu.items.forEach(m => {
				if(m.id !== undefined && linkById.hasOwnProperty(m.id)) {
					m.imageSrc = linkById[m.id]
					m.imageHeight = container.offsetTop + 30 //set the height of the image so it's bottom doesnt' overlap the top of the scrolling container
				}
				else {
					console.warn(`linkById does not have property m.id which is ${m.id}`, {m})
				}
			})
		}).catch(e => {
			console.warn(e)
		}).finally(() => {
			trace.elapsed('done processing images')
		})
	}

	function addFigmaItem(item, container) {
		let { id, name, link, imageSrc } = item
		menu.AddItem(new MenuItem({
			id,
			text: name,
			href: link,
		}), container)
	}
}