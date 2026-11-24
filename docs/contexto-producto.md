# GanaderApp — De qué se encarga el software

> Documento de referencia del producto. Explica el propósito del software, en
> qué le ayuda al ganadero y qué puede hacer con él. Las decisiones de diseño
> se definen a partir de este documento.

## 1. Propósito

Llevar el control completo del ciclo productivo del rodeo en un solo lugar:
**saber siempre qué animal está en qué etapa, qué insumos quedan y qué hay que
hacer hoy**, desde el celular, estando o no con señal de internet.

Antes de la app, ese control vive en cuadernos, planillas sueltas y en la
memoria del capataz. GanaderApp lo convierte en un registro ordenado,
compartido y confiable, que el dueño consulta en cualquier momento y que el
personal de campo carga desde el potrero.

## 2. En qué le ayuda al ganadero

- **Nunca más perder la cuenta del rodeo.** Cada bovino tiene su historia
  completa: fecha de alta, fases cumplidas, tratamientos, partos, destete.
- **Saber qué animal está en qué etapa.** El protocolo de 7 fases
  (chequeo, preparo, inseminación, gestación, preparto, parto y destete) se
  sigue automáticamente; el sistema marca qué animal está listo para la
  siguiente fase y quién se atrasó.
- **No gastar de más ni quedarse corto.** Las dosis de semen y los insumos se
  descuentan solos cuando se usa uno, y el sistema avisa cuando el stock baja
  del mínimo o un lote está por vencer o ya venció.
- **Comprar a tiempo y justificado.** Las alertas de stock dicen exactamente
  qué falta, cuánto queda y de qué proveedor pedirlo.
- **Trabajar aunque no haya señal.** En el potrero no hay internet: los
  registros se guardan en el teléfono y se envían solos cuando vuelve la
  conexión. Nadie tiene que volver a la oficina a cargar datos.
- **Ver el día de un vistazo.** Qué se registró hoy, qué quedó pendiente de
  sincronizar y qué requiere una decisión, todo en una pantalla.
- **Delegar sin perder control.** Cada fase tiene su equipo responsable
  asignado; el dueño ve quién completó qué y cuándo.
- **Preparar el futuro negocio.** Todo gasto y consumo queda ligado al animal
  y al evento que lo originó, la base para valorizar el ganado y conocer el
  costo real de cada etapa.

## 3. Qué puede hacer con este software

### Con los animales
- Registrar cada bovino con su caravana (y chip, cuando esté definido).
- Buscar un animal por caravana o nombre y ver su ficha completa.
- Seguir el protocolo de 7 fases por animal, con la fase actual marcada.
- Completar una fase con su equipo responsable y los insumos que exija.
- Registrar observaciones y eventos sueltos (sanidad, tratamientos, notas).

### Con el inventario
- Cargar proveedores con sus datos de contacto.
- Administrar productos por categoría y etapa del ciclo
  (vacunas, semen, insumos generales).
- Administrar lotes de semen: código, proveedor, dosis totales y disponibles,
  vencimiento.
- Registrar entradas de stock y consumos, siempre trazables
  (qué animal, qué evento, qué lote).
- Recibir alertas: stock bajo el mínimo, lotes con pocas dosis, lotes vencidos.

### Con la operación diaria
- Registrar eventos desde el campo, sin señal, con confirmación visual de
  qué quedó pendiente y qué ya se envió.
- Ver el resumen del día: eventos registrados, sincronización, animales por fase.
- Repartir responsabilidades por fase y equipo.

### Con el establecimiento
- Operar el establecimiento como su propio espacio privado: la información de
  un campo nunca se mezcla con la de otro.
- Sumar usuarios del personal según el rol que cumplan (futuro: gestión de
  equipos y plan contratado desde la app).

## 4. Lo que el software NO hace (por ahora)

- No emite facturación ni contabilidad completa (el módulo contable mínimo
  llega después del MVP).
- No hace predicciones ni análisis con IA (post-MVP).
- No lee chips con el bastón lector (aplazado hasta definir el modelo que usa
  el dueño; mientras tanto todo se carga manualmente y la app está lista para
  incorporar la lectura cuando llegue).

## 5. En una frase

**GanaderApp convierte el manejo diario del rodeo —animales, fases, insumos y
alertas— en un registro vivo y compartido, que funciona en el potrero sin
señal y le devuelve al ganadero el control del negocio.**
