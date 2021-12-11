export default class DebugNode {
	constructor(element) {
		this.element = element
		this.fiber = DebugNode.FindReactFiber(element)

		this.debugSource = this.fiber?._debugSource
		this.debugOwner = this.fiber?._debugOwner
		this.debugOwnerName = this.debugOwner?.elementType?.name || this.debugOwner?.elementType?.render?.name
		this.figmaId = this.stateNode?.getAttribute && this.stateNode.getAttribute('data-figment')
		
		this.debugOwnerSymbolType = typeof this.debugOwner?.elementType?.$$typeof === 'symbol' 
		? Symbol.keyFor(this.debugOwner?.elementType?.$$typeof) : undefined

		let ds = this.debugSource
		this.debugFile = ds?.fileName?.substr(ds?.fileName?.lastIndexOf('/')+1)
		this.debugPath = this.debugFile && [this.debugFile, ds?.lineNumber, ds?.columnNumber].join(':')
		this.sourceUrl = ds && `vscode://file${ds?.fileName}:${ds?.lineNumber}:${ds?.columnNumber}`
		this.renderedAtUrl = ds && [
			`vscode://file${ds?.fileName}`,
			ds?.lineNumber,
			ds?.columnNumber
		].join(':')

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