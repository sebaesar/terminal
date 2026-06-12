import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@stores/chatStore";

vi.mock("@hooks/useTelemetry", () => ({
  sendTelemetryEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@utils/typingSimulation", async () => {
  const actual = await vi.importActual<typeof import("@utils/typingSimulation")>(
    "@utils/typingSimulation",
  );
  return {
    ...actual,
    humanDelay: vi.fn(() => 1),
  };
});

const streamChunks = (chunks: string[]) => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
  );
};

const streamResponse = (events: string[]) =>
  streamChunks([events.map((event) => `data: ${event}`).join("\n\n")]);

describe("chat store streaming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const localStorageStub = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("localStorage", localStorageStub);
    useChatStore.getState().clear();
    useChatStore.setState({
      isOpen: true,
      isMinimized: false,
      loading: false,
      messages: [],
      input: "",
      unread: 0,
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders streamed response deltas exactly once in order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamResponse([
          JSON.stringify({ response: "You" }),
          JSON.stringify({ response: " can" }),
          JSON.stringify({ response: " start" }),
          JSON.stringify({ response: " by" }),
          JSON.stringify({ response: " telling" }),
          JSON.stringify({ response: " me" }),
          JSON.stringify({ response: " a" }),
          JSON.stringify({ response: " bit" }),
          JSON.stringify({ response: " about" }),
          JSON.stringify({ response: " your" }),
          JSON.stringify({ response: " project" }),
          JSON.stringify({ response: "." }),
          JSON.stringify({ response: "", usage: { total_tokens: 42 } }),
          "[DONE]",
        ]),
      ),
    );

    await useChatStore.getState().sendMessage("Where should I start?");
    await vi.runAllTimersAsync();

    const assistantMessages = useChatStore
      .getState()
      .messages.filter((message) => message.role === "assistant");

    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0].content).toBe(
      "You can start by telling me a bit about your project.",
    );

    const requestBody = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(requestBody).not.toHaveProperty("tone");
    expect(requestBody).toMatchObject({
      message: "Where should I start?",
    });
  });

  it("preserves streamed response data split across network chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamChunks([
          'data: {"res',
          'ponse":"Hel"}\n\ndata: {"response":"lo"}\n\ndata: [DONE]',
        ]),
      ),
    );

    await useChatStore.getState().sendMessage("Say hello");
    await vi.runAllTimersAsync();

    const assistantMessages = useChatStore
      .getState()
      .messages.filter((message) => message.role === "assistant");

    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0].content).toBe("Hello");
  });
});
