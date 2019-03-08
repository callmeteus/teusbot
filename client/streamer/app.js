window.$ 		= require("jquery");

require("popper.js");
require("bootstrap");

const context 	= {
	ejs: 		require("ejs"),
	bootbox: 	require("bootbox/dist/bootbox.min")
};

require("./partials/app")(context);
require("./partials/commands")(context);
require("./partials/timers")(context);
require("./partials/dashboard")(context);
require("./partials/songRequest")(context);
require("./partials/test")(context);
require("./partials/login")(context);
require("./partials/settings")(context);