import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mocks.mockInvoke(...args),
}));

import { useSettings } from "../useSettings";

const DEFAULT_SETTINGS = {
  template: ["q1", "q2", "q3"],
  trigger_time: "18:00",
  workdays_only: true,
  autostart: false,
  language: "zh-CN",
  template_i18n: true,
};

describe("useSettings", () => {
  beforeEach(() => {
    mocks.mockInvoke.mockReset();
  });

  it("starts idle with null settings", () => {
    const { settings, loading, error } = useSettings();
    expect(settings.value).toBeNull();
    expect(loading.value).toBe(false);
    expect(error.value).toBe("");
  });

  it("load() populates settings via the get_settings command", async () => {
    mocks.mockInvoke.mockResolvedValueOnce(DEFAULT_SETTINGS);
    const { settings, loading, error, load } = useSettings();

    const p = load();
    expect(loading.value).toBe(true);

    await p;
    expect(loading.value).toBe(false);
    expect(settings.value).toEqual(DEFAULT_SETTINGS);
    expect(error.value).toBe("");
    expect(mocks.mockInvoke).toHaveBeenCalledWith("get_settings");
  });

  it("load() captures the error message on failure", async () => {
    mocks.mockInvoke.mockRejectedValueOnce("db locked");
    const { settings, error, loading, load } = useSettings();

    await load();
    expect(settings.value).toBeNull();
    expect(error.value).toBe("db locked");
    expect(loading.value).toBe(false);
  });
});
