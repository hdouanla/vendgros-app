"use client";

import { SearchFilters } from "~/components/search";

export function SearchBox() {
  return (
    <section className="relative z-10 -mt-12 px-4">
      <div className="mx-auto max-w-content">
        <SearchFilters redirectOnSearch={true} compact={true} />
      </div>
    </section>
  );
}
