import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChatMessageBubble } from "@/components/agent/chat-message-bubble";
import type { ChatMessage } from "@/lib/agent/types";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

const profile: DashboardProfile = {
  firstName: "Ada",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  avatarSrc: "",
  initials: "AL",
};

function renderBubble(message: ChatMessage): string {
  return renderToStaticMarkup(
    createElement(ChatMessageBubble, { message, profile })
  );
}

describe("ChatMessageBubble markdown", () => {
  it("renders agent strong, emphasis, list, code, and link", () => {
    const html = renderBubble({
      id: "a1",
      role: "agent",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: [
        "**bold** and *italic*",
        "",
        "- item one",
        "",
        "`inline`",
        "",
        "```",
        "const x = 1;",
        "```",
        "",
        "[docs](https://example.com/docs)",
      ].join("\n"),
    });

    assert.match(html, /<strong[^>]*>bold<\/strong>/u);
    assert.match(html, /<em[^>]*>italic<\/em>/u);
    assert.match(html, /<li[^>]*>[\s\S]*item one[\s\S]*<\/li>/u);
    assert.match(html, /<code[^>]*>inline<\/code>/u);
    assert.match(html, /<code[^>]*>[\s\S]*const x = 1;[\s\S]*<\/code>/u);
    assert.match(
      html,
      /<a[^>]*href="https:\/\/example\.com\/docs"[^>]*>docs<\/a>/u
    );
    assert.doesNotMatch(html, /\*\*bold\*\*/u);
  });

  it("renders GFM tables and task lists for agent messages", () => {
    const html = renderBubble({
      id: "a2",
      role: "agent",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: [
        "| A | B |",
        "| --- | --- |",
        "| 1 | 2 |",
        "",
        "- [x] done",
        "- [ ] todo",
      ].join("\n"),
    });

    assert.match(html, /<table[\s\S]*<th[\s\S]*>A<\/th>/u);
    assert.match(html, /<td[\s\S]*>1<\/td>/u);
    assert.match(html, /<input[^>]*type="checkbox"[^>]*disabled[^>]*checked/u);
    assert.match(html, /<input[^>]*type="checkbox"[^>]*disabled/u);
  });

  it("keeps user message markdown and newlines literal", () => {
    const html = renderBubble({
      id: "u1",
      role: "user",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: "**not bold**\nsecond line",
    });

    assert.match(html, /\*\*not bold\*\*/u);
    assert.doesNotMatch(html, /<strong/u);
    assert.match(html, /whitespace-pre-wrap/u);
    assert.match(html, /second line/u);
  });

  it("does not execute unsafe HTML or javascript links in agent messages", () => {
    const html = renderBubble({
      id: "a3",
      role: "agent",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: [
        '<script>alert("xss")</script>',
        "",
        "[click](javascript:alert(1))",
        "",
        "![pic](https://evil.example/a.png)",
      ].join("\n"),
    });

    assert.doesNotMatch(html, /<script/iu);
    assert.doesNotMatch(html, /javascript:/iu);
    assert.doesNotMatch(html, /<img\b/iu);
    assert.match(html, /alert\("xss"\)|alert\(&quot;xss&quot;\)/u);
  });

  it("keeps long unbroken fenced code scrollable inside a min-width-bounded bubble", () => {
    const longCode = "A".repeat(220);
    const html = renderBubble({
      id: "a4",
      role: "agent",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: ["```", longCode, "```"].join("\n"),
    });

    assert.ok(html.includes("max-w-[75%]"));
    assert.ok(html.includes("min-w-0"));
    assert.ok(html.includes("max-w-full"));
    assert.ok(!/text-body[^"]*overflow-hidden/u.test(html));
    assert.match(
      html,
      /<pre[^>]*overflow-x-auto[^>]*min-w-0|<pre[^>]*min-w-0[^>]*overflow-x-auto/u
    );
    assert.ok(!/<pre[^>]*whitespace-pre-wrap/u.test(html));
    assert.ok(!/<pre[^>]*truncate/u.test(html));
    assert.ok(html.includes(longCode));
  });

  it("wraps long unbroken user text instead of clipping", () => {
    const longWord = "B".repeat(220);
    const html = renderBubble({
      id: "u2",
      role: "user",
      kind: "text",
      createdAt: "2026-11-09T10:00:00.000Z",
      body: longWord,
    });

    assert.ok(html.includes("max-w-[75%]"));
    assert.ok(html.includes("min-w-0"));
    assert.ok(html.includes("max-w-full"));
    assert.ok(!/text-body[^"]*overflow-hidden/u.test(html));
    assert.ok(html.includes("break-all"));
    assert.ok(html.includes(longWord));
  });
});
