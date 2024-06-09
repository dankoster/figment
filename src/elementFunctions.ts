export function getElementPath(element: any) {
	let path: any[] = [];
	let currentElem = element;
	while (currentElem) {
		path.push(currentElem);
		currentElem = currentElem.parentElement;
	}
	if (path.indexOf(window) === -1 && path.indexOf(document) === -1) {
		path.push(document);
	}
	if (path.indexOf(window) === -1) {
		path.push(window);
	}
	return path;
}

export function removeElementsByTagName(tagName: string) {
	const elements = document.getElementsByTagName(tagName)
	Array.from(elements).forEach(element => element.remove())
}

type Kind =
	| 'FunctionComponent'
	| 'ClassComponent'
	| 'IndeterminateComponent'
	| 'HostRoot'
	| 'HostPortal'
	| 'HostComponent'
	| 'HostText'
	| 'Fragment'
	| 'Mode'
	| 'ContextConsumer'
	| 'ContextProvider'
	| 'ForwardRef'
	| 'Profiler'
	| 'SuspenseComponent'
	| 'MemoComponent'
	| 'SimpleMemoComponent'
	| 'LazyComponent'


const tags: { [key: number]: Kind } = {
	0: 'FunctionComponent',
	1: 'ClassComponent',
	2: 'IndeterminateComponent',
	3: 'HostRoot',
	4: 'HostPortal',
	5: 'HostComponent',
	6: 'HostText',
	7: 'Fragment',
	8: 'Mode',
	9: 'ContextConsumer',
	10: 'ContextProvider',
	11: 'ForwardRef',
	12: 'Profiler',
	13: 'SuspenseComponent',
	14: 'MemoComponent',
	15: 'SimpleMemoComponent',
	16: 'LazyComponent',
};

export class RenderTreeNode {
	type: string;
	tag: string;
	kind: string;
	fiber: any;
	debugSource: any;

	constructor(fiber: any) {
		this.type = fiberTypeName(fiber);
		this.tag = fiber.tag;
		this.kind = tags[fiber.tag];
		this.fiber = fiber;
		this.debugSource = fiber._debugSource;
	}

	get stateNode() {
		let stateNode = this.fiber?.stateNode;
		if (!stateNode) {
			while (this.fiber && !stateNode) {
				this.fiber = this.fiber.child || this.fiber.sibling;
				stateNode = this.fiber?.stateNode;
			}
		}
		return stateNode as HTMLElement;
	}

	get filePath() {
		return this.debugSource &&
			[this.debugSource?.fileName, this.debugSource?.lineNumber, this.debugSource?.columnNumber].join(':');
	}

	get fileName() { return fileName(this.filePath) }

	get vsCodeUrl() { return vsCodeUrl(this.filePath) }

};

function filePath(debugSource: {fileName: string, lineNumber: string, columnNumber: string}) {
	return debugSource && [debugSource.fileName, debugSource.lineNumber, debugSource.columnNumber].join(':')
}

function fileName(filePath: string) {
	return filePath?.substring(filePath.lastIndexOf('/') + 1) ?? '';
}

function vsCodeUrl(filePath: string) {
	return filePath && `vsCode://file${filePath}`;
}

function fiberTypeName(f: any): string {
	let t = typeof f?.type;
	let result;

	if (t === 'string') {
		result = f.type;
	} else if (t === 'object') {
		if (f.type?.displayName) {
			result = f.type?.displayName;
		}
		//else if (typeof f.type?.$$typeof == 'symbol') result = f.type.$$typeof.description
		//else Object.getPrototypeOf(f.type??{})?.constructor.name
	} else if (t === 'function') {
		result = f.type.name;
	} else {
		result = t;
	}

	return result;
}

const cache: {
	element?: HTMLElement,
	tree?: RenderTreeNode[],
} = {}

export function getReactRenderTree(element: HTMLElement) {

	if (cache.element === element && cache.tree) return cache.tree

	const path = getElementPath(element);
	let fiber = FindReactFiber(path[0]);

	//what we really need is this, from the react-devtools
	//https://github.com/facebook/react/blob/3b3daf5573efe801fa3dc659020625b4023d3a9f/packages/react-devtools-shared/src/backend/renderer.js#L3033

	const { _debugOwner } = fiber || {};
	const owners = [fiber];

	if (_debugOwner) {
		let owner = _debugOwner;
		while (owner) {
			owners.push(owner);
			owner = owner._debugOwner;
		}
	}

	let ft: any[] = [];
	while (fiber) {
		ft.push(fiber);
		fiber = fiber.return;
	}

	let normalized = ft.map(f => new RenderTreeNode(f));

	const tree = normalized.filter(f => f.type);

	cache.element = element
	cache.tree = tree

	return tree;
}

export type SelectorInfo = {
	selector: string
	url: string
}
export type ReactComponentInfo = {
	name: string
	kind: string
	url: string
	selectors: SelectorInfo[]
}

export function findReactComponents(element: Element | null): ReactComponentInfo[] {
	const result: ReactComponentInfo[] = []

	if (!element)
		return result

	let fiber = FindReactFiber(element)
	if (fiber?.return) {
		const return_kind = tags[fiber.return.tag] as Kind
		if (return_kind == 'Fragment') {
			const url = vsCodeUrl(filePath(fiber._debugSource))
			let name = fiberTypeName(fiber.return)
			let type = fiber.type
			while(!name) {
				fiber = fiber.return.return
				name = fiberTypeName(fiber.return)
			}
			result.push({
				name: `${name}.${return_kind}(${type})`,
				kind: return_kind,
				url,
				selectors: [{ 
					selector: getSelector(element), 
					url: vsCodeUrl(filePath(fiber.return._debugSource)) 
				}]
			})
		}
		else if (return_kind == 'ForwardRef') {
			const name = fiberTypeName(fiber)
			result.push({
				name,
				kind: return_kind,
				url: vsCodeUrl(filePath(fiber._debugSource)),
				selectors: [{ 
					selector: getSelector(element), 
					url: vsCodeUrl(filePath(fiber.return._debugSource)) 
				}]
			})
		}
		else if (return_kind != 'HostComponent') {
			const name = fiberTypeName(fiber.return)
			result.push({
				name,
				kind: return_kind,
				url: vsCodeUrl(filePath(fiber._debugSource)),
				selectors: [{ 
					selector: getSelector(element), 
					url: vsCodeUrl(filePath(fiber.return._debugSource)) 
				}]
			})
		}

		// const kind = tags[fiber.tag] as Kind
		// if (kind == 'HostComponent') {
		// 	result.push({
		// 		name: fiberTypeName(fiber),
		// 		kind: kind,
		// 		url: vsCodeUrl(fiber._debugSource?.fileName),
		// 		selectors: [getSelector(element)]
		// 	})
		// }
	}

	for (const childElement of element.children) {
		const components = findReactComponents(childElement)
		for (const c of components) {
			//accumulate the distinct selectors for each component
			const index = result.findIndex(r => r.name === c.name)
			if (index >= 0) result[index].selectors.push(...c.selectors)
			else result.push(c)
		}
	}

	return result
}

//https://stackoverflow.com/a/66291608
function getSelector(element: Element) {
	if (element.tagName === "BODY") return "BODY";
	const names = [];
	while (element.parentElement && element.tagName !== "BODY") {
		if (element.id) {
			names.unshift("#" + element.getAttribute("id")); // getAttribute, because `elm.id` could also return a child element with name "id"
			break; // ID should be unique
		} else {
			let c = 1, e = element;
			for (; e.previousElementSibling; e = e.previousElementSibling, c++);
			names.unshift(element.tagName + ":nth-child(" + c + ")");
		}
		element = element.parentElement;
	}
	return names.join(">");
}


function FindReactFiber(dom: any) {
	//https://stackoverflow.com/a/39165137
	//https://github.com/Venryx/mobx-devtools-advanced/blob/master/Docs/TreeTraversal.md
	const key: string | undefined = Object.keys(dom).find(key => {
		return key.startsWith("__reactFiber$") // react 17+
			|| key.startsWith("__reactInternalInstance$"); // react <17
	});
	return key && dom[key];
}