import { DiscordRESTError, JSONErrorCodes, Permissions } from "oceanic.js";
import { escape_all } from "../../common/markdown";
import { get_highest_role } from "../../common/member";
import { create_dm_cached, format_rest_error, get_member_cached, get_user_cached } from "../../common/rest";
import { FlagType, define_command } from "../../plugin/types";

export const ban_command = define_command({
	id: "ban",

	flags: {
		user: {
			type: FlagType.USER,
			id: "user",
			array: true,
			primary: true,
			required: true,
		},
		reason: {
			type: FlagType.STRING,
			id: "reason",
		},
		dm: {
			type: FlagType.VOID,
			id: "dm",
		},
		no_dm: {
			type: FlagType.VOID,
			id: ["no-dm", "!dm"],
		},
	},

	async run(context, args) {
		if (context.guild === null)
			return;

		if (!context.member?.permissions?.has(Permissions.BAN_MEMBERS))
			return;

		let successful_bans: { id: string, name: string, dm_sent: boolean; }[] = [];
		let unsuccessful_bans: { id: string, name: string, error: string; }[] = [];

		for (const id of args.user) {
			let name: string;
			let in_guild: boolean;
			let bot: boolean;

			try {
				const target_member = await get_member_cached(context.client, context.guild, id);
				name = target_member.user.tag;
				in_guild = true;
				bot = target_member.bot;

				try {
					var bot_member = await get_member_cached(context.client, context.guild, context.client.user.id);
				} catch (error) {
					if (!(error instanceof DiscordRESTError))
						throw error;

					unsuccessful_bans.push({ id, name, error: `Bot member fetch failed: ${format_rest_error(error)}` });
					continue;
				}

				const target_position = get_highest_role(target_member).position;

				if (context.guild.ownerID !== context.user.id
					&& (context.guild.ownerID === id
						|| get_highest_role(context.member).position <= target_position)) {
					unsuccessful_bans.push({ id, name, error: "Your highest role is not above target's highest role" });
					continue;
				}

				if (context.guild.ownerID !== context.client.user.id
					&& (context.guild.ownerID === id
						|| get_highest_role(bot_member).position <= target_position)
				) {
					unsuccessful_bans.push({ id, name, error: "Bot's highest role is not above target's highest role" });
					continue;
				}
			} catch (error) {
				if (!(error instanceof DiscordRESTError))
					throw error;

				if (error.code !== JSONErrorCodes.UNKNOWN_MEMBER) {
					unsuccessful_bans.push({ id, name: "<unknown>", error: `Member fetch failed: ${format_rest_error(error)}` });
					continue;
				}

				try {
					const user = await get_user_cached(context.client, id);
					name = user.tag;
					in_guild = false;
					bot = user.bot;
				} catch (error) {
					if (!(error instanceof DiscordRESTError))
						throw error;

					unsuccessful_bans.push({ id, name: "<unknown>", error: `User fetch failed: ${format_rest_error(error)}` });
					continue;
				}
			}

			let dm_sent = false;

			if (in_guild && !bot && !args.no_dm) {
				try {
					const dm = await create_dm_cached(context.client, id);
					await dm.createMessage({ content: "You were banned :regional_indicator_l:" });
					dm_sent = true;
				} catch (error) {
					if (!(error instanceof DiscordRESTError))
						throw error;
				}
			}

			try {
				await context.guild.createBan(id, { reason: args.reason ?? undefined });
				successful_bans.push({ id, name, dm_sent });
			} catch (error) {
				if (!(error instanceof DiscordRESTError))
					throw error;

				unsuccessful_bans.push({ id, name, error: format_rest_error(error) });
			}
		}

		if (args.user.length === 1) {
			if (successful_bans.length === 1) {
				const [ban] = successful_bans;
				await context.respond(`:white_check_mark: Banned <@${ban.id}> (${escape_all(ban.name)})${ban.dm_sent ? " with direct message" : ""}!`);
			} else if (unsuccessful_bans.length === 1) {
				const [ban] = unsuccessful_bans;
				await context.respond(`:x: Could not ban <@${ban.id}> (${escape_all(ban.name)}): ${ban.error}!`);
			}
		} else {
			const successful_message = successful_bans.map(ban => `- <@${ban.id}> (${escape_all(ban.name)}) ${ban.dm_sent ? " with direct message" : ""}`).join("\n");
			const unsuccessful_message = unsuccessful_bans.map(ban => `- <@${ban.id}> (${escape_all(ban.name)}): ${ban.error}`).join("\n");

			if (unsuccessful_bans.length === 0) {
				await context.respond(
					`:white_check_mark: Banned all ${args.user.length} users:\n${successful_message}`
				);
			} else if (successful_bans.length === 0) {
				await context.respond(
					`:x: None of ${args.user.length} users were banned:\n${unsuccessful_message}`
				);
			} else {
				await context.respond(
					`:warning: Only ${successful_bans.length} of ${args.user.length} bans were successful!\n`
					+ `Successful bans:\n${successful_message}\n`
					+ `Unsuccessful bans:\n${unsuccessful_message}`
				);
			}
		}
	}
});
