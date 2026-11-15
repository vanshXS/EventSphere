import { useState, useMemo } from "react";
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
  LayoutGrid,
  List,
  Eye
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
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth < 768 ? "CARDS" : "TABLE"); // responsive default; existing toggle is retained
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

  const createdDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  const renderTeamCard = (team) => {
    const isLeader = getIsLeader(team);
    const members = getNormalizedMembers(team);
    const leaderMember = members.find((member) => member.leader || member.userId === team.leaderId);
    const initials = (team.name || "T").trim().charAt(0).toUpperCase();

    return (
      <article key={team.id} className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-100 text-base font-bold uppercase text-indigo-700">{initials}</span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{team.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{isLeader ? "Team leader" : "Team member"}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isLeader ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
              {isLeader ? "Leader" : "Member"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="min-w-0 truncate font-mono text-xs text-slate-500">ID: {team.id}</span>
            <button type="button" onClick={(event) => handleCopyId(team.id,event)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800" title="Copy Team ID">
              {copiedId === team.id ? <Check className="h-3.5 w-3.5 text-emerald-600"/> : <Copy className="h-3.5 w-3.5"/>}
              {copiedId === team.id ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="rounded-lg bg-indigo-50/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">Team roster</span>
              <span className="text-xs font-bold text-indigo-700">{members.length} {members.length === 1 ? "member" : "members"}</span>
            </div>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.slice(0,3).map((member,index) => (
                  <div key={member.userId || index} className="flex min-w-0 items-center gap-2.5 rounded-md bg-white px-2.5 py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {(member.name || member.userId || "P").trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{member.name || "Participant"}</p>
                      {member.email && <p className="truncate text-[11px] text-slate-500">{member.email}</p>}
                    </div>
                    {(member.leader || member.userId === team.leaderId) && <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">LEADER</span>}
                  </div>
                ))}
                {members.length > 3 && <p className="text-[11px] text-slate-500">+{members.length - 3} more members</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Member details are not available.</p>
            )}
            {leaderMember && members.length === 0 && <p className="text-xs text-slate-500">{leaderMember.name}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="text-[11px] text-slate-500">Created {createdDate(team.createdAt)}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setSelectedTeamForDetails(team)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200">
              Members
            </button>
            {isLeader && (
              <>
                <button type="button" onClick={() => setSelectedTeamForAddMember(team)} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700">
                  <UserPlus className="mr-1 inline h-3.5 w-3.5"/>Invite
                </button>
                <button type="button" onClick={() => setTeamToDelete(team)} title="Delete team" aria-label="Delete team" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4"/>
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 pb-1 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Team hub</span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>
            <span className="text-xs font-medium text-slate-500">Participant workspace</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 max-md:text-2xl">My Teams</h1>
          <p className="max-w-2xl text-sm text-slate-500">Manage your teams and collaborate across campus competitions, hackathons, and group challenges.</p>
        </div>
        <button type="button" onClick={onCreateTeamClick} className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
          <Plus className="h-[18px] w-[18px]"/>Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total teams</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{teams.length.toString().padStart(2,"0")}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-700"><Users className="h-5 w-5"/></span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Teams led</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{leaderCount.toString().padStart(2,"0")}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Shield className="h-5 w-5"/></span>
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl bg-white p-2 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          {[
            ["ALL","All",teams.length],
            ["LEADER","Led by me",leaderCount],
            ["MEMBER","Member",teams.length - leaderCount]
          ].map(([value,label,count]) => (
            <button key={value} type="button" onClick={() => setRoleFilter(value)} aria-pressed={roleFilter === value} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${roleFilter === value ? "bg-indigo-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <span>{label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${roleFilter === value ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="relative min-w-0 flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search teams by name, member, or ID..." aria-label="Search teams" className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500"/>
          </div>
          <div className="hidden items-center rounded-lg bg-slate-100 p-1 sm:flex">
            <button type="button" onClick={() => setViewMode("TABLE")} aria-pressed={viewMode === "TABLE"} title="Table view" className={`rounded-md p-1.5 ${viewMode === "TABLE" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}><List className="h-[18px] w-[18px]"/></button>
            <button type="button" onClick={() => setViewMode("CARDS")} aria-pressed={viewMode === "CARDS"} title="Grid view" className={`rounded-md p-1.5 ${viewMode === "CARDS" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}><LayoutGrid className="h-[18px] w-[18px]"/></button>
          </div>
        </div>
      </div>

      {deleteError && <div role="alert" className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><span>{deleteError}</span><button type="button" onClick={() => setDeleteError("")} className="font-bold">Dismiss</button></div>}

      {filteredTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><Users className="h-8 w-8"/></span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{teams.length === 0 ? "No Teams Formed Yet" : "No teams match your search"}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{teams.length === 0 ? "Create a team to participate in group competitions, hackathons, and collaborative campus challenges with fellow students." : "Try a different search or choose another team filter."}</p>
          {teams.length === 0 ? (
            <button type="button" onClick={onCreateTeamClick} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4"/>Create Your First Team</button>
          ) : (
            <button type="button" onClick={() => {setSearchQuery("");setRoleFilter("ALL");}} className="mt-5 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Clear filters</button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "TABLE" ? (
            <div className="hidden w-full overflow-hidden rounded-xl bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead><tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600"><th className="px-6 py-3.5">Team</th><th className="px-6 py-3.5">Your role</th><th className="px-6 py-3.5">Members</th><th className="px-6 py-3.5">Created</th><th className="px-6 py-3.5 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeams.map(team => {
                      const isLeader = getIsLeader(team);
                      const members = getNormalizedMembers(team);
                      const leaderMember = members.find(member => member.leader || member.userId === team.leaderId);
                      return (
                        <tr key={team.id} onClick={() => setSelectedTeamForDetails(team)} className="cursor-pointer transition-colors hover:bg-slate-50/60">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-base font-bold uppercase text-indigo-700">{(team.name || "T").charAt(0)}</span>
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-slate-900">{team.name}</p>
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="max-w-40 truncate font-mono">ID: {team.id}</span>
                                  <button type="button" onClick={event => handleCopyId(team.id,event)} className="text-slate-400 hover:text-indigo-600" title="Copy Team ID">{copiedId === team.id ? <Check className="h-3.5 w-3.5 text-emerald-600"/> : <Copy className="h-3.5 w-3.5"/>}</button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isLeader ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{isLeader ? <Shield className="h-3.5 w-3.5"/> : <User className="h-3.5 w-3.5"/>}{isLeader ? "Leader" : "Member"}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex -space-x-1.5">{members.slice(0,3).map((member,index) => <span key={member.userId || index} title={member.name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-700">{(member.name || "P").charAt(0).toUpperCase()}</span>)}</div>
                              <div className="min-w-0"><p className="text-xs font-semibold text-slate-900">{members.length} {members.length === 1 ? "member" : "members"}</p><p className="max-w-40 truncate text-[11px] text-slate-500">{leaderMember?.name || ""}{members.length > 1 ? ` +${members.length - 1} more` : ""}</p></div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><p className="text-xs font-medium text-slate-800">{createdDate(team.createdAt)}</p>{team.createdAt && <p className="mt-0.5 text-[11px] text-slate-500">{new Date(team.createdAt).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}</p>}</td>
                          <td className="px-6 py-4 text-right" onClick={event => event.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => setSelectedTeamForDetails(team)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"><Eye className="h-4 w-4"/>Members</button>
                              {isLeader && <button type="button" onClick={() => setSelectedTeamForAddMember(team)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-200"><UserPlus className="h-4 w-4"/>Invite</button>}
                              {isLeader && <button type="button" onClick={() => setTeamToDelete(team)} aria-label="Delete team" title="Delete team" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-[18px] w-[18px]"/></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${viewMode === "CARDS" ? "md:grid" : "md:hidden"}`}>
            {filteredTeams.map(renderTeamCard)}
          </div>
        </>
      )}
    </div>
  );

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
