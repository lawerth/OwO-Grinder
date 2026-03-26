import { checkbox, select, Separator } from "@inquirer/prompts";

type InquirerPrompt<TValue, TOptions> = (options: TOptions) => Promise<TValue>;

/**
 * Abstract base class for creating interactive command-line prompts.
 * 
 * Provides utility methods for common prompt types such as single selection, and multiple selection.
 * Designed to be extended by concrete prompter implementations.
 * 
 * @template TValue The type of value returned by the prompt.
 * @template TOptions The type of options accepted by the prompt.
 * 
 * @method ask
 * Prompts the user with a custom prompt function and options.
 * Optionally displays documentation before prompting.
 */
export abstract class BasePrompter {
    constructor() { }

    protected ask = <TValue, TOptions>(
        prompt: InquirerPrompt<TValue, TOptions>,
        options: TOptions,
        doc?: string
    ): Promise<TValue> => {
        console.clear();
        if (doc) console.log(doc);
        return prompt(options);
    }
}