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
		let stateNode = this.fiber.stateNode;
		if (!stateNode) {
			while (this.fiber && !stateNode) {
				this.fiber = this.fiber.child || this.fiber.sibling;
				stateNode = this.fiber?.stateNode;
			}
		}
		return stateNode as HTMLElement;
	}

	get filePath() { return filePath(this.fiber) }

	get fileName() { return fileName(this.filePath) }

	get vsCodeUrl() { return vsCodeUrl(this.filePath) }

};

function filePath(fiber: any) {
	return fiber?._debugSource &&
		[fiber._debugSource?.fileName, fiber._debugSource?.lineNumber, fiber._debugSource?.columnNumber].join(':');
}

function fileName(filePath: string) {
	return filePath?.substring(filePath.lastIndexOf('/') + 1) ?? '';
}

function vsCodeUrl(filePath: string) {
	return `vsCode://file${filePath}`;
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

export function flatMapAllChildren(element: Element | null) {
	const result: Element[] = []
	if (!element)
		return result

	result.push(element)
	for (const child of element.children) {
		const childNodes = flatMapAllChildren(child)
		for (const childNode of childNodes) {
			result.push(childNode)
		}
	}

	return result
}

export function flatMapAllReactComponents(elements: Element[]) {
	const result = new Map<string, string>()
	for (const element of elements) {
		let fiber = FindReactFiber(element)
		if (fiber) {

			let prevFiber
			while (fiber) {
				const kind = tags[fiber.tag] as Kind
				if (kind != "HostComponent") {
					const name = fiberTypeName(fiber)
					if(!result.has(name)) {
						const url = vsCodeUrl(prevFiber?._debugSource?.fileName)
						result.set(name, url)
					}
					break
				}
				prevFiber = fiber
				fiber = fiber.return;
			}
		}
	}
	return result
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