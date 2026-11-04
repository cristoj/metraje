# Simulador de metrología

Plataforma web para que los alumnos practiquen lecturas con tres instrumentos de medida de un taller industrial: **calibre**, **micrómetro** y **reloj comparador**. Cada instrumento se dibuja en SVG con una medida aleatoria; el alumno escribe la lectura en milímetros y el simulador la comprueba.

HTML, CSS y JavaScript planos: sin dependencias, sin *build*.

## Instrumentos

| Instrumento | Resolución | Rango | Particularidades |
| --- | --- | --- | --- |
| Calibre (nonio) | 0,02 mm | 0 – 150 mm | Vista general y detalle ampliado del nonio |
| Micrómetro | 0,01 mm | 4 rangos de 25 mm (0–25, 25–50, 50–75, 75–100) | El rango cambia al azar y está grabado en el cuerpo; hay que sumarlo a la lectura |
| Reloj comparador | 0,01 mm | 0 – 10 mm | Las flechas indican el sentido de la medición (horario o antihorario, aleatorio); la graduación impresa no cambia |

## Uso

1. Observa la medida que muestra el instrumento.
2. Escribe la lectura en mm (vale `12,34` o `12.34`).
3. **Responder** comprueba la lectura: tiene que coincidir exactamente. Muestra *Correcto* (icono verde) o *Incorrecto* (icono rojo).
4. **Ver respuesta** muestra la medida y cómo se obtiene.
5. **Otra medida** genera una medición nueva.

Además:

- El icono **?** abre la ayuda de lectura de cada instrumento.
- En el reloj comparador, el interruptor **Sentido aleatorio** activa o desactiva el cambio de sentido de la flecha (desactivado, siempre horario).
- **Zoom** para ver mejor las marcas: botones `+` / `−`, pellizco en pantallas táctiles, `Ctrl` + rueda del ratón, o doble clic. Arrastra para moverte por la figura ampliada.
- La interfaz cabe en una sola pantalla, también en móvil.

## Ejecutar

No hace falta instalar nada. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8765
# abrir http://localhost:8765
```

También funciona abriendo `index.html` directamente. Las tipografías se cargan desde Google Fonts; sin conexión se usan las de respaldo del sistema.

## Tests

Con Node.js (probado con v22):

```bash
node --test
```

Cubren la lógica (lectura y comparación de respuestas, generación de medidas, zoom) y, además, **leen el SVG generado como lo haría un alumno** para todas las medidas posibles de cada instrumento, comprobando que el dibujo coincide con la respuesta guardada.

## Cómo está organizado

```text
index.html              estructura, plantilla de cada herramienta y diálogo de ayuda
css/style.css           estilos (pantalla única, móvil, zoom, ayuda)
js/measure.js           lectura, formato y comparación de medidas
js/svg-kit.js           utilidades para construir los SVG
js/zoom.js              cálculos de zoom (botones, pellizco, rueda)
js/caliper.js           calibre
js/micrometer.js        micrómetro
js/dial.js              reloj comparador
js/app.js               pestañas, comprobación de respuestas, ayuda y zoom
tests/                  tests con el ejecutor de Node
```

Las medidas se guardan como **enteros en centésimas de milímetro** (23,67 mm → `2367`) para comparar sin errores de coma flotante. Cada instrumento es un módulo que expone `random()`, `render(valor)`, `explain(valor)` y su texto de ayuda; `app.js` es genérico y solo conoce esa interfaz. Algunos instrumentos añaden opciones propias:

- `answerOf(valor)`: cuando el valor codifica más información que la respuesta (el reloj añade 1000 si el sentido es antihorario).
- `rangeFor(valor)`: etiqueta de rango variable (micrómetro).
- `toggle`: interruptor propio de la herramienta (reloj).
