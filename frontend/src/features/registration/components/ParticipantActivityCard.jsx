import React from "react";
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck 
} from "lucide-react";
import { formatDateTime } from "../../events/utils/eventHelpers";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded 
} from "../../activities/utils/activityHelpers";

export default function ParticipantActivityCard({
  activity,
  isRegistered,
  onRegisterClick,
  onViewMyRegistrations
}) {
  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getActivityTypeBadgeStyle(activity.activityType || activity.type)}`}>
                {getActivityTypeLabel(activity.activityType || activity.type)}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {activity.registrationType}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{activity.name}</h4>
          </div>

          {isRegistered ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registered
            </span>
          ) : isRegistrationOpen(activity) ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
              Open
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
              {isEnded(activity) ? "Ended" : "Closed"}
            </span>
          )}
        </div>

        {activity.description && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {activity.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Deadline: {formatDateTime(activity.registrationDeadLine || activity.registrationDeadline)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{capacityInfo.typeText} · {capacityInfo.capacityText}</span>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[11px] text-slate-500">
          {activity.rules ? "Rules provided" : "Standard rules apply"}
        </div>

        {isRegistered ? (
          <button
            type="button"
            onClick={onViewMyRegistrations}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>View in My Registrations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onRegisterClick}
            disabled={!isRegistrationOpen(activity)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Register Now</span>
          </button>
        )}
      </div>
    </div>
  );
}
