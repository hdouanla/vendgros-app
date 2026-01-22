"use client";

import { SearchFilters } from "~/components/search";

export function SearchBox() {
  return (
    <section className="relative z-10 -mt-22 md:-mt-12">
      <div className="mx-auto px-4 max-w-content">
        <SearchFilters redirectOnSearch={true} compact={true} />
      </div>
    </section>
  );
}
