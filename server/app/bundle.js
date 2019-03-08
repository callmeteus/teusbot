const watchify 		= require("watchify");
const browserify 	= require("browserify");
const fs 			= require("fs");

function createBundle(file, target) {
	const bundle 		= browserify({
		entries: 		Array.isArray(file) ? file : [file],
		cache: 			{},
		packageCache: 	{}
	});

	bundle.plugin(watchify);

	function doBundle() {
		let b 		= bundle;
		b.bundle()
		.on("error", console.error)
		.pipe(fs.createWriteStream(target));
	}

	bundle.on("update", doBundle);

	doBundle();
}

createBundle("client/streamer/app.js", "client/www/streamer/js/app.js");
createBundle("client/overlay/app.js", "client/www/overlay/js/app.js");
createBundle("client/frontend/app.js", "client/www/js/app.js");