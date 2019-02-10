const LenoxCommand = require('../LenoxCommand.js');
const Discord = require('discord.js');
const config = require('../../settings.json');
const moment = require('moment');
require('moment-duration-format');
const { Util } = require('discord.js');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const youtube = new YouTube(config.googlekey);

module.exports = class playCommand extends LenoxCommand {
	constructor(client) {
		super(client, {
			name: 'play',
			group: 'music',
			memberName: 'play',
			description: 'Searches for music that matches to your request',
			format: 'play {query}',
			aliases: [],
			examples: ['play Gangnam Style'],
			clientPermissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK'],
			userPermissions: [],
			shortDescription: 'Musicplayersettings',
			dashboardsettings: true
		});
	}

	async run(msg) {
		const langSet = msg.client.provider.getGuild(msg.message.guild.id, 'language');
		const lang = require(`../../languages/${langSet}.json`);
		const queue = msg.client.queue;
		const skipvote = msg.client.skipvote;
		const input = msg.content.split(' ');
		const searchString = input.slice(1).join(' ');
		const url = input[1] ? input[1].replace(/<(.+)>/g, '$1') : '';
		moment.locale(msg.client.provider.getGuild(msg.message.guild.id, 'momentLanguage'));


		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send(lang.play_notvoicechannel);

		for (let i = 0; i < msg.client.provider.getGuild(msg.message.guild.id, 'musicchannelblacklist').length; i++) {
			if (voiceChannel.id === msg.client.provider.getGuild(msg.message.guild.id, 'musicchannelblacklist')[i]) return msg.reply(lang.play_blacklistchannel);
		}

		async function play(guild, song) {
			const serverQueue = await queue.get(guild.id);

			if (!song) {
				await serverQueue.voiceChannel.leave();
				await queue.delete(guild.id);
				return;
			}

			const stream = await ytdl(song.url, {
				filter: 'audioonly'
			});
			const dispatcher = await serverQueue.connection.playStream(stream)
				.on('end', async reason => {
					if (reason === 'Stream is not generating quickly enough.');
					serverQueue.songs.shift('Stream is not generating quickly enough');
					await play(guild, serverQueue.songs[0]);
				})
				.on('error', error => console.error(error));
			dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

			const vote = {
				users: []
			};
			skipvote.set(msg.guild.id, vote);

			const duration = lang.play_duration.replace('%duration', song.duration);
			const published = lang.play_published.replace('%publishedatdate', song.publishedat);
			const embed = new Discord.RichEmbed()
				.setAuthor(lang.play_startplaying)
				.setDescription(duration)
				.setThumbnail(song.thumbnail)
				.setColor('#009900')
				.setURL(song.url)
				.setFooter(published)
				.setTitle(song.title);

			return msg.channel.send({
				embed
			});
		}

		async function handleVideo(video, playlist) {
			const serverQueue = queue.get(msg.guild.id);
			const song = {
				duration: moment.duration(video.duration).format(`d[ ${lang.messageevent_days}], h[ ${lang.messageevent_hours}], m[ ${lang.messageevent_minutes}] s[ ${lang.messageevent_seconds}]`),
				thumbnail: video.thumbnails.default.url,
				publishedat: video.publishedAt,
				id: video.id,
				title: Util.escapeMarkdown(video.title),
				url: `https://www.youtube.com/watch?v=${video.id}`
			};

			if (moment.duration(video.duration).format('m') > 30 && msg.client.provider.getUser(msg.author.id, 'premium').status === false) return msg.reply(lang.play_songlengthlimit);

			if (serverQueue) {
				if (serverQueue.songs.length > 8 && msg.client.provider.getGuild(msg.message.guild.id, 'premium').status === false) return msg.reply(lang.play_limitreached);
				await serverQueue.songs.push(song);
				if (playlist) return;

				const duration = lang.play_duration.replace('%duration', song.duration);
				const published = lang.play_published.replace('%publishedatdate', song.publishedat);
				const embed = new Discord.RichEmbed()
					.setAuthor(lang.play_songadded)
					.setDescription(duration)
					.setThumbnail(song.thumbnail)
					.setColor('#009900')
					.setURL(song.url)
					.setFooter(published)
					.setTitle(song.title);

				return msg.channel.send({
					embed
				});
			} else {
			/* eslint no-else-return: 0 */
				const queueConstruct = {
					textChannel: msg.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 2,
					playing: true
				};
				await queue.set(msg.guild.id, queueConstruct);

				await queueConstruct.songs.push(song);

				const vote = {
					users: []
				};

				skipvote.set(msg.guild.id, vote);

				try {
					const connection = await voiceChannel.join();
					queueConstruct.connection = connection;
					await play(msg.guild, queueConstruct.songs[0]);
				} catch (error) {
					console.log(error);
					await queue.delete(msg.guild.id);
					await skipvote.delete(msg.guild.id);
					return msg.channel.send(lang.play_errorjoin);
				}
			}
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			const serverQueue = queue.get(msg.guild.id);

			if ((Object.keys(videos).length + (serverQueue ? serverQueue.songs.length : 0)) > 8 && msg.client.provider.getGuild(msg.message.guild.id, 'premium').status === false) return msg.reply(lang.play_limitreached);

			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id);
				await handleVideo(video2, true);
			}
			const playlistadded = lang.play_playlistadded.replace('%playlisttitle', `**${playlist.title}**`);
			return msg.channel.send(playlistadded);
		}
		let video;
		try {
			video = await youtube.getVideo(url);
		} catch (error) {
			try {
				const videos = await youtube.searchVideos(searchString, 10);

				if (videos.length === 0) return msg.channel.send(lang.play_noresult);

				let index = 0;
				const embed = new Discord.RichEmbed()
					.setColor('#7BB3FF')
					.setDescription(`${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}`)
					.setAuthor(lang.play_songselection, 'https://cdn.discordapp.com/attachments/355972323590930432/357097120580501504/unnamed.jpg');

				const embed2 = new Discord.RichEmbed()
					.setColor('#0066CC')
					.setDescription(lang.play_value);
				msg.channel.send({
					embed
				});
				msg.channel.send({
					embed: embed2
				});

				let response;
				try {
					response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11 && msg.author.id === msg2.author.id, {
						maxMatches: 1,
						time: 20000,
						errors: ['time']
					});
				} catch (err) {
					return msg.channel.send(lang.play_error);
				}
				const videoIndex = parseInt(response.first().content, 10);
				video = await youtube.getVideoByID(videos[videoIndex - 1].id);
			} catch (err) {
				return msg.channel.send(lang.play_noresult);
			}
		}
		handleVideo(video, false);
	}
};
