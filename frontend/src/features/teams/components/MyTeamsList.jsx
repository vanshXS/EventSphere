import React, { useState } from "react";
import { Users, Plus, UserPlus, Shield, User, Copy, Check, Trash2 } from "lucide-react";
import { formatDateTime } from "../../events/utils/eventHelpers";
import AddMemberModal from "./AddMemberModal";
import { removeTeamMember } from "../teamApi";

export default function MyTeamsList({
  teams,
  user,
  onCreateTeamClick,
  onTeamUpdated
}) {
  const [selectedTeamForAddMember, setSelectedTeamForAddMember] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const handleCopyId = async (id, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const handleRemoveMember = async (team, memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || "this member"} from ${team.name}?`)) {
      return;
    }
    try {
      setRemovingId(memberId);
      const updatedTeam = await removeTeamMember(team.id, memberId);
      if (onTeamUpdated) {
        onTeamUpdated(updatedTeam);
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  if (!teams || teams.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
        <Users className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800">No Teams Created</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Create a team to register for group competitions and collaborative events.
        </p>
        <button
          type="button"
          onClick={onCreateTeamClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Team</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const isLeader = team.leaderId === user?.userId || team.leaderId === user?.email;
          const membersList = team.members && team.members.length > 0
            ? team.members
            : (team.membersId || team.memberIds || []).map((id) => ({
                userId: id,
                name: id === user?.userId ? `${user?.name || "You"}` : `Participant (${id.slice(0, 6)})`,
                email: id === user?.userId ? user?.email : "",
                leader: id === team.leaderId
              }));
          const membersCount = membersList.length;

          return (
            <div
              key={team.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{team.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>ID: {team.id?.slice(0, 10)}...</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(team.id, e)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                        title="Copy full Team ID"
                      >
                        {copiedId === team.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isLeader ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      <Shield className="w-3 h-3" />
                      Leader
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      <User className="w-3 h-3" />
                      Member
                    </span>
                  )}
                </div>

                {/* Members list */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Members ({membersCount})
                    </span>
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => setSelectedTeamForAddMember(team)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {membersList.map((m, idx) => {
                      const isMemberLeader = m.leader || m.userId === team.leaderId;
                      const isSelf = m.userId === user?.userId || m.email === user?.email;

                      return (
                        <div
                          key={m.userId || idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate">
                              {m.name || m.userId} {isSelf ? "(You)" : ""}
                            </div>
                            {m.email && (
                              <div className="text-[11px] text-slate-500 truncate">{m.email}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isMemberLeader ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-800">
                                Leader
                              </span>
                            ) : isLeader && !isSelf ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(team, m.userId, m.name)}
                                disabled={removingId === m.userId}
                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created {formatDateTime(team.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={Boolean(selectedTeamForAddMember)}
        team={selectedTeamForAddMember}
        onClose={() => setSelectedTeamForAddMember(null)}
        onMemberAdded={(updatedTeam) => {
          if (onTeamUpdated) {
            onTeamUpdated(updatedTeam);
          }
        }}
      />
    </>
  );
}
