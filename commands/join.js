exports.run = function(client, msg, args) {
	const tableload = client.guildconfs.get(msg.guild.id);
	let addedrole = args.slice().join(' ');
    const foundRole = msg.guild.roles.find(role => role.name.toLowerCase() === args.slice().join(' ').toLowerCase());
    const author = msg.guild.get(msg.author.id);

	if (addedrole.length < 1) return msg.reply('You must specify the name of the role!').then(m => m.delete(10000));
	if (!foundRole) return msg.reply('Höh ... This role does not exist at all!').then(m => m.delete(10000));
for (var i = 0; i < tableload.selfassignableroles.length; i++) {
	if (foundRole.id === tableload.selfassignableroles[i]) {
        author.addRole(foundRole);
        return msg.channel.send('Role successfully assigned!').then(m => m.delete(10000));
    }
}
};

exports.conf = {
	enabled: true,
	guildOnly: true,
	aliases: []
};
exports.help = {
	name: 'join',
	description: 'Join a self-assignable role',
	usage: 'join {rolename}',
	example: 'join Member',
	category: 'utility'
};
