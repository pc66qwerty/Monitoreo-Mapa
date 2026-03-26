<script setup>
import axios from 'axios';

defineProps({
    bloqueos: { type: Array, required: true }
});

const emit = defineEmits(['status-changed', 'focus-event', 'edit-event', 'deleted']);

const toggleStatus = (bloqueo) => {
    const newStatus = bloqueo.estado === 'Activo' ? 'Finalizado' : 'Activo';
    axios.patch(`/api/bloqueos/${bloqueo.id}`, { estado: newStatus })
        .then(response => emit('status-changed', response.data));
};

const deleteEvent = (bloqueo) => {
    if (!confirm(`¿Eliminar el evento #${bloqueo.id} "${bloqueo.tipo_evento}"? Esta acción no se puede deshacer.`)) return;
    axios.delete(`/api/bloqueos/${bloqueo.id}`)
        .then(() => emit('deleted', bloqueo.id));
};
</script>

<template>
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wider">
                    <th class="p-3 font-semibold">ID / Tipo</th>
                    <th class="p-3 font-semibold">Ubicación</th>
                    <th class="p-3 font-semibold">Coords</th>
                    <th class="p-3 font-semibold text-center">Estado</th>
                    <th class="p-3 font-semibold text-center">Acciones</th>
                </tr>
            </thead>
            <tbody class="text-gray-700">
                <tr v-for="b in bloqueos" :key="b.id" class="border-b hover:bg-gray-50 transition-colors">
                    <td class="p-3">
                        <div class="font-bold text-gray-900 text-sm">#{{ b.id }} {{ b.tipo_evento }}</div>
                        <div class="text-xs text-gray-400" v-if="b.manifestantes_aproximados">{{ b.manifestantes_aproximados }} personas</div>
                    </td>
                    <td class="p-3">
                        <div class="text-sm">{{ b.direccion }}</div>
                        <div class="text-xs text-gray-400">{{ b.municipio }}, {{ b.departamento }}</div>
                    </td>
                    <td class="p-3 text-xs font-mono text-gray-400">
                        <div>{{ b.latitud }}</div>
                        <div>{{ b.longitud }}</div>
                    </td>
                    <td class="p-3 text-center">
                        <span
                            :class="b.estado === 'Activo' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'"
                            class="px-2 py-0.5 rounded-full text-xs font-bold border">
                            {{ b.estado }}
                        </span>
                    </td>
                    <td class="p-3">
                        <div class="flex items-center justify-center gap-1">
                            <!-- Ver en mapa -->
                            <button @click="emit('focus-event', b)" title="Ver en mapa"
                                class="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>
                            <!-- Editar -->
                            <button @click="emit('edit-event', b)" title="Editar"
                                class="p-1.5 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <!-- Cambiar estado -->
                            <button @click="toggleStatus(b)" :title="b.estado === 'Activo' ? 'Finalizar' : 'Reactivar'"
                                class="p-1.5 rounded-lg text-gray-400 transition"
                                :class="b.estado === 'Activo' ? 'hover:bg-gray-100 hover:text-gray-700' : 'hover:bg-blue-50 hover:text-blue-600'">
                                <svg v-if="b.estado === 'Activo'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            </button>
                            <!-- Eliminar -->
                            <button @click="deleteEvent(b)" title="Eliminar"
                                class="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr v-if="bloqueos.length === 0">
                    <td colspan="5" class="p-8 text-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        No hay eventos registrados actualmente.
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
