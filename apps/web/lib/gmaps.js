// Loader Google Maps JS API + MarkerClusterer via CDN (tanpa npm dep).
// Jika NEXT_PUBLIC_GOOGLE_MAPS_KEY kosong → caller tampilkan fallback.
let mapsPromise = null;
let clusterPromise = null;

export function loadGoogleMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('GOOGLE_MAPS_KEY kosong'));
  if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve(window.google.maps);
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      s.async = true;
      s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error('Maps gagal dimuat')));
      s.onerror = () => reject(new Error('Maps gagal dimuat'));
      document.head.appendChild(s);
    });
  }
  return mapsPromise;
}

export function loadMarkerClusterer() {
  if (typeof window !== 'undefined' && window.markerClusterer?.MarkerClusterer) {
    return Promise.resolve(window.markerClusterer);
  }
  if (!clusterPromise) {
    clusterPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
      s.async = true;
      s.onload = () => resolve(window.markerClusterer || null);
      s.onerror = () => resolve(null); // fallback: marker biasa
      document.head.appendChild(s);
    });
  }
  return clusterPromise;
}
