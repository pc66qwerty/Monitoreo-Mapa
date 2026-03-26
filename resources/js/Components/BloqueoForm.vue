<script setup>
import { ref, watch, computed } from 'vue';
import axios from 'axios';
import InputLabel from '@/Components/InputLabel.vue';
import TextInput from '@/Components/TextInput.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import { departamentos, getMunicipios } from '@/data/guatemala';
import { tiposEvento } from '@/data/tiposEvento';

const props = defineProps({
    pendingCoords: { type: Object, default: null },
});

const emit = defineEmits(['created', 'toggle-pick-mode']);

const form = ref({
    direccion: '',
    municipio: '',
    departamento: '',
    tipo_evento: '',
    manifestantes_aproximados: null,
    latitud: '',
    longitud: '',
});

const errors = ref({});

const municipios = computed(() => getMunicipios(form.value.departamento));

// Al cambiar departamento, limpiar municipio
watch(() => form.value.departamento, () => { form.value.municipio = ''; });

watch(() => props.pendingCoords, (coords) => {
    if (coords) {
        form.value.latitud  = coords.lat;
        form.value.longitud = coords.lng;
    }
});

const submit = () => {
    errors.value = {};
    axios.post('/api/bloqueos', form.value)
        .then(response => {
            emit('created', response.data);
            form.value = {
                direccion: '', municipio: '', departamento: '', tipo_evento: '',
                manifestantes_aproximados: null, latitud: '', longitud: '',
            };
        })
        .catch(error => {
            if (error.response?.status === 422) errors.value = error.response.data.errors;
        });
};
</script>

<template>
  <form @submit.prevent="submit" class="p-6 bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
      <h3 class="text-xl font-bold mb-5 text-gray-800">Registrar Nuevo Evento</h3>

      <!-- Tipo de evento (selector visual) -->
      <div class="mb-5">
          <InputLabel value="Tipo de Evento" />
          <div class="grid grid-cols-3 gap-2 mt-2">
              <button
                  v-for="tipo in tiposEvento" :key="tipo.nombre"
                  type="button"
                  @click="form.tipo_evento = tipo.nombre"
                  class="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left text-sm font-semibold transition-all"
                  :style="form.tipo_evento === tipo.nombre
                    ? `border-color:${tipo.color}; background:${tipo.colorLight}; color:${tipo.color};`
                    : 'border-color:#e5e7eb; background:white; color:#6b7280;'"
              >
                  <span
                      class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      :style="`background:${form.tipo_evento === tipo.nombre ? tipo.color : '#e5e7eb'};`"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                          viewBox="0 0 24 24" fill="none" stroke="white"
                          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                          v-html="tipo.iconPath">
                      </svg>
                  </span>
                  <span class="leading-tight">{{ tipo.nombre }}</span>
              </button>
          </div>
          <span v-if="errors.tipo_evento" class="text-red-500 text-xs mt-1 block">{{ errors.tipo_evento[0] }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Departamento -->
          <div>
              <InputLabel for="departamento" value="Departamento" />
              <select id="departamento" v-model="form.departamento" required
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring focus:ring-indigo-200 focus:border-indigo-400">
                  <option value="" disabled>Seleccionar departamento...</option>
                  <option v-for="d in departamentos" :key="d.nombre" :value="d.nombre">{{ d.nombre }}</option>
              </select>
              <span v-if="errors.departamento" class="text-red-500 text-xs">{{ errors.departamento[0] }}</span>
          </div>

          <!-- Municipio -->
          <div>
              <InputLabel for="municipio" value="Municipio" />
              <select id="municipio" v-model="form.municipio" required :disabled="!form.departamento"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring focus:ring-indigo-200 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="" disabled>{{ form.departamento ? 'Seleccionar municipio...' : 'Primero selecciona un departamento' }}</option>
                  <option v-for="m in municipios" :key="m" :value="m">{{ m }}</option>
              </select>
              <span v-if="errors.municipio" class="text-red-500 text-xs">{{ errors.municipio[0] }}</span>
          </div>

          <!-- Dirección -->
          <div class="md:col-span-2">
              <InputLabel for="direccion" value="Dirección o Referencia" />
              <TextInput id="direccion" v-model="form.direccion" type="text" class="mt-1 block w-full" required
                  placeholder="Ej. Km 45 carretera al Atlántico, frente al puente..." />
              <span v-if="errors.direccion" class="text-red-500 text-xs">{{ errors.direccion[0] }}</span>
          </div>

          <!-- Personas -->
          <div>
              <InputLabel for="manifestantes" value="Aprox. Personas (opcional)" />
              <TextInput id="manifestantes" v-model="form.manifestantes_aproximados" type="number" min="0" class="mt-1 block w-full" />
          </div>
      </div>

      <!-- Coordenadas GPS -->
      <div class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-gray-700">Coordenadas GPS</span>
              <button type="button" @click="emit('toggle-pick-mode')"
                  class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition"
                  :class="pendingCoords
                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Seleccionar en Mapa
              </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
              <div>
                  <InputLabel for="latitud" value="Latitud" />
                  <TextInput id="latitud" v-model="form.latitud" type="number" step="any" class="mt-1 block w-full"
                      placeholder="Ej. 14.634915" :class="pendingCoords ? 'border-blue-400 ring-1 ring-blue-300' : ''" required />
                  <span v-if="errors.latitud" class="text-red-500 text-xs">{{ errors.latitud[0] }}</span>
              </div>
              <div>
                  <InputLabel for="longitud" value="Longitud" />
                  <TextInput id="longitud" v-model="form.longitud" type="number" step="any" class="mt-1 block w-full"
                      placeholder="Ej. -90.506882" :class="pendingCoords ? 'border-blue-400 ring-1 ring-blue-300' : ''" required />
                  <span v-if="errors.longitud" class="text-red-500 text-xs">{{ errors.longitud[0] }}</span>
              </div>
          </div>
          <p v-if="pendingCoords" class="text-xs text-blue-600 font-medium mt-1">✓ Coordenadas seleccionadas del mapa</p>
      </div>

      <div class="mt-5 flex justify-end">
          <PrimaryButton>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Guardar Evento
          </PrimaryButton>
      </div>
  </form>
</template>
