import { Client, Constants } from "oceanic.js";
import { Pool } from "pg";
import { BOT_TOKEN } from "../config";

export const bot = new Client({
	auth: `Bot ${BOT_TOKEN}`,
	gateway: {
		intents: Constants.AllNonPrivilegedIntents | Constants.Intents.MESSAGE_CONTENT | Constants.Intents.GUILD_MEMBERS
	},
	allowedMentions: {},
});
export const database = new Pool;
