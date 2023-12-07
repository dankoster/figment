export default function Trace(message) {
	let trace = {}
	Error.captureStackTrace(trace) //in typescript: eval('Error.captureStackTrace(this.trace)')
	let stack = Array.from(trace.stack.normalize().matchAll('(?<=at ).*'), at => at[0])
	let caller = stack[2]
	let callee = stack[1].substring(0, stack[1].indexOf(' '))
	console.groupCollapsed(message || `${caller} --> ${callee}`)
	stack.slice(1).forEach(s => console.log(s))
	console.groupEnd()
	let started = new Date()

	return {
		caller, callee, stack, started,
		elapsed: (message) => {
			let d = new Date(Date.now() - started).toISOString()
			console.log(message || caller, d.substring(d.lastIndexOf('T') + 1, d.length - 1))
		}
	}
}