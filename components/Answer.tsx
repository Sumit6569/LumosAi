import React, { useState } from "react";
import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";

interface AnswerProps {
  answer: string | { response?: string; [key: string]: any };
}

export default function Answer({ answer }: AnswerProps) {
  const [copied, setCopied] = useState(false);

  // Helper function to extract text from answer
  const getText = (answer: any) => {
    if (typeof answer === "string") return answer.trim();
    if (answer && typeof answer === "object") {
      if (typeof answer.response === "string") return answer.response.trim();
      return JSON.stringify(answer, null, 2);
    }
    return "No answer available.";
  };

  const formattedAnswer = getText(answer);

  console.log("Answer prop:", formattedAnswer); // Debugging log

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedAnswer);
    setCopied(true);
    toast("Answer copied to clipboard", { icon: "✂️" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container flex h-auto w-full shrink-0 gap-4 rounded-lg border border-solid border-[#C2C2C2] bg-white p-5 lg:p-10">
      <div className="hidden lg:block">
        <Image
          unoptimized
          src="/img/Info.svg"
          alt="info"
          width={24}
          height={24}
        />
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between pb-3">
          <div className="flex gap-4">
            <Image
              unoptimized
              src="/img/Info.svg"
              alt="info"
              width={24}
              height={24}
              className="block lg:hidden"
            />
            <h3 className="text-xl font-bold text-black">Answer:</h3>
          </div>
          {formattedAnswer && (
            <button onClick={handleCopy}>
              <Image
                unoptimized
                src={copied ? "/img/check.svg" : "/img/copy.svg"}
                alt="copy"
                width={20}
                height={20}
                className="cursor-pointer"
              />
            </button>
          )}
        </div>

        {/* Explanation & Code Separation */}
        <div className="w-full space-y-4 text-base leading-[152.5%]">
          {formattedAnswer.split("\n\n").map((block: string, index) => {
            const isCode = block.includes("\n") || block.includes("  ");
            return isCode ? (
              <pre
                key={index}
                className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-white"
              >
                <code>{block}</code>
              </pre>
            ) : (
              <p key={index} className="text-lg font-medium text-gray-800">
                <strong className="text-black">{block}</strong>
              </p>
            );
          })}
        </div>
      </div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 2000 }}
      />
    </div>
  );
}
