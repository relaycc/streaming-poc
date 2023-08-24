import { useEffect, useState } from 'react'

export default function Home() {
  const [message, setMessage] = useState<string | null> (null)
  const [tokens, setTokens] = useState<string[][]>([])

  const generate = async () => {
    if (tokens.length >= 6) {
      // Browsers limit the number of SSE streams per domain.
      return;
    }

    const stream = new EventSource('https://api.relay.network/robot-maker/bot/3?message=hello');

    setTokens((prev) => [...prev, []]);

    stream.addEventListener('message', (event) => {
      const i = (() => {
        if (tokens.length === 0) {
          return 0;
        } else {
          return tokens.length - 1;
        }
      })();
      
      setTokens((prev) => {
        return [
          ...prev.slice(0, i),
          [...prev[i], event.data],
          ...prev.slice(i + 1),
        ];
      });
    });

    stream.addEventListener('stop', () => {
      console.log('stop received');
    });
  }

  return (
    <main>
      <button onClick={generate}>Generate</button>
      {tokens.map((token, i) => (
        <div key={i}>
            <p>{token.join("")}</p>
        </div>
      ))}
    </main>
  )
}
