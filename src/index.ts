// Require the necessary discord.js classes
import * as fs from 'fs';
import * as path from 'path';
import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import * as config from './config/config.json';
import { messageEventHandler } from './message/event-handler';
import { Config } from './type'

declare module "discord.js" {
	export interface Client {
		commands: Collection<unknown, any>
	}
}

const client: Client = new Client({
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	intents: [
		GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates
	]
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, './commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.on('messageCreate', async message => {

	await messageEventHandler(message);

});

client.login((config as Config).token);