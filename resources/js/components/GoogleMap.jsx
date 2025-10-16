import React, { useEffect, useRef, useState } from 'react';

// Global flag to prevent multiple script loads
let isGoogleMapsLoading = false;
let isGoogleMapsLoaded = false;

const GoogleMap = ({
  width = '100%',
  height = '400px',
  lat = 14.247142,
  lng = 121.136673,
  zoom = 17,
  markerTitle = 'Diocesan Shrine of San Vicente Ferrer - Mamatid, Cabuyao, Laguna'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initMap = async () => {
      // Enhanced validation to ensure Google Maps is fully loaded
      if (!window.google || !window.google.maps || !window.google.maps.Map || !mapRef.current) {
        console.warn('Google Maps API not fully loaded yet');
        // Retry after a short delay
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.Map && mapRef.current) {
            initMap();
          } else {
            setError('Google Maps API failed to load');
            setIsLoading(false);
          }
        }, 500);
        return;
      }

      // Wait for the marker library to be available
      if (!window.google.maps.marker) {
        console.warn('Google Maps marker library not loaded, using fallback');
      }

      const churchLocation = { lat: 14.23502, lng: 121.15816 };

      try {
        // Check if Advanced Markers are available
        const useAdvancedMarkers = window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement;
        
        const mapConfig = {
          zoom,
          center: churchLocation,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true
        };

        // Only add mapId if we're using Advanced Markers, otherwise use styles
        if (useAdvancedMarkers) {
          mapConfig.mapId = 'DEMO_MAP_ID'; // Required for Advanced Markers
        } else {
          mapConfig.styles = [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'on' }]
            },
            {
              featureType: 'poi.place_of_worship',
              stylers: [{ visibility: 'on' }]
            },
            {
              featureType: 'road',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ];
        }

        const map = new window.google.maps.Map(mapRef.current, mapConfig);

        mapInstanceRef.current = map;
        setIsLoading(false);
        setError(null);

      // Add pulsing and jumping animation CSS to the document
      if (!document.getElementById('map-animations')) {
        const style = document.createElement('style');
        style.id = 'map-animations';
        style.textContent = `
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 0.5;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes jump {
            0% {
              transform: translateY(0px);
            }
            25% {
              transform: translateY(-8px);
            }
            50% {
              transform: translateY(-12px);
            }
            75% {
              transform: translateY(-8px);
            }
            100% {
              transform: translateY(0px);
            }
          }
          .pulsing-marker {
            animation: pulse 2s infinite;
          }
          .jumping-marker {
            animation: jump 1.5s infinite ease-in-out;
          }
        `;
        document.head.appendChild(style);
      }

      // Create a pulsing circle background for extra visibility using Circle instead of deprecated Marker
      const pulsingCircle = new window.google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        map: map,
        center: churchLocation,
        radius: 50 // 50 meters radius
      });

      // Create a custom HTML marker with jumping animation
      const markerElement = document.createElement('div');
      markerElement.className = 'jumping-marker';
      markerElement.innerHTML = `
        <svg width="60" height="80" viewBox="0 0 24 32" style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                fill="#FF0000" 
                stroke="#FFFFFF" 
                stroke-width="1.5"/>
        </svg>
      `;
      markerElement.style.position = 'absolute';
      markerElement.style.transform = 'translate(-50%, -100%)';
      markerElement.style.cursor = 'pointer';
      markerElement.style.zIndex = '2';

      // Create the marker using AdvancedMarkerElement if available, otherwise fallback to regular marker
      let marker;
      if (useAdvancedMarkers) {
        try {
          marker = new window.google.maps.marker.AdvancedMarkerElement({
            position: churchLocation,
            map: map,
            title: markerTitle,
            content: markerElement
          });
        } catch (error) {
          console.warn('Failed to create AdvancedMarkerElement, falling back to regular Marker:', error);
          marker = createFallbackMarker();
        }
      } else {
        marker = createFallbackMarker();
      }

      function createFallbackMarker() {
        return new window.google.maps.Marker({
          position: churchLocation,
          map: map,
          title: markerTitle,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#FF0000',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
            scale: 2.5,
            anchor: new window.google.maps.Point(12, 22)
          },
          zIndex: 2
        });
      }

      // Add smooth zoom-in animation
      let currentZoom = 10; // Start from a lower zoom level
      const targetZoom = zoom;
      const zoomStep = 0.5;
      
      // Set initial zoom
      map.setZoom(currentZoom);
      
      // Animate zoom-in
      const zoomInterval = setInterval(() => {
        if (currentZoom < targetZoom) {
          currentZoom += zoomStep;
          map.setZoom(Math.min(currentZoom, targetZoom));
        } else {
          clearInterval(zoomInterval);
          // After zoom animation completes, add subtle pulsing to the background circle
          animatePulsingCircle();
        }
      }, 200); // Zoom step every 200ms for smooth animation

      // Function to animate the pulsing circle
      const animatePulsingCircle = () => {
        let radius = 50;
        let growing = true;
        
        setInterval(() => {
          if (growing) {
            radius += 5;
            if (radius >= 80) growing = false;
          } else {
            radius -= 5;
            if (radius <= 50) growing = true;
          }
          
          pulsingCircle.setRadius(radius);
        }, 300); // Pulse every 300ms
      };

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 15px; font-family: Arial, sans-serif; max-width: 300px;">
            <h3 style="margin: 0 0 10px 0; color: #CD8B3E; font-size: 18px; font-weight: bold;">
              Diocesan Shrine of San Vicente Ferrer
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #333; font-weight: 500;">
              📍 Brgy. Mamatid, City of Cabuyao, Laguna
            </p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
              📞 Contact: 09123456789
            </p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
              ✉️ Email: sanvicenteferrer@gmail.com
            </p>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888; font-style: italic;">
                Exact Location: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E
              </p>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      } catch (error) {
        console.error('Error creating Google Map:', error);
        setError('Failed to initialize map');
        setIsLoading(false);
        return;
      }
    };

    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (isGoogleMapsLoaded && window.google && window.google.maps) {
          resolve();
          return;
        }

        // Check if already loading
        if (isGoogleMapsLoading) {
          // Wait for the existing load to complete
          const checkLoaded = setInterval(() => {
            if (isGoogleMapsLoaded && window.google && window.google.maps) {
              clearInterval(checkLoaded);
              resolve();
            }
          }, 100);
          return;
        }

        // Prevent multiple loads
        isGoogleMapsLoading = true;

        // Remove any existing scripts to prevent conflicts
        const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        existingScripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });

        const script = document.createElement('script');
        // Get API key from environment or use fallback
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB7WohoejX6VDTzttyuTd0nnyZbV1XdgC8';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          // Wait a bit more for the API to be fully ready
          const checkReady = () => {
            if (window.google && window.google.maps && window.google.maps.Map) {
              isGoogleMapsLoaded = true;
              isGoogleMapsLoading = false;
              resolve();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        };

        script.onerror = () => {
          isGoogleMapsLoading = false;
          reject(new Error('Failed to load Google Maps API'));
        };

        document.head.appendChild(script);
      });
    };

    // Load Google Maps and then initialize
    loadGoogleMaps()
      .then(() => {
        initMap();
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setError('Failed to load Google Maps API');
        setIsLoading(false);
      });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom, markerTitle]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: '12px',
          border: '3px solid #CD8B3E',
          boxShadow: '0 4px 16px rgba(205, 139, 62, 0.15), 0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          color: '#dc3545',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div>
          <div style={{ marginBottom: '10px', fontSize: '18px' }}>⚠️</div>
          <div>Error loading map: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius: '12px',
        border: '3px solid #CD8B3E',
        boxShadow: '0 4px 16px rgba(205, 139, 62, 0.15), 0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1000,
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#CD8B3E'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '10px', fontSize: '24px' }}>🗺️</div>
            <div>Loading Google Maps...</div>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};

export default GoogleMap;
