import React, { useMemo } from "react";
import { Plus, Trash2, Award, Layers, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { getRecommendedRubric } from "../utils/recommendedRubrics";

export default function JudgingRoundConfigSection({
  config,
  onChange,
  activityType = "",
  disabled = false,
}) {
  const isEnabled = config?.enabled === true;
  const mode = config?.mode || "SINGLE_STAGE";
  const rounds = config?.rounds || [];

  // Default recommended criteria based on activity type
  const recommendedCriteria = useMemo(() => {
    const list = getRecommendedRubric(activityType);
    return list.map((item) => ({
      name: item.name,
      description: item.description || "",
      maxScore: String(item.maxScore || 10),
      weight: String(item.weight || 25),
    }));
  }, [activityType]);

  const handleToggleEnabled = (checked) => {
    if (checked && rounds.length === 0) {
      // Initialize with 1 default round populated with recommended criteria
      onChange({
        enabled: true,
        mode: "SINGLE_STAGE",
        rounds: [
          {
            name: "Final Evaluation",
            description: "Judge evaluation round",
            criteria: [...recommendedCriteria],
          },
        ],
      });
    } else {
      onChange({
        ...config,
        enabled: checked,
      });
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === "SINGLE_STAGE") {
      const firstRound = rounds[0] || {
        name: "Final Evaluation",
        description: "Judge evaluation round",
        criteria: [...recommendedCriteria],
      };
      onChange({
        ...config,
        mode: "SINGLE_STAGE",
        rounds: [firstRound],
      });
    } else {
      let updatedRounds = [...rounds];
      if (updatedRounds.length < 2) {
        updatedRounds = [
          updatedRounds[0] || {
            name: "Round 1 - Preliminary",
            description: "Initial screening round",
            criteria: [...recommendedCriteria],
          },
          {
            name: "Round 2 - Finals",
            description: "Final evaluation round",
            criteria: [...recommendedCriteria],
          },
        ];
      }
      onChange({
        ...config,
        mode: "MULTI_ROUND",
        rounds: updatedRounds,
      });
    }
  };

  const handleUpdateRound = (index, updatedRound) => {
    const newRounds = [...rounds];
    newRounds[index] = updatedRound;
    onChange({
      ...config,
      rounds: newRounds,
    });
  };

  const handleAddRound = () => {
    const nextSeq = rounds.length + 1;
    const newRound = {
      name: `Round ${nextSeq}`,
      description: `Evaluation round ${nextSeq}`,
      criteria: [...recommendedCriteria],
    };
    onChange({
      ...config,
      rounds: [...rounds, newRound],
    });
  };

  const handleRemoveRound = (index) => {
    if (rounds.length <= 1) return;
    const newRounds = rounds.filter((_, i) => i !== index);
    onChange({
      ...config,
      rounds: newRounds,
    });
  };

  const handleAddCriterion = (roundIndex) => {
    const round = rounds[roundIndex];
    const newCriteria = [
      ...(round.criteria || []),
      { name: "", description: "", maxScore: "10", weight: "20" },
    ];
    handleUpdateRound(roundIndex, { ...round, criteria: newCriteria });
  };

  const handleUpdateCriterion = (roundIndex, critIndex, field, value) => {
    const round = rounds[roundIndex];
    const newCriteria = [...(round.criteria || [])];
    newCriteria[critIndex] = { ...newCriteria[critIndex], [field]: value };
    handleUpdateRound(roundIndex, { ...round, criteria: newCriteria });
  };

  const handleRemoveCriterion = (roundIndex, critIndex) => {
    const round = rounds[roundIndex];
    const newCriteria = (round.criteria || []).filter((_, i) => i !== critIndex);
    handleUpdateRound(roundIndex, { ...round, criteria: newCriteria });
  };

  const handleResetToRecommended = (roundIndex) => {
    const round = rounds[roundIndex];
    handleUpdateRound(roundIndex, { ...round, criteria: [...recommendedCriteria] });
  };

  return (
    <div className="space-y-4">
      {/* Enable Judging Toggle Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg p-2 ${isEnabled ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
              <Award className="h-5 w-5" />
            </div>
            <div>
              <label htmlFor="enable-judging-checkbox" className="text-sm font-bold text-slate-900 cursor-pointer">
                Enable Judging & Scoring
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                Turn on judge assignments, scoring rubrics, and automated leaderboards for this activity.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="enable-judging-checkbox"
              type="checkbox"
              checked={isEnabled}
              disabled={disabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* When judging is enabled, show mode and rounds */}
      {isEnabled && (
        <div className="space-y-4">
          {/* Competition Mode Selection */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Judging Structure
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                  mode === "SINGLE_STAGE"
                    ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-300"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="judgingMode"
                  value="SINGLE_STAGE"
                  checked={mode === "SINGLE_STAGE"}
                  onChange={() => handleModeChange("SINGLE_STAGE")}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900">Single Round</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    One round of evaluation (e.g., standard competition or final presentation).
                  </span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                  mode === "MULTI_ROUND"
                    ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-300"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="judgingMode"
                  value="MULTI_ROUND"
                  checked={mode === "MULTI_ROUND"}
                  onChange={() => handleModeChange("MULTI_ROUND")}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900">Multiple Rounds</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    Multi-stage judging (e.g., Round 1 Screening, Round 2 Finals).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Rounds List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Configured Judging Rounds ({rounds.length})
              </h4>
              {mode === "MULTI_ROUND" && (
                <button
                  type="button"
                  onClick={handleAddRound}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Round
                </button>
              )}
            </div>

            {rounds.map((round, rIndex) => {
              const criteria = round.criteria || [];
              const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
              const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

              return (
                <div key={rIndex} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  {/* Round Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shrink-0">
                        Round {rIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={round.name || ""}
                        onChange={(e) => handleUpdateRound(rIndex, { ...round, name: e.target.value })}
                        placeholder={`e.g. ${mode === "SINGLE_STAGE" ? "Final Evaluation" : `Round ${rIndex + 1}`}`}
                        disabled={disabled}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    {mode === "MULTI_ROUND" && rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRound(rIndex)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 self-end sm:self-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Round
                      </button>
                    )}
                  </div>

                  {/* Criteria Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">Scoring Criteria & Rubric</span>
                        <button
                          type="button"
                          onClick={() => handleResetToRecommended(rIndex)}
                          title="Auto-fill with recommended criteria for this activity type"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <Sparkles className="h-3 w-3" />
                          Default Rubric
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500">Total Weight:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            isWeightValid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {totalWeight}% {isWeightValid ? "✓" : `(need 100%)`}
                        </span>
                      </div>
                    </div>

                    {/* Criteria List */}
                    <div className="space-y-2">
                      {criteria.map((crit, cIndex) => (
                        <div
                          key={cIndex}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              value={crit.name}
                              onChange={(e) => handleUpdateCriterion(rIndex, cIndex, "name", e.target.value)}
                              placeholder="Criterion name (e.g. Technical Execution)"
                              disabled={disabled}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Max:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={crit.maxScore}
                                onChange={(e) => handleUpdateCriterion(rIndex, cIndex, "maxScore", e.target.value)}
                                className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-center text-xs focus:border-indigo-600 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400">pts</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Weight:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={crit.weight}
                                onChange={(e) => handleUpdateCriterion(rIndex, cIndex, "weight", e.target.value)}
                                className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-center text-xs focus:border-indigo-600 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(rIndex, cIndex)}
                              disabled={criteria.length <= 1 || disabled}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                              title="Delete criterion"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Criterion Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddCriterion(rIndex)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Criterion
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

