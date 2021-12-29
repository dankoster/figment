export default class DebugNode {
	constructor(element) {
		this.element = element
		this.fiber = DebugNode.FindReactFiber(element)

		this.debugSource = this.fiber?._debugSource
		this.debugOwner = this.fiber?._debugOwner
		this.debugOwnerName = this.debugOwner?.elementType?.name || this.debugOwner?.elementType?.render?.name
		this.figmaId = this.stateNode?.getAttribute && this.stateNode.getAttribute('data-figment')
		
		this.debugOwnerSymbolType = typeof this.debugOwner?.elementType?.$$typeof === 'symbol' 
		? this.debugOwner?.elementType?.$$typeof.description : undefined

		let ds = this.debugOwner?._debugSource
		this.debugFile = ds?.fileName?.substr(ds?.fileName?.lastIndexOf('/')+1)
		this.debugPath = this.debugFile && [this.debugFile, ds?.lineNumber, ds?.columnNumber].join(':')
		this.sourceUrl = ds && `vscode://file${ds?.fileName}:${ds?.lineNumber}:${ds?.columnNumber}`
		this.renderedAtUrl = ds && [
			`vscode://file${ds?.fileName}`,
			ds?.lineNumber,
			ds?.columnNumber
		].join(':')
	}

	get renderedByFileName() {
		let ds = this.renderTree[1]
		return ds.file.substr(ds.file.lastIndexOf('/')+1)
	}

	get renderedByVsCodeLink() { 
		let ds = this.renderTree[1]
		return ds && `vscode://file${ds.file}`
	}

//2 Before we know whether it is function or class
//3 Root of a host tree. Could be nested inside another node.
//4 A subtree. Could be an entry point to a different renderer.

	get betterRenderTree() {

		//what we really need is this, from the react-devtools
		//https://github.com/facebook/react/blob/3b3daf5573efe801fa3dc659020625b4023d3a9f/packages/react-devtools-shared/src/backend/renderer.js#L3033

		if (!this._betterRenderTree) {


			const {_debugOwner} = this.fiber
			const owners = [this.fiber]

			if (_debugOwner) {
				let owner = _debugOwner
				while (owner) {
					owners.push(owner)
					owner = owner._debugOwner
				}
			}

			const tag = {
				0:  'FunctionComponent',
				1:  'ClassComponent',
				2:  'IndeterminateComponent',
				3:  'HostRoot',
				4:  'HostPortal',
				5:  'HostComponent',
				6:  'HostText',
				7:  'Fragment',
				8:  'Mode',
				9:  'ContextConsumer',
				10: 'ContextProvider',
				11: 'ForwardRef',
				12: 'Profiler',
				13: 'SuspenseComponent',
				14: 'MemoComponent',
				15: 'SimpleMemoComponent',
				16: 'LazyComponent',
			}
			  


			let fiber = this.fiber
			let ft = []
			while (fiber) {
				ft.push(fiber)
				fiber = fiber.return
			}

			let normalized = ft.map(f => {
				let result = {}
				result.type = this.fiberTypeName(f)
				result.tag = f.tag
				result.kind = tag[f.tag]
				result.file = f._debugSource && [f._debugSource?.fileName, f._debugSource?.lineNumber, f._debugSource?.columnNumber].join(':')
				result.stateNode = f.stateNode
				result.fiber = f
				return result
			})

			// let consolidated = normalized.reduce((result, cur, index, array) => {
			// 	if (!result.length) result.push(cur)
			// 	else {
			// 		if(Object.values(result[result.length - 1]).every(x => x))
			// 			result.push(cur)
			// 		else {
			// 			result[result.length - 1].type = [result[result.length - 1].type, cur.type].filter(t=>t).join('/')
			// 			if (!result[result.length - 1].file) result[result.length - 1].file = cur.file
			// 			if (!result[result.length - 1].stateNode) result[result.length - 1].stateNode = cur.stateNode
			// 		}
			// 	}

			// 	return result

			// }, [])


			this._betterRenderTree = normalized.filter(f => f.type)
		}
		return this._betterRenderTree
	}
	
	get renderTree() {
		if (!this._renderTree) {

			var fiber = this.fiber
			var fiberTree = []
			while (fiber) {
				fiberTree.push(fiber)
				fiber = fiber._debugOwner
			}

			let rawRenderTree = fiberTree.map(fiber => {
				let f = fiber
				let sn = fiber.stateNode
				while(!sn && f.return) {
					sn = f.stateNode
					f = f.return
				}
				return {
					fiber,
					closestElement: sn,
					name: fiber._debugOwner?.elementType?.name
						|| fiber._debugOwner?.elementType?.render?.name
						|| fiber._debugOwner?.elementType?.$$typeof?.description,
					file: fiber._debugSource && `${fiber._debugSource?.fileName}:${fiber._debugSource?.lineNumber}:${fiber._debugSource?.columnNumber}`
				}
			})

			this._renderTree = rawRenderTree.reduce((result, cur, index, array) => {
				if (!result.length) result.push(cur)
				else {
					if (!cur.file)
						result[result.length - 1].name += `/${cur.name}`
					else if (!result[result.length - 1].file) {
						result[result.length - 1].name += `/${cur.name}`
						result[result.length - 1].file = cur.file
					}
					else
						result.push(cur)
				}

				return result

			}, [])
		}

		return this._renderTree
	}

	get stateNode() {
		//walk down the child tree until we find one with a state node
		let child = this.debugOwner?.child
		let stateNode = child?.stateNode
		while (!stateNode && child) {
			child = child?.child
			stateNode = child?.stateNode
		}
		return stateNode
	}

	fiberTypeName(f) {
		let t = typeof f?.type
		let result

		if (t == 'string') result = f.type
		else if (t == 'object') {
			if (f.type?.displayName) result = f.type?.displayName
			//else if (typeof f.type?.$$typeof == 'symbol') result = f.type.$$typeof.description
			//else Object.getPrototypeOf(f.type??{})?.constructor.name
		}
		else if (t == 'function') result = f.type.name
		else result = t

		return result
	}


	static FindReactFiber(dom) {
		//https://stackoverflow.com/a/39165137
		//https://github.com/Venryx/mobx-devtools-advanced/blob/master/Docs/TreeTraversal.md
		const key = Object.keys(dom).find(key => {
			return key.startsWith("__reactFiber$") // react 17+
				|| key.startsWith("__reactInternalInstance$"); // react <17
		});
		return dom[key]
	}
}