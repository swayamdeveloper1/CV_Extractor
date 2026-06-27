import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Candidate } from "../types";

interface Props {
  candidates: Candidate[];
  loading: boolean;
}

type SortKey = keyof Candidate;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "fileName", label: "File" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "designation", label: "Designation" },
  { key: "employer", label: "Employer" },
  { key: "workingSince", label: "Since" },
  { key: "totalExperience", label: "Experience" },
  { key: "dateOfBirth", label: "DOB" },
  { key: "location", label: "Location" },
  { key: "address", label: "Address" },
  { key: "qualification", label: "Qualification" },
];

const PAGE_SIZE = 10;

function Badge({ value, className }: { value: string; className?: string }) {
  if (!value)
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-not-found)] text-[var(--color-muted)]">
        Not found
      </span>
    );
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${className || ""}`}
    >
      {value}
    </span>
  );
}

export const CandidatesTable: React.FC<Props> = ({ candidates, loading }) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase();
    return candidates.filter((c) =>
      Object.values(c).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [candidates, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] || "").toLowerCase();
      const bv = (b[sortKey] || "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[18px] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--color-border)] flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-semibold text-[var(--color-text)]">Candidates</h2>
          <span className="px-2.5 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-semibold rounded-full border border-[var(--color-primary-border)]">
            {candidates.length}
          </span>
        </div>

        <div className="relative w-[250px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search any field..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] rounded-[10px] text-sm outline-none bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[var(--focus-ring-primary)] focus:scale-[1.02] transition-all duration-150"
          />
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 && !loading ? (
        <div className="text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--color-black-003)] mb-4">
            <Search size={24} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-base font-semibold text-[var(--color-text-secondary)] mb-1">
            {search ? "No results match your search." : "No candidates yet"}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {search
              ? "Try a different search term."
              : "Upload resumes to get started."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-table-header)]">
                  <th className="sticky top-0 px-3 py-3.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider w-10 bg-[var(--color-table-header)]">
                    #
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="sticky top-0 px-3 py-3.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors select-none whitespace-nowrap bg-[var(--color-table-header)]"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.key === sortKey ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={13} className="text-[var(--color-primary)]" />
                          ) : (
                            <ChevronDown size={13} className="text-[var(--color-primary)]" />
                          )
                        ) : (
                          <ChevronsUpDown size={13} className="text-[var(--color-sort-icon)]" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody key={currentPage}>
                {paginated.map((c, idx) => (
                  <motion.tr
                    key={(currentPage - 1) * PAGE_SIZE + idx}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: idx * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="border-b border-[var(--color-border-light)] last:border-none hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <td className="px-3 py-3 text-xs text-[var(--color-muted)] w-10">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                      <td
                        className="px-3 py-3 text-sm text-[var(--color-text)] max-w-[160px] truncate"
                        title={c.fileName}
                      >
                        {c.fileName}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-[var(--color-text)]">
                        {c.name || (
                          <span className="text-[var(--color-muted)] font-normal">
                            Not found
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[var(--color-primary)]">
                        {c.email || (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[var(--color-text-secondary)]">
                        {c.phone || (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.designation ? (
                          <Badge
                            value={c.designation}
                            className="bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary-border)]"
                          />
                        ) : (
                          <span className="text-[var(--color-muted)] text-xs">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[var(--color-text-secondary)] max-w-[140px] truncate">
                        {c.employer || (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[var(--color-text-secondary)]">
                        {c.workingSince || (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.totalExperience ? (
                          <Badge
                            value={c.totalExperience}
                            className="bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-border)]"
                          />
                        ) : (
                          <span className="text-[var(--color-muted)] text-xs">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[var(--color-text-secondary)]">
                        {c.dateOfBirth && c.dateOfBirth !== "Not Found" ? (
                          c.dateOfBirth
                        ) : (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.location ? (
                          <Badge
                            value={c.location}
                            className="bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary-border)]"
                          />
                        ) : (
                          <span className="text-[var(--color-muted)] text-xs">Not found</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-sm text-[var(--color-text-secondary)] max-w-[180px] truncate"
                        title={c.address}
                      >
                        {c.address || (
                          <span className="text-[var(--color-muted)]">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.qualification ? (
                          <Badge
                            value={c.qualification}
                            className="bg-[var(--color-amber-light)] text-[var(--color-amber-text)] border-[var(--color-amber-border)]"
                          />
                        ) : (
                          <span className="text-[var(--color-muted)] text-xs">Not found</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-[var(--color-border)]">
              <motion.button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                whileHover={currentPage <= 1 ? {} : { scale: 1.02 }}
                whileTap={currentPage <= 1 ? {} : { scale: 0.98 }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-[10px] text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                &larr; Prev
              </motion.button>
              <span className="text-sm text-[var(--color-muted)] min-w-[120px] text-center">
                Page{" "}
                <strong className="text-[var(--color-text-secondary)] font-semibold">
                  {currentPage}
                </strong>{" "}
                of {totalPages}
              </span>
              <motion.button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                whileHover={currentPage >= totalPages ? {} : { scale: 1.02 }}
                whileTap={currentPage >= totalPages ? {} : { scale: 0.98 }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-[10px] text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Next &rarr;
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
