export default class DebugNode {
	constructor(element) {
		this.element = element
		this.fiber = DebugNode.FindReactFiber(element)
	}

	get debugOwner() { 
		return this.fiber?._debugOwner 
	}
	get debugOwnerName() { 
		return this.debugOwner?.elementType?.name || this.debugOwner?.elementType?.render?.name 
	}
	get debugOwnerSymbolType() {
		return typeof this.debugOwner?.elementType?.$$typeof === 'symbol' 
		? Symbol.keyFor(this.debugOwner?.elementType?.$$typeof) : undefined
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

	get figmaId() { 
        return this.stateNode?.getAttribute && this.stateNode.getAttribute('data-figment') 
    }

	//https://stackoverflow.com/a/39165137
	//https://github.com/Venryx/mobx-devtools-advanced/blob/master/Docs/TreeTraversal.md
	static FindReactFiber(dom) {
		const key = Object.keys(dom).find(key => {
			return key.startsWith("__reactFiber$") // react 17+
				|| key.startsWith("__reactInternalInstance$"); // react <17
		});
		return dom[key]
	}
}

