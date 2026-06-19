import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSnippet = mutation({
  args: {
    title: v.string(),
    language: v.string(),
    code: v.string(),
    forkedFromId: v.optional(v.id("snippets")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const snippetData: any = {
      userId: identity.subject,
      userName: user.name,
      title: args.title,
      language: args.language,
      code: args.code,
    };

    if (args.forkedFromId) {
      snippetData.forkedFromId = args.forkedFromId;
    }

    const snippetId = await ctx.db.insert("snippets", snippetData);

    return snippetId;
  },
});

export const deleteSnippet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new Error("Snippet not found");

    if (snippet.userId !== identity.subject) {
      throw new Error("Not authorized to delete this snippet");
    }

    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    for (const star of stars) {
      await ctx.db.delete(star._id);
    }

    await ctx.db.delete(args.snippetId);
  },
});

export const starSnippet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id")
      .filter(
        (q) =>
          q.eq(q.field("userId"), identity.subject) && q.eq(q.field("snippetId"), args.snippetId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("stars", {
        userId: identity.subject,
        snippetId: args.snippetId,
      });
    }
  },
});

export const addComment = mutation({
  args: {
    snippetId: v.id("snippets"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("snippetComments", {
      snippetId: args.snippetId,
      userId: identity.subject,
      userName: user.name,
      content: args.content,
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("snippetComments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Check if the user is the comment author
    if (comment.userId !== identity.subject) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});

export const getSnippets = query({
  handler: async (ctx) => {
    const snippets = await ctx.db.query("snippets").order("desc").collect();
    return snippets;
  },
});

export const getSnippetsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const snippets = await ctx.db
      .query("snippets")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();

    return snippets;
  },
});

export const getSnippetById = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new Error("Snippet not found");

    return snippet;
  },
});

export const getComments = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .order("desc")
      .collect();

    return comments;
  },
});

export const isSnippetStarred = query({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const star = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id")
      .filter(
        (q) =>
          q.eq(q.field("userId"), identity.subject) && q.eq(q.field("snippetId"), args.snippetId)
      )
      .first();

    return !!star;
  },
});

export const getSnippetStarCount = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    return stars.length;
  },
});

export const getStarredSnippets = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const snippets = await Promise.all(stars.map((star) => ctx.db.get(star.snippetId)));

    return snippets.filter((snippet) => snippet !== null);
  },
});

// ====== Fork related APIs ======

export const getForkedBySnippets = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const snippets = await ctx.db
      .query("snippets")
      .withIndex("by_forked_from_id")
      .filter((q) => q.eq(q.field("forkedFromId"), args.snippetId))
      .collect();

    return snippets;
  },
});

export const getMyForkedSnippets = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const snippets = await ctx.db
      .query("snippets")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const forkedSnippets = snippets.filter((s) => s.forkedFromId !== undefined);

    const snippetsWithOriginals = await Promise.all(
      forkedSnippets.map(async (s) => {
        const original = s.forkedFromId ? await ctx.db.get(s.forkedFromId) : null;
        return {
          ...s,
          originalSnippet: original,
        };
      })
    );

    return snippetsWithOriginals;
  },
});

export const getSnippetsForkedFromMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const mySnippets = await ctx.db
      .query("snippets")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const mySnippetIds = new Set(mySnippets.map((s) => s._id));

    const allForked = await ctx.db
      .query("snippets")
      .withIndex("by_forked_from_id")
      .collect();

    const forkedFromMe = allForked.filter(
      (s) => s.forkedFromId && mySnippetIds.has(s.forkedFromId)
    );

    return forkedFromMe;
  },
});

// ====== Mention & Notification related APIs ======

function findMentions(content: string, users: Array<{ name: string; userId: string }>) {
  const mentions: Array<{ word: string; matchedText: string; userName: string; userId: string; startIndex: number }> = [];
  const atPositions: number[] = [];

  for (let i = 0; i < content.length; i++) {
    if (content[i] === "@") {
      atPositions.push(i);
    }
  }

  const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);
  const usedRanges: Array<{ start: number; end: number }> = [];

  for (const atPos of atPositions) {
    const textAfterAt = content.slice(atPos + 1);

    for (const user of sortedUsers) {
      const lowerText = textAfterAt.toLowerCase();
      const lowerName = user.name.toLowerCase();

      if (lowerText.startsWith(lowerName)) {
        const matchEnd = atPos + 1 + user.name.length;
        const charAfterMatch = content[matchEnd];
        const isBoundary = charAfterMatch === undefined || /\s|@|[^\w\u4e00-\u9fa5]/.test(charAfterMatch);

        if (!isBoundary) continue;

        const overlap = usedRanges.some(
          (range) => !(matchEnd <= range.start || atPos >= range.end)
        );
        if (overlap) continue;

        const matchedText = textAfterAt.slice(0, user.name.length);

        mentions.push({
          word: user.name,
          matchedText: matchedText,
          userName: user.name,
          userId: user.userId,
          startIndex: atPos,
        });

        usedRanges.push({ start: atPos, end: matchEnd });
        break;
      }
    }
  }

  return mentions;
}

export const addCommentWithMentions = mutation({
  args: {
    snippetId: v.id("snippets"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new Error("Snippet not found");

    const allUsers = await ctx.db.query("users").collect();
    const mentions = findMentions(args.content, allUsers);

    const uniqueMentions = new Map<string, (typeof mentions)[0]>();
    mentions.forEach((m) => {
      if (m.userId !== identity.subject) {
        uniqueMentions.set(m.userId, m);
      }
    });

    const validMentionWords: string[] = [];
    const validMentionDisplayTexts: string[] = [];
    const validMentionedUserNames: string[] = [];
    const mentionedUserIds: string[] = [];

    uniqueMentions.forEach((m) => {
      validMentionWords.push(m.word.toLowerCase());
      validMentionDisplayTexts.push(m.matchedText);
      validMentionedUserNames.push(m.userName);
      mentionedUserIds.push(m.userId);
    });

    const commentId = await ctx.db.insert("snippetComments", {
      snippetId: args.snippetId,
      userId: identity.subject,
      userName: user.name,
      content: args.content,
      mentionWords: validMentionWords,
      mentionDisplayTexts: validMentionDisplayTexts,
      mentionedUserNames: validMentionedUserNames,
      mentionedUserIds: mentionedUserIds,
    });

    for (const userId of mentionedUserIds) {
      await ctx.db.insert("notifications", {
        userId,
        type: "mention",
        snippetId: args.snippetId,
        snippetTitle: snippet.title,
        commentId: commentId,
        fromUserId: identity.subject,
        fromUserName: user.name,
        isRead: false,
      });
    }

    return commentId;
  },
});

export const getMyNotifications = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .collect();

    return notifications;
  },
});

export const getUnreadNotificationCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id_and_read")
      .filter((q) =>
        q.and(q.eq(q.field("userId"), identity.subject), q.eq(q.field("isRead"), false))
      )
      .collect();

    return notifications.length;
  },
});

export const markNotificationAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== identity.subject)
      throw new Error("Not authorized to mark this notification as read");

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllNotificationsAsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id_and_read")
      .filter((q) =>
        q.and(q.eq(q.field("userId"), identity.subject), q.eq(q.field("isRead"), false))
      )
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});

export const searchUsersByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    if (!args.name) return [];

    const searchLower = args.name.toLowerCase();
    const users = await ctx.db.query("users").collect();

    const matched = users
      .filter((u) => u.name.toLowerCase().includes(searchLower))
      .slice(0, 10)
      .map((u) => ({
        userId: u.userId,
        name: u.name,
      }));

    return matched;
  },
});
