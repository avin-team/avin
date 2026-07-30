import { ArrowUpDown, Search, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

export type SortByOption = "newest" | "price_asc" | "price_desc";

export interface ListingSearchBarProps {
  initialSearch?: string;
  onSearchChange: (search: string) => void;
  onSortChange: (sortBy: SortByOption) => void;
  placeholder?: string;
  sortBy: SortByOption;
}

export const ListingSearchBar = ({
  initialSearch = "",
  onSearchChange,
  onSortChange,
  placeholder = "Search listings by keyword...",
  sortBy,
}: ListingSearchBarProps) => {
  const [term, setTerm] = useState(initialSearch);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchChange(term);
  };

  const handleClear = () => {
    setTerm("");
    onSearchChange("");
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form className="relative flex-1" onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-background/80 py-2.5 pr-9 pl-10 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => setTerm(e.target.value)}
            placeholder={placeholder}
            type="text"
            value={term}
          />
          {term ? (
            <button
              className="absolute right-3.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleClear}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <ArrowUpDown className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            aria-label="Sort listings"
            className="rounded-xl border border-border bg-background/80 py-2.5 pr-8 pl-9 text-sm font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            onChange={(e) => onSortChange(e.target.value as SortByOption)}
            value={sortBy}
          >
            <option value="newest">Sort by: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};
