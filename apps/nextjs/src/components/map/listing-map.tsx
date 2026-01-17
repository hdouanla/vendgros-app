"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Initialize Mapbox access token
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

interface Listing {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  pricePerPiece: number;
  quantityAvailable: number;
  category: string;
  distance?: number;
}

interface ListingMapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (listingId: string) => void;
  height?: string;
  className?: string;
}

export function ListingMap({
  listings,
  center,
  zoom = 11,
  onMarkerClick,
  height = "400px",
  className = "",
}: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Calculate center from listings if not provided
  const mapCenter = center || calculateCenter(listings);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    // Check if Mapbox token is available
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      setMapError("Mapbox access token not configured");
      return;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: mapCenter,
        zoom: zoom,
        attributionControl: true,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        "top-right"
      );

      // Add geolocation control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right"
      );

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 80,
          unit: "metric",
        }),
        "bottom-right"
      );

      setMapError(null);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Failed to initialize map");
    }
  }, [mapCenter, zoom]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add markers for each listing
    listings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#059669"; // green-600
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "white";
      el.style.fontSize = "16px";
      el.style.fontWeight = "bold";
      el.innerHTML = "📍";

      // Hover effect
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        el.style.zIndex = "1000";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.zIndex = "1";
      });

      // Create popup content
      const popupContent = `
        <div style="padding: 8px; max-width: 250px;">
          <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${listing.title}
          </h3>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
            <span>${listing.category}</span>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #059669; margin-bottom: 4px;">
            $${listing.pricePerPiece.toFixed(2)} / piece
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            ${listing.quantityAvailable} available
            ${listing.distance ? ` • ${listing.distance.toFixed(1)} km away` : ""}
          </div>
          <button
            onclick="window.location.href='/listings/${listing.id}'"
            style="
              width: 100%;
              padding: 6px 12px;
              background-color: #059669;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
            "
          >
            View Details
          </button>
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(popupContent);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Handle marker click
      el.addEventListener("click", () => {
        if (onMarkerClick) {
          onMarkerClick(listing.id);
        }
      });

      markers.current.push(marker);
    });

    // Fit map to show all markers if multiple listings
    if (listings.length > 1 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      listings.forEach((listing) => {
        if (listing.latitude && listing.longitude) {
          bounds.extend([listing.longitude, listing.latitude]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
      });
    }
  }, [listings, onMarkerClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markers.current.forEach((marker) => marker.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  if (mapError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-sm text-gray-600">{mapError}</p>
          <p className="text-xs text-gray-500 mt-2">
            Please configure NEXT_PUBLIC_MAPBOX_TOKEN in .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainer}
        className="rounded-lg overflow-hidden"
        style={{ height }}
      />
      {listings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <p className="text-sm text-gray-600">
            No listings to display
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate center from listings
function calculateCenter(listings: Listing[]): [number, number] {
  if (listings.length === 0) {
    // Default to Toronto if no listings
    return [-79.3832, 43.6532];
  }

  const validListings = listings.filter(
    (l) => l.latitude && l.longitude
  );

  if (validListings.length === 0) {
    return [-79.3832, 43.6532];
  }

  const avgLat =
    validListings.reduce((sum, l) => sum + l.latitude, 0) /
    validListings.length;
  const avgLng =
    validListings.reduce((sum, l) => sum + l.longitude, 0) /
    validListings.length;

  return [avgLng, avgLat];
}
