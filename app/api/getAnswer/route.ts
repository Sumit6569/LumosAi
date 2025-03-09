import { Readability } from "@mozilla/readability";
import jsdom, { JSDOM } from "jsdom";
import {
  TogetherAIStream,
  TogetherAIStreamPayload,
} from "@/utils/TogetherAIStream";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env["TOGETHER_API_KEY"] || "",
  baseURL: "https://together.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY || ""}`,
  },
});

export const maxDuration = 45;

interface Source {
  name: string;
  url: string;
  fullContent?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { question, sources }: { question: string; sources: Source[] } =
      await request.json();

    console.log("[getAnswer] Fetching text from source URLs");

    const finalResults: Source[] = await Promise.all(
      sources.map(async (result) => {
        try {
          const response = await fetchWithTimeout(result.url);
          const html = await response.text();
          const virtualConsole = new jsdom.VirtualConsole();
          const dom = new JSDOM(html, { virtualConsole });

          const doc = dom.window.document;
          const parsed = new Readability(doc).parse();
          let parsedContent = parsed
            ? cleanedText(parsed.textContent)
            : "Nothing found";

          return {
            ...result,
            fullContent: parsedContent,
          };
        } catch (e) {
          console.error(`Error parsing ${result.name}: ${e}`);
          return { ...result, fullContent: "Not available" };
        }
      }),
    );

    const mainAnswerPrompt = `
    Given a user question and some context, write a clean, concise, and accurate answer based on the context.

    <contexts>
    ${finalResults
      .map(
        (result, index) => `[[citation:${index}]] ${result.fullContent} \n\n`,
      )
      .join("")}
    </contexts>

    Here is the user question:
    `;

    console.log("[getAnswer] Fetching answer stream from Together AI...");

    const payload: TogetherAIStreamPayload = {
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [
        { role: "system", content: mainAnswerPrompt },
        { role: "user", content: question },
      ],
      stream: true,
    };

    const stream = await TogetherAIStream(payload);

    if (!stream || !(stream instanceof ReadableStream)) {
      throw new Error("Invalid response stream from TogetherAIStream.");
    }

    return new Response(stream, {
      headers: { "Cache-Control": "no-cache", "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error in POST function:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const cleanedText = (text: string): string => {
  return text
    .trim()
    .replace(/(\n){4,}/g, "\n\n\n")
    .replace(/\n\n/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\t/g, "")
    .replace(/\n+(\s*\n)*/g, "\n")
    .substring(0, 20000);
};

async function fetchWithTimeout(
  url: string,
  options = {},
  timeout = 3000,
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;

  const fetchTimeout = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(fetchTimeout);
    return response;
  } catch (error) {
    clearTimeout(fetchTimeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Fetch request timed out");
    }
    throw error;
  }
}
