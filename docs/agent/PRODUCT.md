# PRODUCT.md — Hacha y Tiza

## 1. Propósito

Hacha y Tiza resuelve un problema simple: alguien ya tiene un partido organizado y le faltan jugadores.

El organizador publica los lugares disponibles y otras personas pueden encontrarlos y reservarlos sin necesidad de conocer previamente al grupo.

Flujo principal:

```text
me faltan jugadores
→ publico los lugares
→ alguien los encuentra
→ reserva
→ jugamos
```

El producto debe priorizar siempre simplicidad, rapidez y claridad.

---

## 2. Alcance inicial

El MVP está orientado inicialmente a La Plata, Buenos Aires, Argentina.

Hacha y Tiza no gestiona inicialmente la reserva de la cancha. El organizador ya reservó el lugar por fuera del sistema y publica únicamente los lugares disponibles.

El MVP es una aplicación web responsive.

Estado inicial de lanzamiento: `Beta`.

Idioma inicial: español.

---

## 3. Actores

### Visitante

Puede:

- ver partidos públicos;
- filtrar partidos;
- seleccionar una zona temporal;
- abrir el detalle público de un partido.

No puede:

- publicar;
- reservar;
- entrar en lista de espera.

### Usuario registrado

No existen roles permanentes de jugador u organizador.

Un mismo usuario puede organizar un partido y participar como jugador en otro.

Puede:

- publicar partidos;
- reservar lugares;
- cancelar reservas;
- entrar y salir de listas de espera;
- gestionar partidos propios;
- consultar sus partidos.

### Administrador

El panel administrativo no forma parte del MVP inicial.

La moderación será manual durante Beta.

---

## 4. Usuario

Datos mínimos:

- nombre;
- email;
- contraseña si utiliza autenticación local;
- teléfono opcional;
- ubicación principal.

También puede autenticarse con Google.

Una cuenta creada únicamente con Google no necesita contraseña local.

Después del registro y selección de ubicación, el usuario accede directamente al home. No existe onboarding adicional.

---

## 5. Ubicaciones

La ubicación principal del usuario se utiliza para prefiltrar partidos.

Los visitantes pueden seleccionar temporalmente una zona y esa selección puede recordarse localmente en el navegador.

Los usuarios autenticados pueden explorar temporalmente otras zonas sin modificar su ubicación principal.

La estructura debe permitir jerarquía:

```text
PROVINCIA
CIUDAD
LOCALIDAD
BARRIO
ZONA
```

Modelo conceptual:

```text
Location
- id
- name
- type
- parentId?
- active
```

Los usuarios podrán proponer/agregar ubicaciones faltantes.

La geolocalización precisa y búsqueda por radio quedan para una fase posterior.

---

## 6. Partido

El partido es la entidad central del producto.

Un partido contiene:

- organizador;
- ubicación;
- formato;
- fecha;
- hora;
- nombre del lugar;
- dirección;
- precio por persona;
- lugares disponibles;
- especificación opcional;
- estado.

Formatos permitidos inicialmente:

```text
Fútbol 5
Fútbol 6
Fútbol 7
```

Estados:

```text
OPEN
CLOSED
CANCELLED
```

La finalización del partido se deriva de fecha y hora; no necesita un estado persistido adicional.

---

## 7. Publicación de partidos

Para publicar se requiere autenticación.

El lugar se carga manualmente:

- nombre del lugar;
- dirección;
- ubicación.

No existe catálogo oficial de canchas en el MVP.

Al crear un partido se crea automáticamente:

```text
Participation
role = ORGANIZER
```

El organizador no puede reservar su propio partido.

---

## 8. Regla diaria de participación

Un usuario no puede tener más de una participación activa confirmada en partidos de la misma fecha local.

Esta regla aplica tanto si el usuario:

- organiza un partido;
- reserva como jugador.

La fecha debe evaluarse según la fecha local del partido, no utilizando directamente la fecha UTC.

Las listas de espera son una excepción temporal: un usuario puede estar en varias listas de espera del mismo día mientras todavía no tenga una participación confirmada.

---

## 9. Edición de partidos

### Sin reservas activas

El organizador puede modificar los datos principales.

### Con reservas activas

No puede modificar:

- fecha;
- hora;
- lugar;
- dirección;
- precio.

Puede modificar información no crítica.

Los lugares disponibles pueden aumentarse.

También pueden reducirse, pero nunca hasta una capacidad inferior a los lugares ya reservados.

Si necesita cambiar información crítica, debe cancelar el partido y publicar uno nuevo.

---

## 10. Cancelación del partido

El organizador puede cancelar el partido antes de su inicio.

Puede incluir un motivo opcional.

El motivo debe quedar visible para usuarios que tenían una reserva.

Un partido cancelado:

- desaparece del home público;
- continúa visible en `Mis partidos` para los involucrados.

---

## 11. Descubrimiento de partidos

El home puede verse sin autenticación.

Filtros del MVP:

- zona;
- fecha;
- tipo de fútbol.

No existe búsqueda de texto libre inicialmente.

Orden principal:

1. fecha más próxima;
2. hora más próxima.

La interfaz debe diferenciar:

```text
Partidos con lugares disponibles
Partidos completos
```

Los partidos completos permiten ingresar en lista de espera.

La carga del listado será progresiva.

---

## 12. Detalle público

Cada partido tiene una URL pública estable.

El detalle puede consultarse sin iniciar sesión.

Para:

- reservar;
- entrar en lista de espera;
- publicar;

se requiere autenticación.

El partido puede compartirse mediante:

- copiar enlace;
- WhatsApp;
- Telegram;
- X/Twitter.

---

## 13. Reserva

Un usuario puede reservar uno o varios lugares hasta la disponibilidad existente.

La confirmación es automática.

No existe aprobación manual del organizador.

La operación debe ser atómica para evitar sobre-reservas.

Al confirmar una reserva se crea:

```text
Participation
role = PLAYER
```

---

## 14. Compañeros

Una reserva puede representar varios lugares.

Los nombres de acompañantes son opcionales.

Pueden agregarse después de confirmar la reserva.

La ausencia de nombres no debe impedir reservar.

---

## 15. Cancelación de reserva

Una reserva puede cancelarse en cualquier momento anterior al inicio del partido.

El usuario puede indicar un motivo opcional.

Al cancelar:

- se liberan los lugares;
- la disponibilidad se actualiza atómicamente;
- puede activarse el flujo de lista de espera.

No existen penalizaciones en el MVP.

---

## 16. Contacto

La información de contacto permanece privada hasta existir una reserva confirmada.

Después de la confirmación:

- organizador puede acceder al contacto del titular;
- titular puede acceder al contacto del organizador.

Los acompañantes no necesitan información de contacto propia.

---

## 17. Lista de espera

Cuando un partido está completo, un usuario puede entrar en lista de espera.

Puede solicitar uno o varios lugares.

Un usuario puede:

- estar en varias listas de espera;
- incluso estar en varias listas del mismo día;
- abandonar voluntariamente una lista.

El organizador puede ver:

- usuario;
- cantidad solicitada.

No puede seleccionar manualmente quién recibe el lugar.

---

## 18. Selección de lista de espera

Cuando se liberan lugares, el sistema elige automáticamente un candidato.

Prioridad:

1. la solicitud que mejor aproveche los lugares disponibles;
2. ante empate, la solicitud más antigua.

No es FIFO estricto.

Ejemplo:

```text
se liberan 2 lugares

Usuario A espera 1
Usuario B espera 2
Usuario C espera 1

→ se prioriza Usuario B
```

---

## 19. Oferta de lista de espera

El candidato seleccionado recibe una oferta temporal de 15 minutos.

La oferta no genera una reserva automáticamente.

El usuario puede:

- aceptar;
- rechazar;
- dejar que expire.

Si rechaza o expira, se evalúa el siguiente candidato compatible.

Las ofertas se notifican:

- dentro de la aplicación;
- por email.

---

## 20. Múltiples ofertas

Un usuario puede recibir más de una oferta del mismo día.

Si acepta una:

- se confirma esa participación;
- se invalidan las demás ofertas del mismo día;
- se eliminan sus otras listas de espera del mismo día.

Esta operación debe ser atómica.

---

## 21. Mis partidos

El MVP debe mostrar:

### Organizados

Partidos creados por el usuario.

### Reservados

Partidos donde tiene una reserva confirmada.

### Historial

Partidos cuya fecha/hora ya pasó.

Los partidos cancelados continúan visibles para usuarios involucrados.

---

## 22. Notificaciones

### Email

MVP:

- verificación de email;
- recuperación de contraseña;
- reserva confirmada;
- partido cancelado;
- oferta de lista de espera.

Proveedor definido: Resend.

### In-app

MVP:

- partido próximo;
- oferta de lista de espera;
- cancelación relevante.

Un partido se considera próximo cuando ocurre dentro de las próximas 24 horas.

---

## 23. Participation

`Participation` representa la relación de un usuario con un partido.

No debe confundirse con `Reservation`.

Roles:

```text
ORGANIZER
PLAYER
```

El rol pertenece a la participación, no al usuario.

Modelo conceptual:

```text
Participation
- id
- userId
- matchId
- role
- goals?
- assists?
```

Los campos estadísticos se reservan para una fase posterior.

---

## 24. Fuera del MVP

No implementar sin aprobación explícita:

- pagos;
- reserva directa de canchas;
- catálogo formal de canchas;
- administración para complejos;
- equipos;
- ligas;
- torneos;
- chat;
- reputación;
- penalizaciones;
- rankings;
- estadísticas de jugador;
- IA;
- recomendaciones;
- geolocalización precisa;
- búsqueda por radio;
- PWA;
- panel administrativo completo.

---

## 25. Principio de diseño

Cuando existan varias soluciones válidas, elegir la más simple que mantenga las reglas anteriores.

No agregar complejidad especulativa.

Ante una regla de negocio ambigua:

```text
NO INVENTAR
```

El agente debe reportar la ambigüedad antes de introducir un nuevo comportamiento.
