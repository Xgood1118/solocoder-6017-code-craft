"use client";

import { useState } from "react";
import { X, GitFork } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { LANGUAGE_CONFIG } from "@/app/(root)/_constants";
import { Snippet } from "@/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ForkSnippetDialogProps {
  snippet: Snippet;
  onClose: () => void;
}

function ForkSnippetDialog({ snippet, onClose }: ForkSnippetDialogProps) {
  const router = useRouter();
  const [targetLanguage, setTargetLanguage] = useState(snippet.language);
  const [title, setTitle] = useState(`Fork of ${snippet.title}`);
  const [isForking, setIsForking] = useState(false);

  const createSnippet = useMutation(api.snippets.createSnippet);

  const handleFork = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsForking(true);
    try {
      const newSnippetId = await createSnippet({
        title,
        language: targetLanguage,
        code: snippet.code,
        forkedFromId: snippet._id,
      });

      toast.success("Snippet forked successfully!");
      onClose();
      router.push(`/snippets/${newSnippetId}`);
    } catch (error) {
      console.error("Fork error:", error);
      toast.error("Failed to fork snippet");
    } finally {
      setIsForking(false);
    }
  };

  const languages = Object.values(LANGUAGE_CONFIG);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Fork Snippet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFork}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Original Snippet
              </label>
              <div className="bg-[#181825] border border-[#313244] rounded-lg p-3">
                <p className="text-white font-medium truncate">{snippet.title}</p>
                <p className="text-sm text-gray-400">by {snippet.userName}</p>
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
                New Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter snippet title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Target Language
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setTargetLanguage(lang.id)}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      targetLanguage === lang.id
                        ? "bg-blue-500/20 border-blue-500 text-blue-400"
                        : "bg-[#181825] border-[#313244] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <span className="text-xs font-medium">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isForking}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isForking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Forking...
                </>
              ) : (
                <>
                  <GitFork className="w-4 h-4" />
                  Fork
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForkSnippetDialog;
