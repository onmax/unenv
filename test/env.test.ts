import { describe, expect, it } from "vitest";
import { defineEnv } from "../src";
import { builtinModules } from "node:module";
import { existsSync } from "node:fs";

const nodeBuiltinModules = ["node:sqlite"];

describe("defineEnv", () => {
  it("defaults", () => {
    const { env } = defineEnv();
    expect(env).toMatchObject({
      alias: {},
      external: [],
      inject: {},
      polyfill: [],
    });
  });

  it("overrides", () => {
    const { env } = defineEnv({
      nodeCompat: true,
      overrides: { alias: { foo: "bar" } },
    });
    expect(env.alias.foo).toBe("bar");
  });

  it("has aliases for all builtinModules", () => {
    const { env } = defineEnv({ nodeCompat: true });
    for (const id of builtinModules) {
      expect(env.alias[id]).toBeDefined();
    }
  });

  it("has aliases for all node: builtin modules", () => {
    const { env } = defineEnv({ nodeCompat: true });
    for (const id of builtinModules) {
      expect(`node:` + env.alias[id]).toBeDefined();
    }
    for (const id of nodeBuiltinModules) {
      expect(env.alias[id]).toBeDefined();
    }
  });

  it("nagate", () => {
    const { env } = defineEnv({
      nodeCompat: false,
      overrides: {
        polyfill: ["foo", "bar", "!foo"],
        external: ["foo", "bar", "!foo"],
      },
    });
    expect(env.polyfill).toEqual(["bar"]);
    expect(env.external).toEqual(["bar"]);
  });

  it("expands externals to include bare/node: and alias-resolved ids", () => {
    const { env } = defineEnv({
      nodeCompat: false,
      resolve: true,
      presets: [
        {
          meta: { name: "test", url: import.meta.url },
          external: ["node:async_hooks"],
          alias: { "node:async_hooks": "unenv/node/async_hooks" },
        },
      ],
    });

    expect(env.external).toContain("node:async_hooks");
    expect(env.external).toContain("async_hooks");
    expect(env.external).toContain(env.alias["node:async_hooks"]);
  });

  it("expands negated externals too", () => {
    const { env } = defineEnv({
      nodeCompat: false,
      resolve: true,
      presets: [
        {
          meta: { name: "test", url: import.meta.url },
          external: ["node:async_hooks", "!node:async_hooks"],
          alias: { "node:async_hooks": "unenv/node/async_hooks" },
        },
      ],
    });

    expect(env.external).not.toContain("node:async_hooks");
    expect(env.external).not.toContain("async_hooks");
    expect(env.external).not.toContain(env.alias["node:async_hooks"]);
  });

  describe("resolvePath", () => {
    it("resolves all nodeCompat paths", () => {
      const { env } = defineEnv({ nodeCompat: true, resolve: true });
      for (const [from, to] of Object.entries(env.alias)) {
        expect(existsSync(to), `Alias: ${from} ~> ${to}`).toBe(true);
      }
      for (const path of env.polyfill) {
        expect(existsSync(path), path).toBe(true);
      }
      for (const inject of Object.values(env.inject)) {
        const to = Array.isArray(inject) ? inject[0] : inject;
        expect(existsSync(to), inject.toString()).toBe(true);
      }
    });
  });
});
