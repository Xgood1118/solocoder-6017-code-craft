import Link from "next/link";
import CodeBlock from "./CodeBlock";

interface CommentContentProps {
  content: string;
  mentionDisplayTexts?: string[];
  mentionedUserIds?: string[];
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function CommentContent({
  content,
  mentionDisplayTexts = [],
  mentionedUserIds = [],
}: CommentContentProps) {
  const mentionMap = new Map<string, string>();
  mentionDisplayTexts.forEach((text, index) => {
    if (mentionedUserIds[index]) {
      mentionMap.set(text.toLowerCase(), mentionedUserIds[index]);
    }
  });

  const sortedTexts = [...mentionDisplayTexts].sort((a, b) => b.length - a.length);
  const mentionRegex =
    sortedTexts.length > 0
      ? new RegExp(`@(${sortedTexts.map(escapeRegExp).join("|")})\\b`, "gi")
      : /@(\w+)/g;

  const parseMentions = (text: string) => {
    const parts: Array<{ type: "text" | "mention"; value: string; userId?: string }> = [];
    const regex = new RegExp(mentionRegex.source, mentionRegex.flags);
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }

      const mentionKey = (match[1] ?? match[0].slice(1)).toLowerCase();
      const userId = mentionMap.get(mentionKey);

      if (userId) {
        parts.push({ type: "mention", value: match[0], userId });
      } else {
        parts.push({ type: "text", value: match[0] });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }

    return parts;
  };

  const parts = content.split(/(```[\w-]*\n[\s\S]*?\n```)/g);

  return (
    <div className="max-w-none text-white">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const match = part.match(/```([\w-]*)\n([\s\S]*?)\n```/);

          if (match) {
            const [, language, code] = match;
            return <CodeBlock language={language} code={code} key={index} />;
          }
        }

        return part.split("\n").map((line, lineIdx) => (
          <p key={`${index}-${lineIdx}`} className="mb-4 text-gray-300 last:mb-0">
            {parseMentions(line).map((segment, segIdx) =>
              segment.type === "mention" ? (
                <Link
                  key={segIdx}
                  href={`/profile?userId=${segment.userId}`}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {segment.value}
                </Link>
              ) : (
                <span key={segIdx}>{segment.value}</span>
              )
            )}
          </p>
        ));
      })}
    </div>
  );
}
export default CommentContent;
