"use client";

import { useCallback, useEffect, useState } from "react";

const COOKIE_NAME = "last_visited_listings";
const MAX_ITEMS = 10;
const MAX_AGE_DAYS = 30;

/**
 * Hook to manage last visited listings stored in a cookie
 */
export function useLastVisited() {
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from cookie on mount
  useEffect(() => {
    const loadFromCookie = () => {
      try {
        const cookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${COOKIE_NAME}=`));

        if (cookie) {
          const value = cookie.split("=")[1];
          if (value) {
            const decoded = decodeURIComponent(value);
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed)) {
              setVisitedIds(parsed.slice(0, MAX_ITEMS));
            }
          }
        }
      } catch (error) {
        console.error("Error parsing last visited cookie:", error);
        setVisitedIds([]);
      }
      setIsLoaded(true);
    };

    loadFromCookie();
  }, []);

  // Save to cookie
  const saveToCookie = useCallback((ids: string[]) => {
    try {
      const maxAge = MAX_AGE_DAYS * 24 * 60 * 60; // 30 days in seconds
      const value = encodeURIComponent(JSON.stringify(ids));
      document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
    } catch (error) {
      console.error("Error saving last visited cookie:", error);
    }
  }, []);

  // Add a listing to visited list
  const addVisited = useCallback(
    (listingId: string) => {
      setVisitedIds((prev) => {
        // Remove if already exists (to move to front)
        const filtered = prev.filter((id) => id !== listingId);
        // Add to front and limit to MAX_ITEMS
        const newIds = [listingId, ...filtered].slice(0, MAX_ITEMS);
        saveToCookie(newIds);
        return newIds;
      });
    },
    [saveToCookie]
  );

  // Remove a listing from visited list
  const removeVisited = useCallback(
    (listingId: string) => {
      setVisitedIds((prev) => {
        const newIds = prev.filter((id) => id !== listingId);
        saveToCookie(newIds);
        return newIds;
      });
    },
    [saveToCookie]
  );

  // Clear all visited listings
  const clearVisited = useCallback(() => {
    setVisitedIds([]);
    // Delete cookie by setting max-age to 0
    document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
  }, []);

  return {
    visitedIds,
    isLoaded,
    addVisited,
    removeVisited,
    clearVisited,
  };
}

/**
 * Get last visited listing IDs from cookie (server-side compatible)
 */
export function getLastVisitedFromCookie(cookieString: string): string[] {
  try {
    const cookie = cookieString
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));

    if (cookie) {
      const value = cookie.split("=")[1];
      if (value) {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_ITEMS);
        }
      }
    }
  } catch (error) {
    console.error("Error parsing last visited cookie:", error);
  }
  return [];
}
