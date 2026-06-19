import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(), // clerkId
    email: v.string(),
    name: v.string(),
    isPro: v.boolean(),
    proSince: v.optional(v.number()),
    lemonSqueezyCustomerId: v.optional(v.string()),
    lemonSqueezyOrderId: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),

  codeExecutions: defineTable({
    userId: v.string(),
    language: v.string(),
    code: v.string(),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),

  snippets: defineTable({
    userId: v.string(),
    title: v.string(),
    language: v.string(),
    code: v.string(),
    userName: v.string(), // store user's name for easy access
    forkedFromId: v.optional(v.id("snippets")), // reference to original snippet
  }).index("by_user_id", ["userId"]).index("by_forked_from_id", ["forkedFromId"]),

  snippetComments: defineTable({
    snippetId: v.id("snippets"),
    userId: v.string(),
    userName: v.string(),
    content: v.string(), // This will store HTML content
    mentionWords: v.optional(v.array(v.string())), // display names of mentioned users (lowercase, for matching)
    mentionDisplayTexts: v.optional(v.array(v.string())), // actual @ text as it appeared in comment (e.g. "John Doe")
    mentionedUserNames: v.optional(v.array(v.string())), // full user names
    mentionedUserIds: v.optional(v.array(v.string())), // userIds of mentioned users
  }).index("by_snippet_id", ["snippetId"]),

  stars: defineTable({
    userId: v.string(),
    snippetId: v.id("snippets"),
  })
    .index("by_user_id", ["userId"])
    .index("by_snippet_id", ["snippetId"])
    .index("by_user_id_and_snippet_id", ["userId", "snippetId"]),

  notifications: defineTable({
    userId: v.string(), // user who receives the notification
    type: v.string(), // "mention"
    snippetId: v.id("snippets"),
    snippetTitle: v.string(),
    commentId: v.optional(v.id("snippetComments")),
    fromUserId: v.string(), // user who triggered the notification
    fromUserName: v.string(),
    isRead: v.boolean(),
  }).index("by_user_id", ["userId"]).index("by_user_id_and_read", ["userId", "isRead"]),
});
