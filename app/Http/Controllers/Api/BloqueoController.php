<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bloqueo;
use Illuminate\Http\Request;

class BloqueoController extends Controller
{
    public function index()
    {
        return response()->json(Bloqueo::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'direccion' => 'required|string|max:255',
            'municipio' => 'required|string|max:255',
            'departamento' => 'required|string|max:255',
            'tipo_evento' => 'required|string|max:255',
            'estado' => 'nullable|in:Activo,Finalizado',
            'manifestantes_aproximados' => 'nullable|integer|min:0',
            'latitud' => 'required|numeric',
            'longitud' => 'required|numeric',
        ]);

        $bloqueo = Bloqueo::create($validated);
        return response()->json($bloqueo, 201);
    }

    public function show(string $id)
    {
        return response()->json(Bloqueo::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $bloqueo = Bloqueo::findOrFail($id);
        
        $validated = $request->validate([
            'direccion'                => 'sometimes|required|string|max:255',
            'municipio'                => 'sometimes|required|string|max:255',
            'departamento'             => 'sometimes|required|string|max:255',
            'tipo_evento'              => 'sometimes|required|string|max:255',
            'estado'                   => 'sometimes|required|in:Activo,Finalizado',
            'manifestantes_aproximados'=> 'nullable|integer|min:0',
            'latitud'                  => 'sometimes|required|numeric',
            'longitud'                 => 'sometimes|required|numeric',
        ]);

        $bloqueo->update($validated);
        return response()->json($bloqueo);
    }

    public function destroy(string $id)
    {
        $bloqueo = Bloqueo::findOrFail($id);
        $bloqueo->delete();
        return response()->json(['message' => 'Eliminado']);
    }
}
