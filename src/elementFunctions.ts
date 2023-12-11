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


const tags: { [key: number]: string } = {
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

class RenderTreeNode {
	type: string;
	tag: string;
	kind: string;
	fiber: any;
	stateNode: HTMLElement;
	debugSource: any;

	constructor(fiber: any) {
		this.type = this.fiberTypeName(fiber);
		this.tag = fiber.tag;
		this.kind = tags[fiber.tag];
		this.fiber = fiber;
		this.debugSource = fiber._debugSource;

		this.stateNode = RenderTreeNode.getStateNode(fiber);
	}

	static getStateNode(fiber: any) {
		let stateNode = fiber.stateNode;
		if (!stateNode) {
			while (fiber && !stateNode) {
				fiber = fiber.child || fiber.sibling;
				stateNode = fiber?.stateNode;
			}
		}
		return stateNode;
	}

	get filePath() {
		return this.fiber?._debugSource &&
			[this.fiber._debugSource?.fileName, this.fiber._debugSource?.lineNumber, this.fiber._debugSource?.columnNumber].join(':');
	}

	get fileName() {
		return this.filePath?.substring(this.filePath.lastIndexOf('/') + 1) ?? '';
	}

	get vsCodeUrl() {
		return `vsCode://file${this.filePath}`;
	}

	fiberTypeName(f: any): string {
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
};

export function getRenderTree(element: HTMLElement) {

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
	return tree;
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