import { isCancel, text } from "@clack/prompts";
import { ZodError } from "zod";

type SelectZodInput<T> = {
	message: string;
	defaultValue?: string;
	required?: false | undefined;
	validate: (value: string) => T;
};

export const textPrompt = async <T>(args: SelectZodInput<T>) => {
	const result = await text({
		message: args.message,
		defaultValue: args.defaultValue,
		placeholder: args.defaultValue,
		initialValue: args.defaultValue,
		validate: (value) => {
			try {
				if (value === undefined) {
					return undefined;
				}
				args.validate(value);
			} catch (e) {
				if (e instanceof ZodError) {
					return e.issues.at(0)?.message ?? "Invalid input.";
				}
				if (e instanceof Error) {
					return e.message;
				}
				return "Invalid input.";
			}
		},
	});

	if (isCancel(result)) {
		return result;
	}
	return args.validate(result);
};
