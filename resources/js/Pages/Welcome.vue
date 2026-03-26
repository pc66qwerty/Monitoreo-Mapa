<script setup>
import { Head, Link } from '@inertiajs/vue3';
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Chart, registerables } from 'chart.js';
import { buildMarkerHtml, getTipo, tiposEvento } from '@/data/tiposEvento';

const GT_BOUNDS = L.latLngBounds([13.74, -92.30], [17.82, -88.15]);
const GT_CENTER = [15.30, -90.25];

Chart.register(...registerables);

defineProps({
    canLogin:    { type: Boolean },
    canRegister: { type: Boolean },
});

// ─── Estado ─────────────────────────────────────────────────────
const mapContainer   = ref(null);
const bloqueos       = ref([]);
const searchQuery    = ref('');
const filterEstado   = ref('Todos');
const chartEstado    = ref(null);
const chartTipo      = ref(null);
const chartDepto     = ref(null);
const selectedBloqueo = ref(null);

let map, markerLayer, pollInterval;
let chartEstadoInstance  = null;
let chartTipoInstance    = null;
let chartDeptoInstance   = null;

// ─── Computed ───────────────────────────────────────────────────
const activos     = computed(() => bloqueos.value.filter(b => b.estado === 'Activo').length);
const finalizados = computed(() => bloqueos.value.filter(b => b.estado === 'Finalizado').length);

const tiposConteo = computed(() => {
    const map = {};
    bloqueos.value.forEach(b => { map[b.tipo_evento] = (map[b.tipo_evento] || 0) + 1; });
    return map;
});

const deptoConteo = computed(() => {
    const map = {};
    bloqueos.value.forEach(b => { map[b.departamento] = (map[b.departamento] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
});

const bloqueosFiltrados = computed(() => {
    return bloqueos.value.filter(b => {
        const matchEstado = filterEstado.value === 'Todos' || b.estado === filterEstado.value;
        const q = searchQuery.value.toLowerCase();
        const matchSearch = !q || b.tipo_evento.toLowerCase().includes(q)
            || b.municipio.toLowerCase().includes(q)
            || b.departamento.toLowerCase().includes(q)
            || b.direccion.toLowerCase().includes(q);
        return matchEstado && matchSearch;
    });
});

// ─── Mapa ───────────────────────────────────────────────────────
const drawMarkers = () => {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    bloqueos.value.forEach(b => {
        if (!b.latitud || !b.longitud) return;
        const isActivo = b.estado === 'Activo';
        const marker = L.marker([b.latitud, b.longitud], {
            icon: L.divIcon({
                className: '',
                html: buildMarkerHtml(b.tipo_evento, isActivo),
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            }),
        });
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectedBloqueo.value = b;
        });
        markerLayer.addLayer(marker);
    });
};

// ─── Gráficas ───────────────────────────────────────────────────
const buildCharts = () => {
    // Doughnut: Estado
    if (chartEstadoInstance) chartEstadoInstance.destroy();
    if (chartEstado.value) {
        chartEstadoInstance = new Chart(chartEstado.value, {
            type: 'doughnut',
            data: {
                labels: ['Activos', 'Finalizados'],
                datasets: [{
                    data: [activos.value, finalizados.value],
                    backgroundColor: ['#ef4444', '#22c55e'],
                    borderColor: ['#fff', '#fff'],
                    borderWidth: 3,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '68%',
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} evento(s)` } },
                },
            },
        });
    }

    // Bar: Tipo de evento
    if (chartTipoInstance) chartTipoInstance.destroy();
    const tipos = tiposConteo.value;
    if (chartTipo.value && Object.keys(tipos).length > 0) {
        const palette = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];
        chartTipoInstance = new Chart(chartTipo.value, {
            type: 'bar',
            data: {
                labels: Object.keys(tipos),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(tipos),
                    backgroundColor: Object.keys(tipos).map((_, i) => palette[i % palette.length]),
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
                    y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                },
            },
        });
    }

    // Bar: Por departamento
    if (chartDeptoInstance) chartDeptoInstance.destroy();
    if (chartDepto.value && deptoConteo.value.length > 0) {
        chartDeptoInstance = new Chart(chartDepto.value, {
            type: 'bar',
            data: {
                labels: deptoConteo.value.map(([d]) => d),
                datasets: [{
                    label: 'Eventos',
                    data: deptoConteo.value.map(([, c]) => c),
                    backgroundColor: '#6366f1',
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                },
            },
        });
    }
};

// ─── Fetch & refresh ────────────────────────────────────────────
const fetchData = async () => {
    try {
        const res = await axios.get('/api/bloqueos');
        bloqueos.value = res.data;
        drawMarkers();
        await nextTick();
        buildCharts();
    } catch (e) { console.error(e); }
};

// ─── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
    map = L.map(mapContainer.value, {
        maxBounds: GT_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 6,
    }).setView(GT_CENTER, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.on('click', () => { selectedBloqueo.value = null; });

    await fetchData();
    pollInterval = setInterval(fetchData, 15000);
});

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval);
    chartEstadoInstance?.destroy();
    chartTipoInstance?.destroy();
    chartDeptoInstance?.destroy();
    if (map) map.remove();
});

// Centrar mapa al hacer clic en fila
const focusMap = (b) => {
    map?.setView([b.latitud, b.longitud], 14);
    document.getElementById('mapa-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<template>
    <Head title="Monitor Vial GT — Mapa de Situación" />

    <div class="min-h-screen bg-gray-50 font-sans text-gray-900">

        <!-- ── Header ─────────────────────────────────────────── -->
        <header class="sticky top-0 z-[1000] bg-white border-b shadow-sm px-6 py-3 flex justify-between items-center">
            <div class="flex items-center gap-2 font-black text-xl text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Monitor Vial GT
            </div>
            <nav v-if="$page.props.canLogin" class="flex items-center gap-3">
                <span class="text-xs text-gray-400 hidden sm:block">
                    Actualización automática cada 15s
                </span>
                <Link v-if="$page.props.auth.user" :href="route('dashboard')"
                    class="text-sm font-bold px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition">
                    Panel de Administración
                </Link>
                <Link v-else :href="route('login')"
                    class="text-sm font-bold px-4 py-2 border border-gray-300 rounded-lg hover:border-red-500 hover:text-red-600 transition bg-white shadow-sm">
                    Administrar
                </Link>
            </nav>
        </header>

        <main class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            <!-- ── Título ──────────────────────────────────────── -->
            <div class="text-center">
                <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Mapa de Situación Vial</h1>
                <p class="text-gray-500 mt-1 text-base">Visualización en tiempo real de reportes de tránsito a nivel nacional.</p>
            </div>

            <!-- ── Tarjetas de estadísticas ────────────────────── -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Eventos</p>
                    <p class="text-3xl font-extrabold text-gray-800">{{ bloqueos.length }}</p>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-red-100">
                    <p class="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Activos</p>
                    <div class="flex items-end gap-2">
                        <p class="text-3xl font-extrabold text-red-600">{{ activos }}</p>
                        <span class="text-sm text-gray-400 mb-1" v-if="bloqueos.length">
                            {{ Math.round(activos / bloqueos.length * 100) }}%
                        </span>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                    <p class="text-xs font-semibold text-green-500 uppercase tracking-wider mb-1">Finalizados</p>
                    <div class="flex items-end gap-2">
                        <p class="text-3xl font-extrabold text-green-600">{{ finalizados }}</p>
                        <span class="text-sm text-gray-400 mb-1" v-if="bloqueos.length">
                            {{ Math.round(finalizados / bloqueos.length * 100) }}%
                        </span>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-indigo-100">
                    <p class="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Tipos Distintos</p>
                    <p class="text-3xl font-extrabold text-indigo-600">{{ Object.keys(tiposConteo).length }}</p>
                </div>
            </div>

            <!-- ── Mapa ────────────────────────────────────────── -->
            <section id="mapa-section" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-3 border-b bg-gray-50">
                    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span class="font-bold text-gray-700 text-sm mr-1">Leyenda</span>
                        <span v-for="tipo in tiposEvento" :key="tipo.nombre"
                            class="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                            <span class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                :style="`background:${tipo.color}`">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"
                                    viewBox="0 0 24 24" fill="none" stroke="white"
                                    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                                    v-html="tipo.iconPath">
                                </svg>
                            </span>
                            {{ tipo.nombre }}
                        </span>
                        <span class="ml-auto text-xs text-gray-400 hidden sm:block">Clic en marcador para detalles</span>
                    </div>
                </div>

                <!-- Contenedor relativo para posicionar la tarjeta sobre el mapa -->
                <div class="relative">
                    <div ref="mapContainer" style="height: 520px;"></div>

                    <!-- Tarjeta flotante de evento seleccionado -->
                    <transition
                        enter-active-class="transition duration-200 ease-out"
                        enter-from-class="opacity-0 translate-y-3"
                        enter-to-class="opacity-100 translate-y-0"
                        leave-active-class="transition duration-150 ease-in"
                        leave-from-class="opacity-100 translate-y-0"
                        leave-to-class="opacity-0 translate-y-3"
                    >
                        <div
                            v-if="selectedBloqueo"
                            class="absolute bottom-5 left-1/2 -translate-x-1/2 z-[500] w-[340px] sm:w-[400px]"
                        >
                            <div class="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                <!-- Banda de color según estado -->
                                <div
                                    class="h-1.5 w-full"
                                    :class="selectedBloqueo.estado === 'Activo' ? 'bg-red-500' : 'bg-green-500'"
                                ></div>

                                <div class="px-5 py-4">
                                    <!-- Cabecera -->
                                    <div class="flex items-start justify-between gap-3 mb-3">
                                        <div class="flex items-center gap-2">
                                            <!-- Ícono según estado -->
                                            <span
                                                class="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                                :style="`background:${selectedBloqueo.estado === 'Activo' ? getTipo(selectedBloqueo.tipo_evento).colorLight : '#f3f4f6'}`"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                                                    viewBox="0 0 24 24" fill="none" stroke-width="2.5"
                                                    stroke-linecap="round" stroke-linejoin="round"
                                                    :stroke="selectedBloqueo.estado === 'Activo' ? getTipo(selectedBloqueo.tipo_evento).color : '#9ca3af'"
                                                    v-html="getTipo(selectedBloqueo.tipo_evento).iconPath">
                                                </svg>
                                            </span>
                                            <div>
                                                <h3 class="font-extrabold text-gray-900 text-base uppercase tracking-wide leading-tight">
                                                    {{ selectedBloqueo.tipo_evento }}
                                                </h3>
                                                <span
                                                    class="text-xs font-bold"
                                                    :style="`color:${selectedBloqueo.estado === 'Activo' ? getTipo(selectedBloqueo.tipo_evento).color : '#6b7280'}`"
                                                >{{ selectedBloqueo.estado }}</span>
                                            </div>
                                        </div>
                                        <!-- Botón cerrar -->
                                        <button
                                            @click.stop="selectedBloqueo = null"
                                            class="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition mt-0.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <!-- Detalles -->
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-start gap-2 text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            </svg>
                                            <span>
                                                <span class="font-semibold text-gray-700">{{ selectedBloqueo.municipio }}, {{ selectedBloqueo.departamento }}</span>
                                                <br>
                                                <span class="text-gray-500">{{ selectedBloqueo.direccion }}</span>
                                            </span>
                                        </div>

                                        <div v-if="selectedBloqueo.manifestantes_aproximados" class="flex items-center gap-2 text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            </svg>
                                            <span>Aproximadamente <strong>{{ selectedBloqueo.manifestantes_aproximados }}</strong> personas</span>
                                        </div>

                                        <div class="flex items-center gap-2 text-gray-400 text-xs pt-1 border-t">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                            </svg>
                                            <span class="font-mono">{{ selectedBloqueo.latitud }}, {{ selectedBloqueo.longitud }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </section>

            <!-- ── Gráficas ────────────────────────────────────── -->
            <section>
                <h2 class="text-lg font-bold text-gray-800 mb-4">Estadísticas</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

                    <!-- Doughnut: Estado -->
                    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 class="text-sm font-semibold text-gray-600 mb-3">Distribución por Estado</h3>
                        <div class="relative" style="height:220px;">
                            <canvas ref="chartEstado"></canvas>
                            <div v-if="bloqueos.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
                        </div>
                    </div>

                    <!-- Bar horizontal: Tipo de evento -->
                    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 class="text-sm font-semibold text-gray-600 mb-3">Eventos por Tipo</h3>
                        <div class="relative" style="height:220px;">
                            <canvas ref="chartTipo"></canvas>
                            <div v-if="Object.keys(tiposConteo).length === 0" class="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
                        </div>
                    </div>

                    <!-- Bar vertical: Por departamento -->
                    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 class="text-sm font-semibold text-gray-600 mb-3">Eventos por Departamento</h3>
                        <div class="relative" style="height:220px;">
                            <canvas ref="chartDepto"></canvas>
                            <div v-if="deptoConteo.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
                        </div>
                    </div>

                </div>
            </section>

            <!-- ── Tabla de eventos ────────────────────────────── -->
            <section>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 class="text-lg font-bold text-gray-800">Listado de Eventos</h2>
                    <div class="flex gap-2 flex-wrap">
                        <!-- Filtro estado -->
                        <div class="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold shadow-sm">
                            <button
                                v-for="opt in ['Todos','Activo','Finalizado']" :key="opt"
                                @click="filterEstado = opt"
                                class="px-3 py-1.5 transition"
                                :class="filterEstado === opt ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
                            >{{ opt }}</button>
                        </div>
                        <!-- Búsqueda -->
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Buscar evento..."
                            class="text-xs border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm focus:ring-1 focus:ring-indigo-300 focus:outline-none w-40"
                        />
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wider">
                                    <th class="p-3 pl-5">ID / Tipo</th>
                                    <th class="p-3">Dirección</th>
                                    <th class="p-3">Municipio</th>
                                    <th class="p-3">Departamento</th>
                                    <th class="p-3 text-center">Personas</th>
                                    <th class="p-3 text-center">Estado</th>
                                    <th class="p-3 text-center">Mapa</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="b in bloqueosFiltrados" :key="b.id"
                                    class="border-b hover:bg-indigo-50/30 transition-colors cursor-default"
                                >
                                    <td class="p-3 pl-5">
                                        <span class="font-bold text-sm text-gray-800">#{{ b.id }}</span>
                                        <span class="ml-1 text-sm text-gray-600">{{ b.tipo_evento }}</span>
                                    </td>
                                    <td class="p-3 text-sm text-gray-600 max-w-[200px] truncate">{{ b.direccion }}</td>
                                    <td class="p-3 text-sm text-gray-600">{{ b.municipio }}</td>
                                    <td class="p-3 text-sm text-gray-600">{{ b.departamento }}</td>
                                    <td class="p-3 text-center text-sm text-gray-500">
                                        {{ b.manifestantes_aproximados ?? '—' }}
                                    </td>
                                    <td class="p-3 text-center">
                                        <span
                                            :class="b.estado === 'Activo' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'"
                                            class="px-2 py-0.5 rounded-full text-xs font-bold border"
                                        >{{ b.estado }}</span>
                                    </td>
                                    <td class="p-3 text-center">
                                        <button @click="focusMap(b)" title="Ver en mapa"
                                            class="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition mx-auto block">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="bloqueosFiltrados.length === 0">
                                    <td colspan="7" class="py-12 text-center text-gray-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        No se encontraron eventos con ese filtro.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="px-5 py-3 border-t bg-gray-50 text-xs text-gray-400 flex justify-between">
                        <span>Mostrando {{ bloqueosFiltrados.length }} de {{ bloqueos.length }} eventos</span>
                        <span>Datos actualizados automáticamente</span>
                    </div>
                </div>
            </section>

        </main>

        <!-- ── Footer ─────────────────────────────────────────── -->
        <footer class="mt-12 border-t bg-white py-6 text-center text-xs text-gray-400">
            Monitor Vial GT &mdash; Sistema de reporte de incidentes viales en tiempo real.
        </footer>

    </div>
</template>

<style>
.leaflet-top, .leaflet-bottom { z-index: 400 !important; }
.leaflet-popup-content-wrapper {
    border-radius: 0.75rem !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.12) !important;
}
.leaflet-popup-content { margin: 14px !important; }
</style>
