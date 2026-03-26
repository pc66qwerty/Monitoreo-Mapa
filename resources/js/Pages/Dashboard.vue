<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head } from '@inertiajs/vue3';
import BloqueoForm from '@/Components/BloqueoForm.vue';
import BloqueoList from '@/Components/BloqueoList.vue';
import AdminMap from '@/Components/AdminMap.vue';
import BloqueoEditModal from '@/Components/BloqueoEditModal.vue';

const bloqueos = ref([]);
const adminMap = ref(null);
const pickMode = ref(false);
const pendingCoords = ref(null);
const editingBloqueo = ref(null);

const activos = computed(() => bloqueos.value.filter(b => b.estado === 'Activo').length);
const finalizados = computed(() => bloqueos.value.filter(b => b.estado === 'Finalizado').length);

const fetchBloqueos = () => {
    axios.get('/api/bloqueos').then(r => { bloqueos.value = r.data; });
};

onMounted(fetchBloqueos);

const handleCreated = (newBloqueo) => {
    bloqueos.value.unshift(newBloqueo);
    pickMode.value = false;
    pendingCoords.value = null;
    adminMap.value?.clearTempMarker();
    adminMap.value?.focusOn(newBloqueo.latitud, newBloqueo.longitud);
};

const handleStatusChanged = (updated) => {
    const i = bloqueos.value.findIndex(b => b.id === updated.id);
    if (i !== -1) bloqueos.value[i] = updated;
};

const handleUpdated = (updated) => {
    const i = bloqueos.value.findIndex(b => b.id === updated.id);
    if (i !== -1) bloqueos.value[i] = updated;
};

const handleDeleted = (id) => {
    bloqueos.value = bloqueos.value.filter(b => b.id !== id);
};

const handleFocusEvent = (bloqueo) => {
    adminMap.value?.focusOn(bloqueo.latitud, bloqueo.longitud);
    document.getElementById('admin-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const togglePickMode = () => {
    pickMode.value = !pickMode.value;
    if (!pickMode.value) {
        pendingCoords.value = null;
        adminMap.value?.clearTempMarker();
    }
};

const handleCoordsSelected = (coords) => {
    pendingCoords.value = coords;
    pickMode.value = false;
};

// ─── Reporte CSV ────────────────────────────────────────────────
const exportCSV = () => {
    const headers = ['ID', 'Tipo Evento', 'Dirección', 'Municipio', 'Departamento', 'Estado', 'Personas Aprox.', 'Latitud', 'Longitud', 'Creado'];
    const rows = bloqueos.value.map(b => [
        b.id,
        b.tipo_evento,
        `"${b.direccion}"`,
        b.municipio,
        b.departamento,
        b.estado,
        b.manifestantes_aproximados ?? '',
        b.latitud,
        b.longitud,
        b.created_at ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_eventos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Reporte Impresión ───────────────────────────────────────────
const printReport = () => {
    const fecha = new Date().toLocaleString('es-GT');
    const rows = bloqueos.value.map(b => `
        <tr>
            <td>#${b.id}</td>
            <td>${b.tipo_evento}</td>
            <td>${b.direccion}</td>
            <td>${b.municipio}, ${b.departamento}</td>
            <td style="color:${b.estado === 'Activo' ? '#dc2626' : '#16a34a'};font-weight:700;">${b.estado}</td>
            <td>${b.manifestantes_aproximados ?? '—'}</td>
            <td style="font-size:11px;">${b.latitud}, ${b.longitud}</td>
        </tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="es"><head>
        <meta charset="UTF-8"><title>Reporte de Eventos Viales</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
            .stats { display: flex; gap: 24px; margin-bottom: 16px; }
            .stat { background: #f3f4f6; padding: 8px 16px; border-radius: 6px; }
            .stat b { display: block; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #1f2937; color: white; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) td { background: #f9fafb; }
            @media print { body { margin: 0; } }
        </style>
    </head><body>
        <h1>Reporte de Eventos Viales — Monitor Vial GT</h1>
        <div class="meta">Generado el ${fecha}</div>
        <div class="stats">
            <div class="stat"><b>${bloqueos.value.length}</b>Total</div>
            <div class="stat" style="border-left:3px solid #dc2626;"><b style="color:#dc2626">${activos.value}</b>Activos</div>
            <div class="stat" style="border-left:3px solid #16a34a;"><b style="color:#16a34a">${finalizados.value}</b>Finalizados</div>
        </div>
        <table>
            <thead><tr>
                <th>ID</th><th>Tipo</th><th>Dirección</th><th>Ubicación</th>
                <th>Estado</th><th>Personas</th><th>Coordenadas</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    win.document.close();
};
</script>

<template>
    <Head title="Panel de Administración" />

    <AuthenticatedLayout>
        <template #header>
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">Gestión de Eventos y Bloqueos</h2>
        </template>

        <div class="py-8 bg-gray-50 min-h-screen">
            <div class="max-w-[1600px] mx-auto sm:px-6 lg:px-8 space-y-6">

                <!-- Tarjetas de resumen -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div class="bg-gray-100 rounded-lg p-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <div>
                            <p class="text-2xl font-extrabold text-gray-800">{{ bloqueos.length }}</p>
                            <p class="text-xs text-gray-500 font-medium">Total eventos</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-red-100 flex items-center gap-4">
                        <div class="bg-red-50 rounded-lg p-3">
                            <span class="w-6 h-6 block rounded-full bg-red-500"></span>
                        </div>
                        <div>
                            <p class="text-2xl font-extrabold text-red-600">{{ activos }}</p>
                            <p class="text-xs text-gray-500 font-medium">Activos</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-green-100 flex items-center gap-4">
                        <div class="bg-green-50 rounded-lg p-3">
                            <span class="w-6 h-6 block rounded-full bg-green-500"></span>
                        </div>
                        <div>
                            <p class="text-2xl font-extrabold text-green-600">{{ finalizados }}</p>
                            <p class="text-xs text-gray-500 font-medium">Finalizados</p>
                        </div>
                    </div>
                </div>

                <!-- Layout principal: izquierda (form+lista) | derecha (mapa) -->
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    <!-- Columna izquierda -->
                    <div class="space-y-5">
                        <BloqueoForm
                            :pending-coords="pendingCoords"
                            @created="handleCreated"
                            @toggle-pick-mode="togglePickMode"
                        />

                        <!-- Cabecera lista + botones de reporte -->
                        <div class="flex flex-wrap items-center justify-between gap-3 px-1">
                            <h3 class="text-base font-bold text-gray-800">
                                Eventos Registrados
                                <span class="text-sm font-normal text-gray-400 ml-1">({{ bloqueos.length }})</span>
                            </h3>
                            <div class="flex gap-2">
                                <button @click="exportCSV"
                                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-600 rounded-lg hover:border-green-500 hover:text-green-700 transition shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                    Exportar CSV
                                </button>
                                <button @click="printReport"
                                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-700 transition shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                                    </svg>
                                    Imprimir / PDF
                                </button>
                            </div>
                        </div>

                        <BloqueoList
                            :bloqueos="bloqueos"
                            @status-changed="handleStatusChanged"
                            @focus-event="handleFocusEvent"
                            @edit-event="editingBloqueo = $event"
                            @deleted="handleDeleted"
                        />
                    </div>

                    <!-- Columna derecha: Mapa -->
                    <div id="admin-map-section">
                        <div class="sticky top-6">
                            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                        </svg>
                                        Mapa de Eventos en Tiempo Real
                                    </h3>
                                    <span v-if="pickMode"
                                        class="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                                        Modo selección activo
                                    </span>
                                </div>
                                <p class="text-xs text-gray-400 mb-3">
                                    Usa <strong class="text-gray-500">"Seleccionar en Mapa"</strong> para fijar coordenadas al registrar.
                                    El ícono
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    en la lista centra el mapa en ese evento.
                                </p>
                                <AdminMap
                                    ref="adminMap"
                                    :bloqueos="bloqueos"
                                    :pick-mode="pickMode"
                                    @coords-selected="handleCoordsSelected"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- Modal de edición -->
        <BloqueoEditModal
            v-if="editingBloqueo"
            :bloqueo="editingBloqueo"
            @updated="handleUpdated"
            @close="editingBloqueo = null"
        />
    </AuthenticatedLayout>
</template>
