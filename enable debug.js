const originalBlob = window.Blob;

window.Blob = function(a) {
	console.log(arguments);
	let result = originalBlob.apply(this, arguments);
	return result;
};

const consoleLog = console.log;
console.log = function() {
	consoleLog.apply(this, arguments);
	console.info(arguments);
};