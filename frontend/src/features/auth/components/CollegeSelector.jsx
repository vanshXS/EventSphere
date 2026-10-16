import React, { useEffect, useState, useRef, useCallback } from "react";
import { searchColleges } from "../authApi";
import { Search, Loader2, CheckCircle2, X, AlertCircle, RefreshCw, Building, Plus, Info } from "lucide-react";
import AddCollegeModal from "./AddCollegeModal";

export default function CollegeSelector({
  onSelect,
  selected,
  value,
  error,
  disabled = false,
  required = false,
  allowAdd = true,
  noResultsMessage,
  id = "college-selector",
  label = "College"
}) {
  const [searchText, setSearchText] = useState("");
  const [colleges, setColleges] = useState([]);
  const [errorState, setErrorState] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalSelected, setInternalSelected] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);

  // Sync external selected/value prop with state
  useEffect(() => {
    if (selected !== undefined) {
      setInternalSelected(selected);
      if (selected?.name) {
        setSearchText(selected.name);
      }
    } else if (value !== undefined) {
      setInternalSelected(value);
      if (value?.name) {
        setSearchText(value.name);
      }
    }
  }, [selected, value]);

  const activeCollege = selected !== undefined ? selected : (value !== undefined ? value : internalSelected);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Perform college search
  const performSearch = useCallback(async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setColleges([]);
      setShowDropdown(false);
      setErrorState("");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorState("");

      const data = await searchColleges(trimmed);
      const results = Array.isArray(data) ? data : [];
      setColleges(results);
      setShowDropdown(true);
      setHighlightedIndex(results.length > 0 ? 0 : -1);
    } catch (err) {
      console.error("College search error:", err);
      setErrorState("Unable to search colleges. Please try again.");
      setColleges([]);
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger on searchText change
  useEffect(() => {
    // If a college is already selected and matching the text, do not search
    if (activeCollege && activeCollege.name === searchText) {
      return;
    }

    if (searchText.trim().length < 2) {
      setColleges([]);
      setShowDropdown(false);
      setErrorState("");
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText, activeCollege, performSearch]);

  // Keep highlighted item in view when navigating with arrow keys
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const activeOption = listboxRef.current.children[highlightedIndex];
      if (activeOption) {
        activeOption.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e) => {
    const textVal = e.target.value;
    setSearchText(textVal);
    setInternalSelected(null);
    onSelect(null);
    setHighlightedIndex(-1);
  };

  const handleSelectCollege = (college) => {
    const collegeObj = {
      id: college.id || college._id || String(Date.now()),
      name: college.name,
      code: college.code
    };
    setInternalSelected(collegeObj);
    setSearchText(collegeObj.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setErrorState("");
    onSelect(collegeObj);
  };

  const handleClearSelection = () => {
    setInternalSelected(null);
    setSearchText("");
    setColleges([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setErrorState("");
    onSelect(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown && colleges.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex(0);
        return;
      }
      if (colleges.length > 0) {
        setHighlightedIndex((prev) => (prev < colleges.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (colleges.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : colleges.length - 1));
      }
    } else if (e.key === "Enter") {
      if (showDropdown && highlightedIndex >= 0 && highlightedIndex < colleges.length) {
        e.preventDefault();
        handleSelectCollege(colleges[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  const handleOpenAddModal = () => {
    if (!allowAdd) return;
    setShowDropdown(false);
    setIsAddModalOpen(true);
  };

  const handleCollegeCreated = (newCollege) => {
    const collegeObj = {
      id: newCollege.id || newCollege._id || String(Date.now()),
      name: newCollege.name,
      code: newCollege.code
    };
    setColleges((prev) => [collegeObj, ...prev.filter((c) => c.id && c.id !== collegeObj.id && c.code !== collegeObj.code)]);
    handleSelectCollege(collegeObj);
  };

  const displayError = error || errorState;
  const errorId = displayError ? `${id}-error` : undefined;

  return (
    <>
      <div ref={containerRef} className="space-y-1.5 text-left mb-4 relative">
        <div className="flex justify-between items-center">
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
          {activeCollege ? (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Selected
            </span>
          ) : allowAdd ? (
            <button
              type="button"
              onClick={handleOpenAddModal}
              disabled={disabled}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add College
            </button>
          ) : null}
        </div>

        {activeCollege ? (
          // Selected College Display Card
          <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 transition-colors">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <div className="mt-0.5 w-7 h-7 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {activeCollege.name}
                </p>
                <div className="mt-0.5">
                  <span className="inline-block px-2 py-0.5 text-xs font-mono font-medium text-emerald-800 bg-emerald-100/80 rounded border border-emerald-200">
                    {activeCollege.code}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-white px-2.5 py-1.5 rounded-md border border-slate-200 bg-white/80 shadow-xs transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Change
            </button>
          </div>
        ) : (
          // Search Input Mode
          <div className="relative rounded-md shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>

            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={`${id}-listbox`}
              aria-activedescendant={
                highlightedIndex >= 0 && colleges[highlightedIndex]
                  ? `${id}-option-${colleges[highlightedIndex].id || highlightedIndex}`
                  : undefined
              }
              aria-invalid={!!displayError}
              aria-describedby={errorId}
              value={searchText}
              onChange={handleInputChange}
              onFocus={() => {
                if (colleges.length > 0 || (searchText.trim().length >= 2 && (errorState || loading))) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search your college..."
              disabled={disabled}
              autoComplete="off"
              className={`
                block w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm transition-colors duration-150
                placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0
                ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : "bg-white text-slate-900"}
                ${
                  displayError
                    ? "border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }
              `}
            />

            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {loading ? (
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" aria-hidden="true" />
              ) : searchText ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setColleges([]);
                    setShowDropdown(false);
                    onSelect(null);
                    inputRef.current?.focus();
                  }}
                  disabled={disabled}
                  aria-label="Clear college search"
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Dropdown Options / States */}
        {!activeCollege && showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden text-sm">
            {loading && (
              <div className="px-4 py-3 text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" aria-hidden="true" />
                <span>Searching colleges...</span>
              </div>
            )}

            {!loading && errorState && (
              <div className="p-3.5 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <span>{errorState}</span>
                </div>
                <button
                  type="button"
                  onClick={() => performSearch(searchText)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-rose-100/60 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  Retry
                </button>
              </div>
            )}

            {!loading && !errorState && colleges.length === 0 && searchText.trim().length >= 2 && (
              <div className="p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <Building className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-slate-800">No colleges found</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  No matching college found for &ldquo;{searchText}&rdquo;
                </p>

                {allowAdd ? (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Can&apos;t find your college?</span>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Add a new college
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-left bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-lg text-amber-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {noResultsMessage || "Your college isn't registered with EventSphere yet. Please contact your college organizer."}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!loading && !errorState && colleges.length > 0 && (
              <>
                <ul
                  ref={listboxRef}
                  id={`${id}-listbox`}
                  role="listbox"
                  aria-label="College suggestions"
                  className="max-h-60 overflow-y-auto divide-y divide-slate-100 focus:outline-none"
                >
                  {colleges.map((college, index) => {
                    const isHighlighted = highlightedIndex === index;
                    return (
                      <li
                        key={college.id || index}
                        id={`${id}-option-${college.id || index}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => handleSelectCollege(college)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`
                          w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer
                          ${
                            isHighlighted
                              ? "bg-indigo-50/80 text-indigo-900 border-l-2 border-indigo-600"
                              : "hover:bg-slate-50/80 text-slate-800"
                          }
                        `}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug font-medium truncate ${isHighlighted ? "text-indigo-950" : "text-slate-800"}`}>
                            {college.name}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span
                            className={`
                              inline-block px-2 py-0.5 text-xs font-mono font-medium rounded border transition-colors
                              ${
                                isHighlighted
                                  ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }
                            `}
                          >
                            {college.code}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {allowAdd && (
                  <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-3">
                    <span>Don&apos;t see your college?</span>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      Add college
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {displayError && (
          <p id={errorId} className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{displayError}</span>
          </p>
        )}
      </div>

      {/* Add College Dialog (only rendered when allowAdd is true) */}
      {allowAdd && (
        <AddCollegeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCollegeCreated={handleCollegeCreated}
          initialName={searchText}
        />
      )}
    </>
  );
}