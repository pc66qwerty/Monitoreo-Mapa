<script setup>
import { ref, watch, computed } from 'vue';
import axios from 'axios';
import InputLabel from '@/Components/InputLabel.vue';
import TextInput from '@/Components/TextInput.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import { departamentos, getMunicipios } from '@/data/guatemala';
import { tiposEvento } from '@/data/tiposEvento';

const props = defineProps({
    bloqueo: { type: Object, default: null },
});

const emit = defineEmits(['updated', 'close']);

const form = ref({});
const errors = ref({});
const saving = ref(false);

const municipios = computed(() => getMunicipios(form.value.departamento));

watch(() => props.bloqueo, (b) => {
    if (b) { form.value = { ...b }; errors.value = {}; }
}, { immediate: true });

watch(() => form.value.departamento, (newDepto, oldDepto) => {
    if (oldDepto && newDepto !== oldDepto) form.value.municipio = '';
});

const submit = () => {
    saving.value = true;
    errors.value = {};
    axios.patch(`/api/bloqueos/${props.bloqueo.id}`, form.value)
        .then(response => { emit('updated', response.data); emit('close'); })
        .catch(error => { if (error.response?.status === 422) errors.value = error.response.data.errors; })
        .finally(() => { saving.value = false; });
};
</script>

<template>
    <teleport to="body">
        <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4" @click.self="emit('close')">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b">
                    <h3 class="text-lg font-bold text-gray-800">Editar Evento #{{ bloqueo?.id }}</h3>
                    <button @click="emit('close')" class="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form @submit.prevent="submit" class="px-6 py-5 space-y-4">
                    <!-- Tipo de evento -->
                    <div>
                        <InputLabel value="Tipo de Evento" />
                        <div class="grid grid-cols-3 gap-2 mt-2">
                            <button v-for="tipo in tiposEvento" :key="tipo.nombre" type="button"
                                @click="form.tipo_evento = tipo.nombre"
                                class="flex items-center gap-2 px-2 py-2 rounded-xl border-2 text-left text-xs font-semibold transition-all"
                                :style="form.tipo_evento === tipo.nombre
                                  ? `border-color:${tipo.color}; background:${tipo.colorLight}; color:${tipo.color};`
                                  : 'border-color:#e5e7eb; background:white; color:#6b7280;'"
                            >
                                <span class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                                    :style="`background:${form.tipo_evento === tipo.nombre ? tipo.color : '#e5e7eb'};`">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                                        viewBox="0 0 24 24" fill="none" stroke="white"
                                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                                        v-html="tipo.iconPath">
                                    </svg>
                                </span>
                                {{ tipo.nombre }}
                            </button>
                        </div>
                        <span v-if="errors.tipo_evento" class="text-red-500 text-xs">{{ errors.tipo_evento[0] }}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <!-- Departamento -->
                        <div>
                            <InputLabel value="Departamento" />
                            <select v-model="form.departamento" required
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring focus:ring-indigo-200 focus:border-indigo-400">
                                <option value="" disabled>Seleccionar...</option>
                                <option v-for="d in departamentos" :key="d.nombre" :value="d.nombre">{{ d.nombre }}</option>
                            </select>
                            <span v-if="errors.departamento" class="text-red-500 text-xs">{{ errors.departamento[0] }}</span>
                        </div>

                        <!-- Municipio -->
                        <div>
                            <InputLabel value="Municipio" />
                            <select v-model="form.municipio" required :disabled="!form.departamento"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring focus:ring-indigo-200 focus:border-indigo-400 disabled:opacity-50">
                                <option value="" disabled>Seleccionar...</option>
                                <option v-for="m in municipios" :key="m" :value="m">{{ m }}</option>
                            </select>
                            <span v-if="errors.municipio" class="text-red-500 text-xs">{{ errors.municipio[0] }}</span>
                        </div>

                        <!-- Dirección -->
                        <div class="col-span-2">
                            <InputLabel value="Dirección o Referencia" />
                            <TextInput v-model="form.direccion" type="text" class="mt-1 block w-full" required />
                            <span v-if="errors.direccion" class="text-red-500 text-xs">{{ errors.direccion[0] }}</span>
                        </div>

                        <!-- Estado -->
                        <div>
                            <InputLabel value="Estado" />
                            <select v-model="form.estado"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring focus:ring-indigo-200 focus:border-indigo-400">
                                <option value="Activo">Activo</option>
                                <option value="Finalizado">Finalizado</option>
                            </select>
                        </div>

                        <!-- Personas -->
                        <div>
                            <InputLabel value="Aprox. Personas" />
                            <TextInput v-model="form.manifestantes_aproximados" type="number" min="0" class="mt-1 block w-full" />
                        </div>

                        <!-- Coords -->
                        <div>
                            <InputLabel value="Latitud" />
                            <TextInput v-model="form.latitud" type="number" step="any" class="mt-1 block w-full" required />
                            <span v-if="errors.latitud" class="text-red-500 text-xs">{{ errors.latitud[0] }}</span>
                        </div>
                        <div>
                            <InputLabel value="Longitud" />
                            <TextInput v-model="form.longitud" type="number" step="any" class="mt-1 block w-full" required />
                            <span v-if="errors.longitud" class="text-red-500 text-xs">{{ errors.longitud[0] }}</span>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-2 border-t">
                        <button type="button" @click="emit('close')"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                            Cancelar
                        </button>
                        <PrimaryButton :disabled="saving">
                            <svg v-if="saving" class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            Guardar Cambios
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    </teleport>
</template>
