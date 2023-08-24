import { z } from "zod";
import { useEffect, useState, useCallback } from "react";

export default function Home() {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [messages, setMessages] = useState<
    Record<string, string[] | undefined>
  >({});

  useEffect(() => {
    (async () => {
      setEventSource((prev) => {
        if (prev !== null) {
          return prev;
        }
        const es = new EventSource(
          "https://api.relay.network/robot/maker/listen",
        );

        es.addEventListener("message", (event) => {
          try {
            const json = JSON.parse(event.data);

            const data = z
              .object({ id: z.string().uuid(), txt: z.string() })
              .parse(json);

            setMessages((prev) => {
              return {
                ...prev,
                [data.id]: [...(prev[data.id] ?? []), data.txt],
              };
            });
          } catch (e) {
            console.error("GOT A MALFORMED MESSAGE");
            console.error(event);
            console.error(e);
          }
        });

        es.addEventListener("stop", () => {
          console.log("stop received");
        });

        return es;
      });
    })();
  }, []);

  const generate = useCallback(async () => {
    if (eventSource === null) {
      return;
    }

    await fetch("https://api.relay.network/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: `${Math.random()}${Math.random()}`,
        message: "Please tell me what is MakerDAO",
      }),
    });
  }, [eventSource]);

  return (
    <main>
      <button onClick={generate}>Generate</button>
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
    </main>
  );
}
