import { AnyInteractionChannel, AnyTextableChannel, Client, ClientEvents, CreateMessageOptions, Guild, Member, Message, User } from "oceanic.js";

type Id = string | [string, ...string[]];

export interface Plugin {
	id: string;
	commands?: Command[];
	listeners?: EventListener[];
	apply?(client: Client): Promise<void> | void;
}

export function define_plugin(plugin: Plugin): Plugin {
	return plugin;
}

export interface Command<F extends Record<string, Flag> = Record<string, Flag>> {
	id: Id;
	flags?: F;
	support_prefix?: boolean;
	support_slash?: boolean;
	run(
		context: Context,
		args: keyof F extends never ? {} : { [K in keyof F]: FlagValue<F[K]> }
	): Promise<void> | void;
}

export function define_command<F extends Record<string, Flag>>(command: Command<F>): Command<F> {
	return command;
}

export interface Context {
	command: Command;
	client: Client;
	user: User;
	member: Member | null;
	guild: Guild | null;
	channel: AnyTextableChannel | AnyInteractionChannel | null;
	message?: Message;
	respond(reply: Reply): Promise<void>;
}

export type Reply = Omit<CreateMessageOptions, "messageReference" | "tts"> & { ephemeral?: boolean; } | string;

export interface CommandGroup {
	id: Id;
	children: Command<any> | CommandGroup[];
}

export enum FlagType {
	VOID,
	BOOLEAN,
	STRING,
	NUMBER,
	USER,
	ROLE,
	CHANNEL,
	SNOWFLAKE
}

export interface Flag {
	type: FlagType;
	id: Id;
	required?: boolean;
	array?: boolean;
	/** with prefix mode, becomes the unnamed flag */
	primary?: boolean;
};

type FlagValue<F extends Flag> =
	F["array"] extends true ? FlagTypeValue<F["type"]>[] :
	F["required"] extends true ? FlagTypeValue<F["type"]> :
	FlagTypeValue<F["type"]> | null;

export type FlagTypeValue<F extends FlagType> =
	F extends FlagType.VOID ? boolean :
	F extends FlagType.BOOLEAN ? boolean :
	F extends FlagType.STRING ? string :
	F extends FlagType.NUMBER ? number :
	F extends FlagType.USER ? string :
	F extends FlagType.ROLE ? string :
	F extends FlagType.CHANNEL ? string :
	F extends FlagType.SNOWFLAKE ? string :
	never;

export interface EventListener<E extends keyof ClientEvents = keyof ClientEvents> {
	type: E;
	listener(...args: ClientEvents[E]): Promise<void> | void;
}

export function define_event_listener<E extends keyof ClientEvents>(type: E, listener: EventListener<E>["listener"]): EventListener<E> {
	return { type, listener };
}
