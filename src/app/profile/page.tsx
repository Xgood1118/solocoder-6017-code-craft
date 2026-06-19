"use client";
import { useUser } from "@clerk/nextjs";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import NavigationHeader from "@/components/NavigationHeader";
import ProfileHeader from "./_components/ProfileHeader";
import ProfileHeaderSkeleton from "./_components/ProfileHeaderSkeleton";
import { ChevronRight, Clock, Code, Download, GitFork, ListVideo, Loader2, Bell, Star, User, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import StarButton from "@/components/StarButton";
import CodeBlock from "./_components/CodeBlock";
import ExportHistoryDialog from "./_components/ExportHistoryDialog";
import { Snippet, Notification } from "@/types";

const TABS = [
  {
    id: "snippets",
    label: "Snippets",
    icon: Code,
  },
  {
    id: "executions",
    label: "Code Executions",
    icon: ListVideo,
  },
  {
    id: "starred",
    label: "Starred Snippets",
    icon: Star,
  },
  {
    id: "forkedFrom",
    label: "Forked From",
    icon: GitFork,
  },
  {
    id: "forkedBy",
    label: "Forked By",
    icon: GitFork,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
  },
];

function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const isOwnProfile = !targetUserId || (user && targetUserId === user.id);

  const profileUserId = isOwnProfile ? user?.id : targetUserId;

  const [activeTab, setActiveTab] = useState<
    | "snippets"
    | "executions"
    | "starred"
    | "forkedFrom"
    | "forkedBy"
    | "notifications"
  >(isOwnProfile ? "executions" : "snippets");
  const [showExportDialog, setShowExportDialog] = useState(false);

  const userStats = useQuery(api.codeExecutions.getUserStats, {
    userId: profileUserId ?? "",
  });

  const userSnippets = useQuery(
    api.snippets.getSnippetsByUserId,
    profileUserId ? { userId: profileUserId } : "skip"
  );

  const starredSnippets = useQuery(api.snippets.getStarredSnippets);
  const myForkedSnippets = useQuery(api.snippets.getMyForkedSnippets);
  const forkedFromMeSnippets = useQuery(api.snippets.getSnippetsForkedFromMe);
  const notifications = useQuery(api.snippets.getMyNotifications);
  const unreadCount = useQuery(api.snippets.getUnreadNotificationCount);
  const markAsRead = useMutation(api.snippets.markNotificationAsRead);
  const markAllAsRead = useMutation(api.snippets.markAllNotificationsAsRead);

  const {
    results: executions,
    status: executionStatus,
    isLoading: isLoadingExecutions,
    loadMore,
  } = usePaginatedQuery(
    api.codeExecutions.getUserExecutions,
    {
      userId: profileUserId ?? "",
    },
    { initialNumItems: 5 }
  );

  const userData = useQuery(api.users.getUser, { userId: profileUserId ?? "" });

  const handleLoadMore = () => {
    if (executionStatus === "CanLoadMore") loadMore(5);
  };

  const visibleTabs = isOwnProfile
    ? TABS
    : TABS.filter((t) => t.id === "snippets");

  if (!user && isLoaded && isOwnProfile) return router.push("/");
  if (!profileUserId) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavigationHeader />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Profile Header */}

        {userStats && userData && (
          <ProfileHeader
            userStats={userStats}
            userData={userData}
            user={isOwnProfile ? user ?? undefined : undefined}
          />
        )}

        {(userStats === undefined || !isLoaded) && <ProfileHeaderSkeleton />}

        {/* Main content */}
        <div
          className="bg-gradient-to-br from-[#12121a] to-[#1a1a2e] rounded-3xl shadow-2xl 
        shadow-black/50 border border-gray-800/50 backdrop-blur-xl overflow-hidden"
        >
          {/* Tabs */}
          <div className="border-b border-gray-800/50">
            <div className="flex space-x-1 p-4 flex-wrap">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | "snippets"
                        | "executions"
                        | "starred"
                        | "forkedFrom"
                        | "forkedBy"
                        | "notifications"
                    )
                  }
                  className={`group flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${
                    activeTab === tab.id ? "text-blue-400" : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-500/10 rounded-lg"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="text-sm font-medium relative z-10">{tab.label}</span>
                  {tab.id === "notifications" && unreadCount !== undefined && unreadCount > 0 && (
                    <span className="relative z-10 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {/* ACTIVE TAB IS SNIPPETS: */}
              {activeTab === "snippets" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userSnippets?.map((snippet: Snippet) => (
                    <div key={snippet._id} className="group relative">
                      <Link href={`/snippets/${snippet._id}`}>
                        <div
                          className="bg-black/20 rounded-xl border border-gray-800/50 hover:border-gray-700/50 
                          transition-all duration-300 overflow-hidden h-full group-hover:transform
                        group-hover:scale-[1.02]"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
                                  <Image
                                    src={`/${snippet.language}.png`}
                                    alt={`${snippet.language} logo`}
                                    className="relative z-10"
                                    width={40}
                                    height={40}
                                  />
                                </div>
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
                                  {snippet.language}
                                </span>
                              </div>
                              {isOwnProfile && (
                                <div
                                  className="z-10"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <StarButton snippetId={snippet._id} />
                                </div>
                              )}
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors">
                              {snippet.title}
                            </h2>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(snippet._creationTime).toLocaleDateString()}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                          <div className="px-6 pb-6">
                            <div className="bg-black/30 rounded-lg p-4 overflow-hidden">
                              <pre className="text-sm text-gray-300 font-mono line-clamp-3">
                                {snippet.code}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {(!userSnippets || userSnippets.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No snippets yet
                      </h3>
                      <p className="text-gray-500">
                        This user hasn&apos;t created any snippets yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB IS EXECUTIONS: */}
              {activeTab === "executions" && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowExportDialog(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export History
                    </button>
                  </div>

                  {executions?.map((execution) => (
                    <div
                      key={execution._id}
                      className="group rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-500/50 hover:shadow-md hover:shadow-blue-500/50"
                    >
                      <div className="flex items-center justify-between p-4 bg-black/30 border border-gray-800/50 rounded-t-xl">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
                            <Image
                              src={"/" + execution.language + ".png"}
                              alt=""
                              className="rounded-lg relative z-10 object-cover"
                              width={40}
                              height={40}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {execution.language.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">
                                {new Date(execution._creationTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  execution.error
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-green-500/10 text-green-400"
                                }`}
                              >
                                {execution.error ? "Error" : "Success"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-black/20 rounded-b-xl border border-t-0 border-gray-800/50">
                        <CodeBlock code={execution.code} language={execution.language} />

                        {(execution.output || execution.error) && (
                          <div className="mt-4 p-4 rounded-lg bg-black/40">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Output</h4>
                            <pre
                              className={`text-sm ${
                                execution.error ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {execution.error || execution.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoadingExecutions ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        Loading code executions...
                      </h3>
                    </div>
                  ) : (
                    executions.length === 0 && (
                      <div className="text-center py-12">
                        <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">
                          No code executions yet
                        </h3>
                        <p className="text-gray-500">Start coding to see your execution history!</p>
                      </div>
                    )
                  )}

                  {/* Load More Button */}
                  {executionStatus === "CanLoadMore" && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg flex items-center gap-2 
                        transition-colors"
                      >
                        Load More
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB IS STARS: */}
              {activeTab === "starred" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {starredSnippets?.map((snippet: Snippet) => (
                    <div key={snippet._id} className="group relative">
                      <Link href={`/snippets/${snippet._id}`}>
                        <div
                          className="bg-black/20 rounded-xl border border-gray-800/50 hover:border-gray-700/50 
                          transition-all duration-300 overflow-hidden h-full group-hover:transform
                        group-hover:scale-[1.02]"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
                                  <Image
                                    src={`/${snippet.language}.png`}
                                    alt={`${snippet.language} logo`}
                                    className="relative z-10"
                                    width={40}
                                    height={40}
                                  />
                                </div>
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
                                  {snippet.language}
                                </span>
                              </div>
                              <div
                                className="absolute top-6 right-6 z-10"
                                onClick={(e) => e.preventDefault()}
                              >
                                <StarButton snippetId={snippet._id} />
                              </div>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors">
                              {snippet.title}
                            </h2>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(snippet._creationTime).toLocaleDateString()}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                          <div className="px-6 pb-6">
                            <div className="bg-black/30 rounded-lg p-4 overflow-hidden">
                              <pre className="text-sm text-gray-300 font-mono line-clamp-3">
                                {snippet.code}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {(!starredSnippets || starredSnippets.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No starred snippets yet
                      </h3>
                      <p className="text-gray-500">
                        Start exploring and star the snippets you find useful!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB IS FORKED FROM: */}
              {activeTab === "forkedFrom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myForkedSnippets?.map((snippet: Snippet & { originalSnippet: { userName: string } | null }) => (
                    <div key={snippet._id} className="group relative">
                      <Link href={`/snippets/${snippet._id}`}>
                        <div
                          className="bg-black/20 rounded-xl border border-gray-800/50 hover:border-gray-700/50 
                          transition-all duration-300 overflow-hidden h-full group-hover:transform
                        group-hover:scale-[1.02]"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
                                  <Image
                                    src={`/${snippet.language}.png`}
                                    alt={`${snippet.language} logo`}
                                    className="relative z-10"
                                    width={40}
                                    height={40}
                                  />
                                </div>
                                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                  {snippet.language}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <GitFork className="w-3 h-3" />
                                Forked
                              </div>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors">
                              {snippet.title}
                            </h2>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(snippet._creationTime).toLocaleDateString()}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                            {snippet.originalSnippet && (
                              <div className="mt-3 pt-3 border-t border-gray-800/50">
                                <p className="text-xs text-gray-500">
                                  Forked from{" "}
                                  <span className="text-gray-300">
                                    {snippet.originalSnippet.userName}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="px-6 pb-6">
                            <div className="bg-black/30 rounded-lg p-4 overflow-hidden">
                              <pre className="text-sm text-gray-300 font-mono line-clamp-3">
                                {snippet.code}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {(!myForkedSnippets || myForkedSnippets.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <GitFork className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No forked snippets yet
                      </h3>
                      <p className="text-gray-500">
                        Fork snippets from other users to build on their work!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB IS FORKED BY: */}
              {activeTab === "forkedBy" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {forkedFromMeSnippets?.map((snippet: Snippet) => (
                    <div key={snippet._id} className="group relative">
                      <Link href={`/snippets/${snippet._id}`}>
                        <div
                          className="bg-black/20 rounded-xl border border-gray-800/50 hover:border-gray-700/50 
                          transition-all duration-300 overflow-hidden h-full group-hover:transform
                        group-hover:scale-[1.02]"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
                                  <Image
                                    src={`/${snippet.language}.png`}
                                    alt={`${snippet.language} logo`}
                                    className="relative z-10"
                                    width={40}
                                    height={40}
                                  />
                                </div>
                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-sm">
                                  {snippet.language}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="w-3 h-3" />
                                Forked by
                              </div>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors">
                              {snippet.title}
                            </h2>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(snippet._creationTime).toLocaleDateString()}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-800/50">
                              <p className="text-xs text-gray-500">
                                Forked by{" "}
                                <span className="text-gray-300">{snippet.userName}</span>
                              </p>
                            </div>
                          </div>
                          <div className="px-6 pb-6">
                            <div className="bg-black/30 rounded-lg p-4 overflow-hidden">
                              <pre className="text-sm text-gray-300 font-mono line-clamp-3">
                                {snippet.code}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {(!forkedFromMeSnippets || forkedFromMeSnippets.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <GitFork className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No one has forked your snippets yet
                      </h3>
                      <p className="text-gray-500">
                        Share your snippets and wait for others to fork them!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB IS NOTIFICATIONS: */}
              {activeTab === "notifications" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => markAllAsRead()}
                      disabled={!unreadCount || unreadCount === 0}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all as read
                    </button>
                  </div>

                  {notifications?.map((notification: Notification) => (
                    <div
                      key={notification._id}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead({ notificationId: notification._id });
                        }
                        router.push(`/snippets/${notification.snippetId}`);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        notification.isRead
                          ? "bg-black/20 border-gray-800/50 hover:border-gray-700/50"
                          : "bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notification.isRead
                              ? "bg-gray-800/50"
                              : "bg-blue-500/20"
                          }`}
                        >
                          <Bell
                            className={`w-5 h-5 ${
                              notification.isRead ? "text-gray-500" : "text-blue-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              notification.isRead ? "text-gray-400" : "text-white"
                            }`}
                          >
                            <span className="font-medium">{notification.fromUserName}</span>{" "}
                            mentioned you in a comment
                          </p>
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            Snippet: {notification.snippetTitle}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(notification._creationTime).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}

                  {(!notifications || notifications.length === 0) && (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No notifications yet
                      </h3>
                      <p className="text-gray-500">
                        You&apos;ll be notified when someone mentions you in a comment.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showExportDialog && user && (
        <ExportHistoryDialog
          onClose={() => setShowExportDialog(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
export default ProfilePage;
