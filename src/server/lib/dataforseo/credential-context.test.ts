/**
 * The ambient DataForSEO key resolver must stay isolated per async context so
 * two organizations running concurrently never read each other's key. This
 * guards the contract the metering layer (Track C) and the authenticated fetch
 * depend on.
 */
import { describe, expect, it } from "vitest";
import {
  getDataforseoKeyResolver,
  runWithDataforseoKey,
} from "./credential-context";

describe("credential-context", () => {
  it("exposes no resolver outside runWithDataforseoKey", () => {
    expect(getDataforseoKeyResolver()).toBeUndefined();
  });

  it("makes the resolver readable inside the run callback", async () => {
    const key = await runWithDataforseoKey(
      async () => "key-a",
      async () => {
        const resolver = getDataforseoKeyResolver();
        expect(resolver).toBeDefined();
        return resolver!();
      },
    );
    expect(key).toBe("key-a");
    // Context is torn down after the callback resolves.
    expect(getDataforseoKeyResolver()).toBeUndefined();
  });

  it("keeps concurrent contexts from leaking keys across organizations", async () => {
    const readAfterDelay = (delayMs: number) =>
      new Promise<string>((resolve) => {
        setTimeout(() => {
          const resolver = getDataforseoKeyResolver();
          resolve(resolver ? "resolver-present" : "no-resolver");
        }, delayMs);
      });

    const [a, b] = await Promise.all([
      runWithDataforseoKey(
        async () => "key-a",
        async () => {
          const resolver = getDataforseoKeyResolver();
          // Yield so context B interleaves before A reads its resolver.
          await readAfterDelay(10);
          return resolver!();
        },
      ),
      runWithDataforseoKey(
        async () => "key-b",
        async () => {
          const resolver = getDataforseoKeyResolver();
          await readAfterDelay(5);
          return resolver!();
        },
      ),
    ]);

    expect(a).toBe("key-a");
    expect(b).toBe("key-b");
  });
});
