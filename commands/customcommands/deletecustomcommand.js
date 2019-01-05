const LenoxCommand = require('../LenoxCommand.js');

module.exports = class deletecustomcommandCommand extends LenoxCommand {
	constructor(client) {
		super(client, {
			name: 'deletecustomcommand',
			group: 'customcommands',
			memberName: 'deletecustomcommand',
			description: 'Deletes a custom command',
			format: 'deletecustomcommand {name of the custom command}',
			aliases: ['dcc'],
			examples: ['deletecustomcommand test221'],
			clientPermissions: ['SEND_MESSAGES'],
			userPermissions: ['ADMINISTRATOR'],
			shortDescription: 'Customcommands',
			dashboardsettings: true
		});
	}

	async run(msg) {
		const langSet = msg.client.provider.getGuild(msg.message.guild.id, 'language');
		const lang = require(`../../languages/${langSet}.json`);
		const args = msg.content.split(' ').slice(1);

		if (args.slice(0).length === 0) return msg.reply(lang.deletecustomcommand_noinput);

		for (let i = 0; i < msg.client.provider.getGuild(msg.message.guild.id, 'customcommands').length; i++) {
			if (msg.client.provider.getGuild(msg.message.guild.id, 'customcommands')[i].name.toLowerCase() === args.slice(0).join(' ').toLowerCase()) {
				const currentCustomcommands = msg.client.provider.getGuild(msg.message.guild.id, 'customcommands');
				currentCustomcommands.splice(i, 1);
				await msg.client.provider.setGuild(msg.message.guild.id, 'customcommands', currentCustomcommands);

				return msg.reply(lang.deletecustomcommand_deleted);
			}
		}
		return msg.reply(lang.deletecustomcommand_notexists);
	}
};