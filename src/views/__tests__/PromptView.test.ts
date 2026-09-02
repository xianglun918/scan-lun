import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PromptView from "../PromptView.vue";
import { i18n } from "../../i18n";

const mocks = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockClose: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mocks.mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ label: "prompt", close: mocks.mockClose }),
}));

const SETTINGS = {
  template: ["今日工作完成了什么？", "今天遇到什么问题、有哪些不足？", "明天重点要做哪几件事？"],
  trigger_time: "18:00",
  workdays_only: true,
  autostart: false,
  language: "zh-CN",
  template_i18n: true,
};

// 用微任务 + nextTick 冲刷异步 onMounted 与 Vue 渲染队列。
// 不能用 flushPromises（setTimeout 实现）—— 它在 vi.useFakeTimers 下会挂起。
async function flushAsync() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await nextTick();
  await nextTick();
}

describe("PromptView todayStr 锁定", () => {
  beforeEach(() => {
    mocks.mockInvoke.mockReset();
    mocks.mockClose.mockReset();
    vi.useFakeTimers();
    mocks.mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(SETTINGS);
      if (cmd === "get_record") return Promise.resolve(null);
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("挂载后渲染表单并 invoke get_settings / get_record（锁定日期）", async () => {
    vi.setSystemTime(new Date("2026-08-24T23:59:00"));

    const wrapper = mount(PromptView, { global: { plugins: [i18n] } });
    await flushAsync();

    expect(mocks.mockInvoke).toHaveBeenCalledWith("get_settings");
    expect(mocks.mockInvoke).toHaveBeenCalledWith("get_record", {
      date: "2026-08-24",
    });
    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.findAll("textarea").length).toBe(3);
  });

  it("跨天后 save() 仍用挂载时锁定的日期", async () => {
    vi.setSystemTime(new Date("2026-08-24T23:59:00"));

    const wrapper = mount(PromptView, { global: { plugins: [i18n] } });
    await flushAsync();

    vi.setSystemTime(new Date("2026-08-25T00:02:00"));

    await wrapper.find("form").trigger("submit");
    await flushAsync();

    expect(mocks.mockInvoke).toHaveBeenCalledWith("save_record", {
      date: "2026-08-24",
      answers: ["", "", ""],
    });
    expect(mocks.mockInvoke).not.toHaveBeenCalledWith("save_record", {
      date: "2026-08-25",
      answers: ["", "", ""],
    });
  });
});
