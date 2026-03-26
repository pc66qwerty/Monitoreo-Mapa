<script setup>
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { buildMarkerHtml, getTipo } from '@/data/tiposEvento';

// Límites geográficos de Guatemala
const GT_BOUNDS = L.latLngBounds([13.74, -92.30], [17.82, -88.15]);
const GT_CENTER = [15.30, -90.25];

const props = defineProps({
    bloqueos: { type: Array, required: true },
    pickMode: { type: Boolean, default: false },
});

const emit = defineEmits(['coords-selected']);

const mapContainer = ref(null);
let map = null;
let markerLayer = null;
let tempMarker = null;

const drawMarkers = () => {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    props.bloqueos.forEach(bloqueo => {
        if (!bloqueo.latitud || !bloqueo.longitud) return;
        const isActivo = bloqueo.estado === 'Activo';
        const tipo = getTipo(bloqueo.tipo_evento);
        const marker = L.marker([bloqueo.latitud, bloqueo.longitud], {
            icon: L.divIcon({
                className: '',
                html: buildMarkerHtml(bloqueo.tipo_evento, isActivo),
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            }),
        });
        marker.bindPopup(`
            <div style="min-width:185px;font-family:sans-serif;">
                <div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:8px;">
                    <div style="width:28px;height:28px;background:${isActivo ? tipo.color : '#6b7280'};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${tipo.iconPath}</svg>
                    </div>
                    <div>
                        <div style="font-weight:800;font-size:13px;text-transform:uppercase;">${bloqueo.tipo_evento}</div>
                        <span style="font-size:11px;font-weight:700;color:${isActivo ? tipo.color : '#6b7280'};">${bloqueo.estado}</span>
                    </div>
                </div>
                <p style="margin:0 0 4px;font-size:12px;"><b>Ubicación:</b> ${bloqueo.municipio}, ${bloqueo.departamento}</p>
                <p style="margin:0 0 4px;font-size:12px;"><b>Referencia:</b> ${bloqueo.direccion}</p>
                ${bloqueo.manifestantes_aproximados ? `<p style="margin:6px 0 0;font-size:11px;background:#f3f4f6;padding:4px 6px;border-radius:4px;">Aprox. ${bloqueo.manifestantes_aproximados} personas</p>` : ''}
            </div>
        `);
        markerLayer.addLayer(marker);
    });
};

const focusOn = (lat, lng) => {
    if (map) {
        map.setView([lat, lng], 14);
    }
};

const clearTempMarker = () => {
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
};

defineExpose({ focusOn, clearTempMarker });

onMounted(() => {
    map = L.map(mapContainer.value, {
        maxBounds: GT_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 6,
    }).setView(GT_CENTER, 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);
    drawMarkers();

    map.on('click', (e) => {
        if (!props.pickMode) return;
        const { lat, lng } = e.latlng;
        clearTempMarker();
        tempMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            })
        }).addTo(map);
        emit('coords-selected', {
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
        });
    });
});

onUnmounted(() => {
    if (map) map.remove();
});

watch(() => props.bloqueos, drawMarkers, { deep: true });

watch(() => props.pickMode, () => {
    if (map) nextTick(() => map.invalidateSize());
});
</script>

<template>
    <div class="relative">
        <!-- Banner: v-show para no mover el DOM y no afectar a Leaflet -->
        <div
            v-show="pickMode"
            class="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap"
        >
            📍 Haz clic en el mapa para seleccionar la ubicación
        </div>

        <!-- Wrapper con borde reactivo — NO es el contenedor de Leaflet -->
        <div
            class="rounded-xl overflow-hidden border-4 shadow-xl transition-colors"
            :class="pickMode ? 'border-blue-400' : 'border-white'"
        >
            <!-- Este div SOLO lo toca Leaflet; sin clases reactivas -->
            <div
                ref="mapContainer"
                :style="{ height: '620px', cursor: pickMode ? 'crosshair' : 'grab' }"
            ></div>
        </div>

        <!-- Leyenda -->
        <div class="flex gap-4 mt-2 px-1">
            <span class="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <span class="w-3 h-3 rounded-full bg-red-500 border border-white shadow"></span> Activos
            </span>
            <span class="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <span class="w-3 h-3 rounded-full bg-green-500 border border-white shadow"></span> Finalizados
            </span>
            <span class="ml-auto text-xs text-gray-400 font-medium">{{ bloqueos.length }} evento(s)</span>
        </div>
    </div>
</template>

<style>
.leaflet-top, .leaflet-bottom { z-index: 400 !important; }
.leaflet-popup-content-wrapper {
    border-radius: 0.5rem !important;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05) !important;
}
.leaflet-popup-content { margin: 12px !important; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
