import React, { useState } from "react";
import {
  X,
  Users,
  Shield,
  User,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { formatDateTime } from "../../events/utils/eventHelpers";

export default function TeamDetailsModal({
  isOpen,
  team,
  user,
  onClose,
  onAddMemberClick,
  onRemoveMemberClick,
  onDeleteTeamClick
}) {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !team) return null;

  const isLeader =
    team.leaderId === user?.userId ||
    team.leaderId === user?.email ||
    team.createdBy === user?.userId;

  const membersList =
    team.members && team.members.length > 0
      ? team.members
      : (team.membersId || team.memberIds || []).map((id) => ({
          userId: id,
          name:
            id === user?.userId
              ? `${user?.name || "You"}`
              : `Participant (${id.slice(0, 6)})`,
          email: id === user?.userId ? user?.email : "",
          leader: id === team.leaderId
        }));

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(team.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Failed to copy Team ID:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {team.name}
              </h2>
              {isLeader ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Shield className="w-3.5 h-3.5" />
                  Team Leader
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  <User className="w-3.5 h-3.5" />
                  Member
                </span>
              )}
            </div>

            {/* Team ID & metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap pt-1">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono">
                <span className="text-slate-400">Team ID:</span>
                <span className="text-slate-700">{team.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="ml-1 p-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer rounded"
                  title="Copy full Team ID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {team.createdAt && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {formatDateTime(team.createdAt)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Members Roster */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Team Roster ({membersList.length})
            </h3>

            {isLeader && (
              <button
                type="button"
                onClick={() => onAddMemberClick(team)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {membersList.map((m, idx) => {
              const isMemberLeader = m.leader || m.userId === team.leaderId;
              const isSelf =
                m.userId === user?.userId || m.email === user?.email;
              const initials = (m.name || "U")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={m.userId || idx}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isMemberLeader
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {m.name || m.userId}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                            You
                          </span>
                        )}
                      </div>
                      {m.email && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {m.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMemberLeader ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Leader
                      </span>
                    ) : isLeader && !isSelf ? (
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveMemberClick(team, m.userId, m.name)
                        }
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 px-2 py-0.5">
                        Member
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {isLeader ? (
            <button
              type="button"
              onClick={() => onDeleteTeamClick(team)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Team</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
