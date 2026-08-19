import { afterEach, describe, expect, it, vi } from "vitest";
import {
  armQueuedSubmitDeadline,
  QUEUED_SUBMIT_DEADLINE_MS,
} from "./queued-submit-deadline";

describe("queued submit deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the deadline inside the window the queue can survive", () => {
    // Above the widget's 8s render guard, or this would pre-empt the more
    // specific "never painted" error; well under Cloudflare's own error timing,
    // measured at 44s, which is the regression this pins.
    expect(QUEUED_SUBMIT_DEADLINE_MS).toBeGreaterThan(8_000);
    expect(QUEUED_SUBMIT_DEADLINE_MS).toBeLessThanOrEqual(15_000);
  });

  it("releases a token-less queued submit at the deadline, not before", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    armQueuedSubmitDeadline(true, null, onDeadline);

    vi.advanceTimersByTime(QUEUED_SUBMIT_DEADLINE_MS - 1);
    expect(onDeadline).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDeadline).toHaveBeenCalledTimes(1);
  });

  it("fires at 12s so the wait cannot regress to Turnstile's 44s", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    armQueuedSubmitDeadline(true, null, onDeadline);

    vi.advanceTimersByTime(12_000);
    expect(onDeadline).toHaveBeenCalledTimes(1);
  });

  it("arms nothing once a token is in hand", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    // The effect re-runs with the token the moment it lands, and the check the
    // queue was holding runs from there — this call must not schedule anything.
    expect(armQueuedSubmitDeadline(true, "token", onDeadline)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(60_000);
    expect(onDeadline).not.toHaveBeenCalled();
  });

  it("arms nothing when no submit is queued", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    expect(armQueuedSubmitDeadline(false, null, onDeadline)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves no timer behind when a token arrives mid-wait", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    // The effect's lifecycle when a token lands at 5s: cleanup, then a re-arm
    // that declines. A timer surviving this would raise "couldn't load
    // verification" over a check that already ran.
    const disarm = armQueuedSubmitDeadline(true, null, onDeadline);
    vi.advanceTimersByTime(5_000);
    disarm?.();
    armQueuedSubmitDeadline(true, "token", onDeadline);

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(onDeadline).not.toHaveBeenCalled();
  });

  it("leaves no timer behind on unmount", () => {
    vi.useFakeTimers();
    const onDeadline = vi.fn();

    const disarm = armQueuedSubmitDeadline(true, null, onDeadline);
    disarm?.();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(onDeadline).not.toHaveBeenCalled();
  });
});
