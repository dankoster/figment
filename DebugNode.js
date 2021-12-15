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
	
	get renderTree() {
		if (!this._renderTree) {

			var fiber = this.fiber
			var fiberTree = []
			while (fiber) {
				fiberTree.push(fiber)
				fiber = fiber._debugOwner
			}

			let rawRenderTree = fiberTree.map(fiber => {
				return {
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