import { z } from "zod";
import { useEffect, useState, useCallback } from "react";

const zBotEvent = z.object({
  event: z.string(),
  id: z.string(),
  interactionId: z.string(),
  timestamp: z.number(),
  data: z.unknown(),
});

const zBotMessageChunk = zBotEvent.merge(
  z.object({
    data: z.object({
      botId: z.string(),
      botMessageId: z.string(),
      seq: z.number().nonnegative(),
      text: z.string(),
    }),
  }),
);

const zUserIntent = zBotEvent.merge(
  z.object({
    data: z.object({
      botId: z.string(),
      userId: z.string(),
      intent: z.string(),
    }),
  }),
);

export default function Home() {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [messageInput, setMessageInput] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, string[] | undefined>
  >({});

  const handleBotMessageChunk = (event: z.infer<typeof zBotMessageChunk>) => {
    setMessages((prev) => {
      return {
        ...prev,
        [event.data.botMessageId]: [
          ...(prev[event.data.botMessageId] ?? []),
          event.data.text,
        ],
      };
    });
  };

  const handleBotMessageStop = () => {
    console.log("handleBotMessageStop");
  };

  const handleUnknownEvent = (event: z.infer<typeof zBotEvent>) => {
    console.log("handleUnknownEvent", event);
  };

  const handleUserIntent = (event: z.infer<typeof zUserIntent>) => {
    console.log("handleUserIntent", event);
    if (event.data.intent === "SWAP_INTENT") {
      setIntent("SWAP_INTENT");
    } else if (event.data.intent === "MUSIC_INTENT") {
      setIntent("MUSIC_INTENT");
    }
  };

  const handleEvent = useCallback((message: MessageEvent<string>) => {
    try {
      const json = JSON.parse(message.data);
      switch (json.event) {
        case "bot-message-chunk":
          return handleBotMessageChunk(zBotMessageChunk.parse(json));
        case "bot-message-stop":
          return handleBotMessageStop();
        case "user-intent":
          return handleUserIntent(zUserIntent.parse(json));
        default:
          handleUnknownEvent(json);
      }
    } catch (e) {
      console.error("GOT A MALFORMED MESSAGE");
      console.error(message);
      console.error(e);
    }
  }, []);

  useEffect(() => {
    setUserId((prev) => {
      if (prev !== null) {
        return prev;
      } else {
        console.log("generating new user id");
        return String(Math.random());
      }
    });
  }, []);

  useEffect(() => {
    setEventSource((prev) => {
      if (prev !== null) {
        return prev;
      }

      if (userId === null) {
        return null;
      }

      const es = new EventSource(
        `https://api.relay.network/robot-maker/interaction?id=${userId}`,
      );

      es.addEventListener("message", handleEvent);

      es.addEventListener("stop", () => {
        console.log("stop received");
      });

      return es;
    });
  }, [userId, handleEvent]);

  const handleGenerate = async () => {
    if (eventSource === null) {
      return;
    }

    if (messageInput === null) {
      return;
    }

    if (userId === null) {
      return;
    }

    await fetch(
      "https://api.relay.network/robot-maker/interaction/user-message",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          event: "user-message",
          interactionId: userId,
          timestamp: Date.now(),
          data: {
            userId,
            text: messageInput,
          },
        }),
      },
    );
  };

  return (
    <main
      className={cn({
        "flex flex-col p-12 h-screen items-center mx-auto max-w-[80ch]": true,
        "bg-red-100": intent === "SWAP_INTENT",
        "bg-blue-100": intent === "MUSIC_INTENT",
      })}
    >
      {Object.entries(messages).map(([id, messages]) => (
        <div key={id}>
          <p>
            {(() => {
              if (messages === undefined) {
                return "loading...";
              } else if (messages.length === 0) {
                return "no messages";
              } else {
                return messages.join("");
              }
            })()}
          </p>
        </div>
      ))}
      <input
        className="bg-gray-200 min-w-256 mt-auto"
        value={messageInput ?? ""}
        onChange={(e) => setMessageInput(e.target.value)}
      />
      <button onClick={handleGenerate}>Generate</button>
    </main>
  );
}

export const cn = (names: Record<string, boolean>) => {
  return Object.entries(names)
    .filter(([, condition]) => condition)
    .map(([name]) => name)
    .join(" ");
};
