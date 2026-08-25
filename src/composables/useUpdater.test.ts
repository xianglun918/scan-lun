import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri APIs BEFORE importing the composable
const mockListen = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Deferred helper for listener registration
let listenerResolvers: Map<string, (cb: (e: { payload: unknown }) => void) => void> = new Map();

beforeEach(() => {
  mockListen.mockReset();
  mockInvoke.mockReset();
  listenerResolvers.clear();
  // The composable calls listen(event, handler); capture the handler so fire() can dispatch.
  // Must NOT be an async wrapper: an async fn resolving with a promise adds a
  // PromiseResolveThenableJob microtask hop, letting the test's fire() run before
  // attachListeners() registers the 2nd/3rd listeners. A plain fulfilled promise
  // keeps the await continuations ahead of the test body.
  mockListen.mockImplementation((event: string, handler?: (e: { payload: unknown }) => void) => {
    return new Promise<() => void>((resolveUnlisten) => {
      (listenerResolvers as unknown as Record<string, ((e: { payload: unknown }) => void) | undefined>)[`_${event}_cb`] = handler;
      resolveUnlisten(() => {});
    });
  });
});

afterEach(() => {
  vi.resetModules();
});

function fire(event: string, payload: unknown) {
  const cb = (listenerResolvers as unknown as Record<string, ((e: { payload: unknown }) => void) | undefined>)[`_${event}_cb`];
  if (cb) cb({ payload });
}

async function getUpdater() {
  // Each test gets a fresh module (singleton reset)
  vi.resetModules();
  const mod = await import("./useUpdater");
  const updater = mod.useUpdater();
  // attachListeners() registers the 3 listeners across await continuations
  // (microtasks). A setTimeout(0) macrotask boundary guarantees every pending
  // microtask has drained, so all listeners are registered before the test body.
  await new Promise((r) => setTimeout(r, 0));
  return updater;
}

describe("useUpdater", () => {
  it("starts in idle state", async () => {
    const u = await getUpdater();
    expect(u.state.value.status).toBe("idle");
    expect(u.state.value.currentVersion).toBe("");
    expect(u.state.value.latestVersion).toBeNull();
  });

  it("check() sets status to checking then to available", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      notes: "release notes",
    });
    const u = await getUpdater();
    const p = u.check();
    // 同步：检查已设
    expect(u.state.value.status).toBe("checking");
    await p;
    expect(u.state.value.status).toBe("available");
    expect(u.state.value.latestVersion).toBe("1.1.0");
    expect(u.state.value.notes).toBe("release notes");
    expect(mockInvoke).toHaveBeenCalledWith("check_update");
  });

  it("check() sets up-to-date when available=false", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: false,
      currentVersion: "1.0.0",
      latestVersion: null,
      notes: null,
    });
    const u = await getUpdater();
    await u.check();
    expect(u.state.value.status).toBe("up-to-date");
  });

  it("check() sets error on invoke failure", async () => {
    mockInvoke.mockRejectedValueOnce("network down");
    const u = await getUpdater();
    await u.check();
    expect(u.state.value.status).toBe("error");
    expect(u.state.value.errorMessage).toBe("network down");
  });

  it("install() sets status to downloading", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const u = await getUpdater();
    const p = u.install();
    expect(u.state.value.status).toBe("downloading");
    await p;
    expect(mockInvoke).toHaveBeenCalledWith("install_update");
  });

  it("receives update-available event and updates state", async () => {
    const u = await getUpdater();
    fire("update-available", {
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      notes: "big release",
    });
    expect(u.state.value.status).toBe("available");
    expect(u.state.value.latestVersion).toBe("2.0.0");
  });

  it("receives update-downloaded event and sets downloaded status", async () => {
    const u = await getUpdater();
    fire("update-downloaded", {
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      notes: null,
    });
    expect(u.state.value.status).toBe("downloaded");
  });

  it("receives update-error event and sets error state", async () => {
    const u = await getUpdater();
    fire("update-error", { kind: "install_failed", message: "disk full" });
    expect(u.state.value.status).toBe("error");
    expect(u.state.value.errorMessage).toBe("disk full");
  });

  it("restart() invokes restart_app", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const u = await getUpdater();
    await u.restart();
    expect(mockInvoke).toHaveBeenCalledWith("restart_app");
  });
});
