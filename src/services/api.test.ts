import { describe, it, expect } from "vitest";
import { today } from "./api";

/**
 * 关键 bug 场景：前端 today() 在跨天后会漂移到新一天。
 * 修复点在 PromptView：onMounted 时锁定 todayStr，save 用锁定值。
 * 这里测的是"锁定值的稳定性"——即：保存时如果再调 today()，可能拿到新一天的日期，
 * 所以正确做法是只用锁定值，不重新算。
 *
 * 这些测试不验证 PromptView 模板/逻辑（那需要 Vue Test Utils + happy-dom），
 * 只验证 today() 函数本身的行为，让锁定的输入和输出的语义关系清晰。
 */

describe("today()", () => {
  it("returns YYYY-MM-DD format with zero-padded month and day", () => {
    const s = today();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the same local date as new Date()", () => {
    const s = today();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
    expect(s).toBe(expected);
  });

  it("is stable across rapid calls within the same day", () => {
    const a = today();
    const b = today();
    const c = today();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

/**
 * 关键 bug 场景：模拟"0824 弹窗、0825 才保存"。
 * 修复策略：PromptView 在 onMounted 时把 today() 锁定到 todayStr，
 *          save() 始终用 todayStr，不再现算。
 *
 * 下面用 fake timer + 模拟 PromptView 锁定逻辑来端到端验证：
 */

import { ref } from "vue";

describe("PromptView todayStr 锁定逻辑", () => {
  it("锁定后即使跨天也用锁定日期", async () => {
    // 模拟 0824 23:59:00
    const start = new Date("2026-08-24T23:59:00").getTime();

    // 模拟 new Date() / Date.now() —— 通过 vi.useFakeTimers
    const { vi } = await import("vitest");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(start));

    // onMounted 时锁定
    const todayStr = ref("");
    todayStr.value = today();

    // 跨到 0825 00:00:30
    vi.setSystemTime(new Date(start + 90_000));
    const fresh = today();

    // 锁定值仍是 0824，新算的值是 0825
    expect(todayStr.value).toBe("2026-08-24");
    expect(fresh).toBe("2026-08-25");

    // save 用锁定值 → record.date = "2026-08-24"
    // today() 现算 → "2026-08-25"（如果用这个会跨天）
    const recordDate = todayStr.value; // ← 模拟 save() 里的 saveRecord(todayStr.value, ...)
    expect(recordDate).toBe("2026-08-24");

    vi.useRealTimers();
  });
});
