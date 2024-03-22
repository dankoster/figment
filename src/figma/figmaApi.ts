const figmaApiUrl = `https://api.figma.com/v1`
import { userToken } from "../figma/.env/figmaToken.js"
import * as local from "../localStorage.js"

export class FigmaSearch {
	// static FindByExactNameOrId({figma, name, id}) { return figma?.frames?.find(frame => frame.name === name || frame.id === decodeURIComponent(id)) }
	// static FindByRegex({figma, regex}) { return figma?.frames?.filter(frame => regex.test(frame.name.toLowerCase()))}
	// static SplitByCaps(searchTerm) { return new RegExp(searchTerm.split(/(?=[A-Z])/).map(str => str.toLowerCase()).join('|')) }
}

export function GetFigmaDocument({ docId, userToken, depth = 3 }: { docId: string, userToken: string, depth?: number }) {

	const request = FetchFigmaJson(`${figmaApiUrl}/files/${docId}?depth=${depth}`, userToken) as Promise<figma.GetFileResponse>
	request.then(doc => local.setDocument(docId, doc))
	
	return { cached: local.getDocument(docId), request }
}

//figma api is really slow, but we can query for multiple images at once.
const imageRequestIds = new Set<string>()
let imageRequest: Promise<{ [key: string]: string }> | undefined
export function enqueueImageRequest(docId: string, nodeId: string): {cachedResult: string | null; imageRequest: Promise<{ [key: string]: string }>} {
	imageRequestIds.add(nodeId)

	if (!imageRequest) {
		imageRequest = new Promise((resolve, reject) => {
			//wait for all the requests to come in and THEN send the api request
			setTimeout(() => {
				//dequeue the ids collected so far
				const ids = [...imageRequestIds]
				imageRequestIds.clear()

				//make a single request for the dequeued ids
				GetFigmaImages({ docId, userToken, ids })
					.then(result => {
						for(const nodeId in result) 
							local.setImage({docId, nodeId, url: result[nodeId]})
						return result
					})
					.then(result => resolve(result))
					.catch(reason => reject(reason))
					.finally(() => { imageRequest = undefined })
			})
		})
	}

	const cachedResult = local.getImage(docId, nodeId)

	return { cachedResult, imageRequest };
}


async function GetFigmaImages({ docId, userToken, ids }: { docId: string, userToken: string, ids: string[] }) {

	if (!Array.isArray(ids)) throw `${ids} is not an array`
	if (!ids.length) throw `${ids} can not be empty`

	let idCsv = ids.map(id => encodeURIComponent(id)).join(',')
	let url = `${figmaApiUrl}/images/${docId}?ids=${idCsv}`
	let json = await FetchFigmaJson(url, userToken)

	//json
	// {
	// 	"err": null,
	// 	"images": {
	// 	  "1142:89093": "https://s3-us-west-2.amazonaws.com/figma-alpha-api/img/449f/65b7/42e321c65c299b36a5b1e973763c4bef",
	// 	  "1382:106541": "https://s3-us-west-2.amazonaws.com/figma-alpha-api/img/a491/8f09/ffb0d33e7aa56fc4448a0e29cc45de9d"
	// 	}
	// }

	if (json.err) throw json.err

	return json.images as { [key: string]: string }
}

async function FetchFigmaJson(url: string, userToken: string) {
	let headers = new Headers();
	headers.append('Accept', 'text/json');
	headers.append('X-FIGMA-TOKEN', userToken)

	let request = new Request(url);
	let response = await fetch(request, {
		method: 'GET',
		headers,
		mode: 'cors',
		cache: 'default'
	})

	if (!response.ok && response.status === 403) throw 'Not Authorized!'

	return response.json()
}

