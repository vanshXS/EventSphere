import React, { useState } from "react";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ChevronRight, 
  FileText,
  UserCheck
} from "lucide-react";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary 
} from "../utils/activityHelpers";
import { formatDateTime } from "../../events/utils/eventHelpers";
import ActivityDetailsModal from "./ActivityDetailsModal";
import ActivityRegistrationsModal from "../../registration/components/ActivityRegistrationsModal";

export default function ActivityCard({ activity, onEdit }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);

  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header: Name and Type Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getActivityTypeBadgeStyle(activity.type)}`}>
                  {getActivityTypeLabel(activity.type)}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {activity.name}
              </h3>
            </div>
          </div>

          {/* Description (brief snippet) */}
          {activity.description && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {activity.description}
            </p>
          )}

          {/* Meta Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
            {/* Schedule */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {formatDateTime(activity.startDateTime)} – {formatDateTime(activity.endDateTime)}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{activity.location || "Venue specified in event"}</span>
            </div>

            {/* Participation & Capacity */}
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium text-slate-700">
                {capacityInfo.typeText} · {capacityInfo.capacityText}
              </span>
            </div>

            {/* Team Size Limit if relevant */}
            {capacityInfo.teamText ? (
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-slate-400 text-xs font-mono">•</span>
                <span className="truncate">{capacityInfo.teamText}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Deadline: {formatDateTime(activity.registrationDeadline)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer: View Details & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowRegistrationsModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Registrations</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
            >
              <span>Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {onEdit && (
              <button 
                type="button" 
                onClick={onEdit} 
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ActivityDetailsModal
        isOpen={showDetailsModal}
        activity={activity}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Registrations Modal */}
      <ActivityRegistrationsModal
        isOpen={showRegistrationsModal}
        activity={activity}
        onClose={() => setShowRegistrationsModal(false)}
      />
    </>
  );
}
