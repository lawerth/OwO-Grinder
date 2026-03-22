import axios from "axios";
import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";

// Fallback quotes in case APIs are down
const fallbackQuotes = [
    "The best way to predict the future is to create it.",
    "Always be smarter than the people who hire you.",
    "Success is where preparation and opportunity meet.",
    "It always seems impossible until it's done.",
    "Price is what you pay. Value is what you get.",
    "Yesterday is history, tomorrow is a mystery, today is God's gift.",
    "Nothing great was ever achieved without enthusiasm.",
    "A goal without a plan is just a wish.",
    "Education is the most powerful weapon which you can use to change the world.",
    "The key to wisdom is this - constant and frequent questioning.",
    "Knowing is not enough; we must apply!",
    "Silence is deep as Eternity; Speech is shallow as Time.",
    "The key to growth is the introduction of higher dimensions of consciousness.",
    "Respect should be earned by actions, and not acquired by years.",
    "Be yourself; everyone else is already taken.",
    "What worries you masters you.",
    "Nature takes away any faculty that is not used.",
    "The energy of the mind is the essence of life.",
    "Mistakes are the usual bridge between inexperience and wisdom.",
    "The way we communicate with others and with ourselves ultimately determines the quality of our lives."
];

/**
 * Fetches a random quote from external APIs.
 * Rotating through ZenQuotes, Advice Slip, and fallbacks.
 */
const fetchRandomQuote = async (): Promise<string> => {
    const chance = Math.random();

    try {
        if (chance < 0.5) {
            // Try ZenQuotes (Quality quotes)
            const response = await axios.get("https://zenquotes.io/api/random", { timeout: 5000 });
            if (response.data?.[0]?.q) {
                return response.data[0].q;
            }
        } else {
            // Try Advice Slip (General advice/sentences)
            const response = await axios.get("https://api.adviceslip.com/advice", { timeout: 5000 });
            if (response.data?.slip?.advice) {
                return response.data.slip.advice;
            }
        }
    } catch (error) {
        // Log errors locally if needed, but fallback silently for user experience
    }

    // Default fallback from the static list
    return fallbackQuotes[ranInt(0, fallbackQuotes.length)];
};

export default Schematic.registerFeature({
    name: "autoQuote",
    cooldown: () => 15_000,
    condition: async ({ agent }) => {
        return agent.config.autoQuote.length > 0;
    },
    run: async ({ agent }) => {
        let quote: string;
        switch (agent.config.autoQuote[ranInt(0, agent.config.autoQuote.length)]) {
            case "owo":
                quote = "owo";
                break;
            case "quote":
                quote = await fetchRandomQuote();
                break;
            default:
                quote = "owo";
                break;
        }
        agent.send(quote, { prefix: "", channel: agent.activeChannel, skipLogging: true });
    }
});