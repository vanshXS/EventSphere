import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  UserPlus,
  Shield,
  User,
  Copy,
  Check,
  Trash2,
  Search,
  Filter,
  LayoutGrid,
  List,
  Eye,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatDateTime } from "../../events/utils/eventHelpers";
import AddMemberModal from "./AddMemberModal";
import TeamDetailsModal from "./TeamDetailsModal";
import ConfirmDialog from "../../events/components/ConfirmDialog";
import { removeTeamMember, deleteTeam } from "../teamApi";

export default function MyTeamsList({
  teams = [],
  user,
  onCreateTeamClick,
  onTeamUpdated,
  onTeamDeleted
}) {
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "CARDS"
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); // "ALL" | "LEADER" | "MEMBER"

  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [selectedTeamForAddMember, setSelectedTeamForAddMember] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Deletion dialog states
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Member removal dialog states
  const [memberToRemove, setMemberToRemove] = useState(null); // { team, memberId, memberName }
  const [isRemoving, setIsRemoving] = useState(false);

  const handleCopyId = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const getIsLeader = (team) => {
    return (
      team.leaderId === user?.userId ||
      team.leaderId === user?.email ||
      team.createdBy === user?.userId
    );
  };

  const getNormalizedMembers = (team) => {
    if (team.members && team.members.length > 0) {
      return team.members;
    }
    return (team.membersId || team.memberIds || []).map((id) => ({
      userId: id,
      name:
        id === user?.userId
          ? `${user?.name || "You"}`
          : `Participant (${id.slice(0, 6)})`,
      email: id === user?.userId ? user?.email : "",
      leader: id === team.leaderId
    }));
  };

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const isLeader = getIsLeader(team);

      if (roleFilter === "LEADER" && !isLeader) return false;
      if (roleFilter === "MEMBER" && isLeader) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = team.name?.toLowerCase().includes(q);
      const matchId = team.id?.toLowerCase().includes(q);

      const members = getNormalizedMembers(team);
      const matchMember = members.some(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.userId?.toLowerCase().includes(q)
      );

      return matchName || matchId || matchMember;
    });
  }, [teams, roleFilter, searchQuery, user]);

  const leaderCount = useMemo(() => {
    return teams.filter((t) => getIsLeader(t)).length;
  }, [teams, user]);

  // Handle Team Deletion
  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      await deleteTeam(teamToDelete.id);

      if (selectedTeamForDetails?.id === teamToDelete.id) {
        setSelectedTeamForDetails(null);
      }
      if (onTeamDeleted) {
        onTeamDeleted(teamToDelete.id);
      }
      setTeamToDelete(null);
    } catch (err) {
      console.error("Failed to delete team:", err);
      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete team. Teams registered in competitions cannot be deleted."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Member Removal
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setIsRemoving(true);
      const updatedTeam = await removeTeamMember(
        memberToRemove.team.id,
        memberToRemove.memberId
      );
      if (onTeamUpdated) {
        onTeamUpdated(updatedTeam);
      }
      // If modal is open for this team, update selected team
      if (selectedTeamForDetails?.id === memberToRemove.team.id) {
        setSelectedTeamForDetails(updatedTeam);
      }
      setMemberToRemove(null);
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setIsRemoving(false);
    }
  };

  // Empty state: no teams created at all
  if (!teams || teams.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
          <Users className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">No Teams Formed Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Create a team to participate in group competitions, hackathons, and collaborative challenges.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateTeamClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Your First Team</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search, Filter & View Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams by name or member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Right controls: Role Filter & View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                roleFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({teams.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("LEADER")}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                roleFilter === "LEADER"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Led by Me ({leaderCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("MEMBER")}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                roleFilter === "MEMBER"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Member ({teams.length - leaderCount})
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              title="Table View"
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "TABLE"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CARDS")}
              title="Card View"
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "CARDS"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete error notification */}
      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError("")}
            className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zero search results */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            No teams match your search or filter
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or reset the role filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("ALL");
            }}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "TABLE" ? (
        /* TABLE VIEW (Clean, High Density, Fast) */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Your Role</th>
                  <th className="py-3 px-4">Members</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => {
                  const isLeader = getIsLeader(team);
                  const members = getNormalizedMembers(team);
                  const leaderMember = members.find((m) => m.leader || m.userId === team.leaderId);

                  return (
                    <tr
                      key={team.id}
                      onClick={() => setSelectedTeamForDetails(team)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Team Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {team.name}
                          </span>
                          <div
                            className="flex items-center gap-1 text-xs text-slate-400 font-mono mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>ID: {team.id?.slice(0, 8)}...</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(team.id, e)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer transition-colors"
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
                      </td>

                      {/* Your Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isLeader ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield className="w-3.5 h-3.5" />
                            Leader
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <User className="w-3.5 h-3.5" />
                            Member
                          </span>
                        )}
                      </td>

                      {/* Members */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            <Users className="w-3 h-3 text-slate-500" />
                            {members.length}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-[180px] hidden sm:inline">
                            {leaderMember ? `${leaderMember.name || "Leader"} (L)` : ""}
                            {members.length > 1 ? ` +${members.length - 1} more` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(team.createdAt)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTeamForDetails(team)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
                            title="View roster & details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Members</span>
                          </button>

                          {isLeader && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedTeamForAddMember(team)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer transition-colors"
                                title="Add member"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Add</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTeamToDelete(team)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                                title="Delete Team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const isLeader = getIsLeader(team);
            const members = getNormalizedMembers(team);

            return (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {team.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5">
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
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                        Leader
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        <User className="w-3.5 h-3.5" />
                        Member
                      </span>
                    )}
                  </div>

                  {/* Members count & preview */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {members.length} {members.length === 1 ? "Member" : "Members"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamForDetails(team)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      View Roster
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(team.createdAt)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isLeader && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedTeamForAddMember(team)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="Add Member"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTeamToDelete(team)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Details & Roster Modal */}
      <TeamDetailsModal
        isOpen={Boolean(selectedTeamForDetails)}
        team={selectedTeamForDetails}
        user={user}
        onClose={() => setSelectedTeamForDetails(null)}
        onAddMemberClick={(team) => {
          setSelectedTeamForAddMember(team);
        }}
        onRemoveMemberClick={(team, memberId, memberName) => {
          setMemberToRemove({ team, memberId, memberName });
        }}
        onDeleteTeamClick={(team) => {
          setTeamToDelete(team);
        }}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={Boolean(selectedTeamForAddMember)}
        team={selectedTeamForAddMember}
        onClose={() => setSelectedTeamForAddMember(null)}
        onMemberAdded={(updatedTeam) => {
          if (onTeamUpdated) {
            onTeamUpdated(updatedTeam);
          }
          if (selectedTeamForDetails?.id === updatedTeam.id) {
            setSelectedTeamForDetails(updatedTeam);
          }
        }}
      />

      {/* Confirm Team Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teamToDelete)}
        title="Delete Team"
        message={`Are you sure you want to delete "${teamToDelete?.name}"? All member associations will be deleted. Note: Teams with active or pending competition registrations cannot be deleted.`}
        confirmLabel="Delete Team"
        cancelLabel="Keep Team"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => {
          if (!isDeleting) {
            setTeamToDelete(null);
            setDeleteError("");
          }
        }}
      />

      {/* Confirm Member Removal Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        title="Remove Member"
        message={`Are you sure you want to remove ${
          memberToRemove?.memberName || "this member"
        } from "${memberToRemove?.team?.name}"?`}
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isRemoving}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => {
          if (!isRemoving) {
            setMemberToRemove(null);
          }
        }}
      />
    </div>
  );
}
