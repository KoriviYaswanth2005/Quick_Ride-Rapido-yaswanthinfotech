
(function () {
    'use strict';

    const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
    const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
    const ROAD_FACTOR = 1.3;
    const cache = new Map();

    const round1 = (n) => Math.round(n * 10) / 10;

    function haversine(a, b) {
        const R = 6371;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(h));
    }

    async function getJSON(url, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
        try {
            const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } finally {
            clearTimeout(timer);
        }
    }
    function shortName(display) {
        const parts = String(display || '').split(',').map((p) => p.trim()).filter(Boolean);
        return parts.slice(0, 2).join(', ');
    }

    async function search(query, limit) {
        const q = String(query || '').trim();
        if (q.length < 3) return [];
        const key = 'q:' + q.toLowerCase() + ':' + (limit || 5);
        if (cache.has(key)) return cache.get(key);
        const url = NOMINATIM + '?format=jsonv2&countrycodes=in&limit=' + (limit || 5) +
            '&q=' + encodeURIComponent(q);
        const data = await getJSON(url, 8000);
        const list = (Array.isArray(data) ? data : []).map((d) => ({
            name: shortName(d.display_name),
            full: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon)
        })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        cache.set(key, list);
        return list;
    }
    async function roadDistance(a, b) {
        const key = 'r:' + a.lat.toFixed(5) + ',' + a.lng.toFixed(5) + '|' + b.lat.toFixed(5) + ',' + b.lng.toFixed(5);
        if (cache.has(key)) return cache.get(key);
        let result;
        try {
            const url = OSRM + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=false';
            const data = await getJSON(url, 10000);
            const route = data && data.routes && data.routes[0];
            if (data.code !== 'Ok' || !route) throw new Error(data.code || 'no route');
            result = { km: Math.max(1, round1(route.distance / 1000)), minutes: Math.round(route.duration / 60), source: 'road' };
        } catch (err) {
            result = { km: Math.max(1, round1(haversine(a, b) * ROAD_FACTOR)), minutes: null, source: 'estimate' };
        }
        cache.set(key, result);
        return result;
    }

    window.RideRoute = { search, roadDistance, haversine, ROAD_FACTOR };
})();
