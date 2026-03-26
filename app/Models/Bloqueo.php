<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bloqueo extends Model
{
    protected $fillable = [
        'direccion',
        'municipio',
        'departamento',
        'tipo_evento',
        'estado',
        'manifestantes_aproximados',
        'latitud',
        'longitud',
    ];
}
