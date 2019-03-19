window.$ 					= require("jquery");

require("popper.js");
require("bootstrap");
require("ejs");

const sections 				= [];

sections.push(
{
	name: 					"Basic",
	description: 			"Bot basic commands",
	commands: 				[
		{
			name: 			"id",
			description: 	"Show your StreamCraft user id to use in another commands"
		},
		{
			name: 			"commands",
			description: 	"Show the command list"
		},
		{
			name: 			"nowplaying",
			description: 	"Show the current song that the streamer is listening to"
		},
		{
			name: 			"uptime",
			description: 	"Show the current stream duration"
		}
	]
},
{
	name: 					"Points",
	description: 			"You gain points chatting in the stream.",
	commands: 				[
		{
			name: 			"points <em><abbr title='StreamCraft account id'>id</abbr></em>",
			description: 	"Show an account amount of points. If <em>id</em> is not provided, it will show your amount of points"
		},
		{
			name: 			"points give <em><abbr title='StreamCraft account id'>id</abbr> <abbr title='Amount of points to sent'>amount</abbr></em>",
			description: 	"Transfer <em>amount</em> points from your account to <em>id</em> account",
		},
		{
			name: 			"points raffle <em><abbr title='Random code that the bot will send'>code</abbr></em>",
			description: 	"Every 10 minutes, Teus Bot will give a random amount of points. If you type the command with the code correctly, you win the points",
		},
		{
			name: 			"points set <em><abbr title='StreamCraft account id'>id</abbr> amount</em>",
			description: 	"Set an <em>amount</em> of points points to <em>id</em> StreamCraft account",
			mod: 			true
		},
		{
			name: 			"points alert <em><abbr title='Message to send to the stream screen'>message</abbr></em>",
			description: 	"Send a message to the stream screen. <strong>Attention:</strong> this will consume an amount of your points</strong>"
		},
		{
			name: 			"points gif <em><abbr title='Giphy GIF URL'>giphy url</abbr> <abbr title='Message to send along the GIF'>message</abbr></em>",
			description: 	"Send a GIF to the stream screen. <strong>Attention:</strong> this will consume an amount of your points</strong>"
		},
		{
			name: 			"points instant <em><abbr title='MyInstants URL'>instant url</abbr> <abbr title='Message to send along the instant'>message</abbr></em>",
			description: 	"Send an instant to the stream. <strong>Attention:</strong> this will consume an amount of your points</strong>"
		}
	]
},
{
	name: 					"Raffle",
	description: 			"Random watchers selection",
	commands: 				[
		{
			name: 			"raffle",
			description: 	"Enter the current raffle"
		},
		{
			name: 			"raffle start",
			description: 	"Start a new raffle",
			mod: 			true
		},
		{
			name: 			"raffle end",
			description: 	"End the current open raffle",
			mod: 			true
		},
		{
			name: 			"raffle clear",
			description: 	"Clear the current open raffle",
			mod: 			true
		}
	]
},
{
	name: 					"Ranking",
	description: 			"Stream rankings",
	commands: 				[
		{
			name: 			"ranking messages",
			description: 	"Show the top users that sent more messages"
		},
		{
			name: 			"ranking points",
			description: 	"Show the top users that has more points"
		}
	]
},
{
	name: 					"Song Request",
	description: 			"In-stream open playlist module",
	commands: 				[
		{
			name: 			"songrequest <em><abbr title='Video / song link'>url</abbr></em>",
			description: 	"Requests a new song. URL needs to be from YouTube (youtu.be, youtube.com), Vimeo (vimeo.com) or SoundCloud (soundcloud.com)"
		},
		{
			name: 			"songrequest open",
			description: 	"Open the song request playlist to accept new songs",
			mod: 			true
		},
		{
			name: 			"songrequest close",
			description: 	"Close the song request playlist to accept new songs",
			mod: 			true
		}
	]
},
{
	name: 					"Vote",
	description: 			"Make in-stream votings easy",
	commands: 				[
		{
			name: 			"vote <em><abbr title='Option to vote'>option</abbr></em>",
			description: 	"Vote in an option"
		},
		{
			name: 			"vote votestart <em><abbr title='Options to vote, separated by spaces'>options</abbr></em>",
			description: 	"Open a new vote poll. You can include as many options as you want separated by spaces",
			mod: 			true
		},
		{
			name: 			"vote voteend",
			description: 	"Ends and get the results for the current open poll",
			mod: 			true
		}
	]
}
);

sections
.sort(function(a, b) {
	return a.name.localeCompare(b.name);
})
.forEach(function(section) {
	$("#accordion").append(ejs.render(`
		<div class="card mb-2">
			<div class="card-header">
				<a href="#" data-toggle="collapse" data-target="#collapse<%=data.name.replace(/ /g, "")%>"><%=data.name%></a>
			</div>

			<div id="collapse<%=data.name.replace(/ /g, "")%>" class="collapse" data-parent="#accordion">
				<div class="card-body">
					<%=data.description%>

					<div class="list-group mt-3">
						<% 
							data.commands.sort(function(a, b) { return a.name.localeCompare(b.name) }).forEach(function(command) { %>
							<div class="list-group-item">
								<strong>!<%-command.name%></strong>
								<% if (command.mod === true) { %>
									<i class="fa fa-fw fa-user-shield text-danger ml-2" title="Moderation exclusive command"></i>
								<% } %>
								<br/>
								<%-command.description%>
							</div>
						<% }); %>
					</div>
				</div>
			</div>
		</div>
	`, { data: section }));
});

$("#accordion .collapse:first").addClass("show");