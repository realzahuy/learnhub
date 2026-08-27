type JsonSseHandlers = Record<string, (data: unknown) => void>;

export const consumeJsonSseEvents = async (
  response: Response,
  handlers: JsonSseHandlers
): Promise<void> => {
  if (!response.ok || !response.body) {
    throw new Error(`SSE stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/);
    const receivedEventName = lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim();
    if (!receivedEventName) return;

    const handler = handlers[receivedEventName];
    if (!handler) return;

    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (data) handler(JSON.parse(data) as unknown);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || '';
    events.forEach(processEvent);

    if (done) break;
  }

  if (buffer.trim()) processEvent(buffer);
};
