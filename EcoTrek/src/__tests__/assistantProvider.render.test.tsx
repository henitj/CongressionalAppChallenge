import { connectPuter, extractPuterReply, preparePuter, requestPuterAnswer, DEFAULT_GROK_MODEL, AI_PRESETS } from '../services/aiProvider';

const originalWindow = (globalThis as any).window;
const context = { trail: { name: 'Walnut Creek' }, allTrails: [], weather: null };
function sdk(chat: jest.Mock, signedIn = true, signIn: jest.Mock = jest.fn()) {
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { puter: { ai: { chat }, auth: { isSignedIn: () => signedIn, signIn } } } });
}
afterEach(() => {
  jest.useRealTimers();
  if (originalWindow === undefined) delete (globalThis as any).window;
  else Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: originalWindow });
});

describe('honest, connected Grok requests', () => {
  it('prepares without triggering sign-in, and will not silently open auth during chat', async () => {
    const chat = jest.fn(); const signIn = jest.fn(); sdk(chat, false, signIn);
    expect(await preparePuter()).toEqual({ ok: true, signedIn: false });
    expect(await requestPuterAnswer('Hello', context)).toMatchObject({ ok: false, code: 'auth_required' });
    expect(chat).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('starts sign-in synchronously in the user tap rather than after an await', async () => {
    let signedIn = false;
    const signIn = jest.fn(() => { signedIn = true; return Promise.resolve({ success: true }); });
    sdk(jest.fn(), false, signIn);
    (globalThis as any).window.puter.auth.isSignedIn = () => signedIn;
    const result = connectPuter();
    expect(signIn).toHaveBeenCalledWith({ request_auth: true });
    expect(await result).toEqual({ ok: true, signedIn: true });
  });

  it('sends an actual Grok model, recent conversation and bounded catalogue facts', async () => {
    const chat = jest.fn().mockResolvedValue({ message: { content: 'A real reply.' } }); sdk(chat);
    const result = await requestPuterAnswer('Why are leaves green?', { ...context, allTrails: Array.from({ length: 60 }, (_, n) => ({ name: `Trail ${n}` })) }, Array.from({ length: 20 }, () => ({ role: 'user' as const, content: 'Earlier question' })));
    expect(result).toEqual({ ok: true, text: 'A real reply.', model: DEFAULT_GROK_MODEL });
    const [messages, options] = chat.mock.calls[0];
    expect(messages).toHaveLength(10); // system, 8 recent turns, question
    expect(messages[0].content).toContain('Walnut Creek');
    expect(messages[0].content).not.toContain('Trail 30');
    expect(options).toMatchObject({ model: 'x-ai/grok-4.7', stream: false, max_tokens: 650 });
    expect(AI_PRESETS.find((preset) => preset.id === 'grok')?.baseUrl).toBe('https://api.x.ai/v1');
  });

  it.each([
    ['popup_blocked', 'popup_blocked'],
    ['auth_window_closed', 'cancelled'],
    ['insufficient_funds', 'quota'],
    ['rate_limit_exceeded', 'quota'],
    ['network unreachable', 'unavailable'],
  ])('surfaces %s instead of pretending the offline reply came from Grok', async (error, code) => {
    const chat = jest.fn().mockRejectedValue({ code: error }); sdk(chat);
    expect(await requestPuterAnswer('Help', context)).toMatchObject({ ok: false, code });
  });

  it('turns a never-settling model into a bounded timeout and releases the timer', async () => {
    jest.useFakeTimers();
    sdk(jest.fn(() => new Promise(() => {})));
    const response = requestPuterAnswer('Help', context, [], 20);
    await jest.advanceTimersByTimeAsync(30);
    expect(await response).toMatchObject({ ok: false, code: 'timeout' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('bounds an abandoned authentication window without claiming a model replied', async () => {
    jest.useFakeTimers();
    sdk(jest.fn(), false, jest.fn(() => new Promise(() => {})));
    const response = connectPuter();
    await jest.advanceTimersByTimeAsync(120001);
    expect(await response).toMatchObject({ ok: false, code: 'timeout', message: expect.stringContaining('sign-in timed out') });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('removes a failed SDK script and successfully retries instead of reusing its dead load event', async () => {
    const originalDocument = (globalThis as any).document;
    (globalThis as any).window = {};
    let attempts = 0;
    const removed = jest.fn();
    const appendChild = jest.fn((script: any) => {
      queueMicrotask(() => {
        if (++attempts === 1) script.onerror();
        else { sdk(jest.fn(), false); script.onload(); }
      });
    });
    Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: {
      getElementById: () => null,
      createElement: () => ({ remove: removed }),
      head: { appendChild },
    } });
    try {
      expect(await preparePuter()).toMatchObject({ ok: false, code: 'unavailable' });
      expect(removed).toHaveBeenCalledTimes(1);
      expect(await preparePuter()).toEqual({ ok: true, signedIn: false });
      expect(appendChild).toHaveBeenCalledTimes(2);
    } finally {
      if (originalDocument === undefined) delete (globalThis as any).document;
      else (globalThis as any).document = originalDocument;
    }
  });

  it('preserves valid long replies and handles SDK and OpenAI response shapes', () => {
    expect(extractPuterReply({ message: { content: [{ type: 'text', text: 'Hello' }, { type: 'text', text: 'world' }] } })).toBe('Hello world');
    expect(extractPuterReply({ choices: [{ message: { content: 'Alternative shape' } }] })).toBe('Alternative shape');
    expect(extractPuterReply({ text: 'a'.repeat(2500) })).toHaveLength(2500);
    expect(extractPuterReply({ message: { content: [] } })).toBeNull();
  });
});
