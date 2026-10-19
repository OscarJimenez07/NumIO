# Manual de Usuario — NumIO

## Para estudiantes

### 1. Acceso
1. Abre https://numio.mexicocentral.cloudapp.azure.com en tu navegador (en una instalación local la dirección es http://localhost:8080).
2. Ingresa de una de estas formas:
   - **Con tu cuenta institucional** (botón de Microsoft), usando tu correo @uts.edu.co.
   - **Con un código** que llega a tu correo institucional.
   - **Con usuario y contraseña**, si el docente te creó la cuenta. Puedes escribir el correo completo o solo el usuario (lo que va antes de la @).
3. Si entras con una contraseña temporal, la plataforma te pide cambiarla en el primer ingreso.
4. Si olvidaste la contraseña, usa **"¿Olvidaste tu contraseña?"** y sigue el código que llega al correo.

### 2. Navegación
La barra lateral izquierda agrupa los módulos:

- **Análisis Numérico**
  - Bisección, Newton-Raphson (raíces)
  - Lagrange, Newton-DD (interpolación)
  - Trapecio, Simpson 1/3, Simpson 3/8 (integración)
- **Investigación de Operaciones**
  - Símplex, Transporte, Asignación
- **Validación**: Pre-test, Pos-test, Encuesta de opinión
- **Mi panel**: historial de tus prácticas validadas

### 3. Resolver un ejercicio (modo automático)
Ejemplo con **Bisección**:
1. Entra a "Análisis Numérico → Bisección".
2. Escribe la función, p. ej. `x^3 - x - 2`.
3. Define el intervalo `[a, b]` y la tolerancia.
4. Haz clic en **"Resolver automáticamente"**.
5. La plataforma te mostrará:
   - **Gráfica** de f(x) con cada iteración marcada.
   - **Tabla** con todas las iteraciones.
   - **Reproductor** para avanzar paso a paso.
   - **Resumen** con la raíz, el error final y el número de iteraciones.

### 4. Practicar paso a paso (con retroalimentación)
El modo de práctica está en los diez métodos.

1. Resuelve primero el ejercicio en modo automático.
2. Selecciona la pestaña **"Practicar paso a paso"**.
3. Llena los valores de cada iteración. Depende del método, por ejemplo:
   - Bisección: a, b, c, f(c).
   - Newton (DD): cada coeficiente, el término y la suma parcial.
   - Símplex: variable que entra, variable que sale, elemento pivote y valor de Z en cada pivoteo.
   - Transporte: cada asignación de Vogel (fila, columna, cantidad y costo acumulado).
   - Asignación: reducciones de fila y columna, recurso asignado y costo acumulado.
4. Haz clic en **"Validar mis pasos"**.
5. El panel de **Retroalimentación** te indicará:
   - Cuántos pasos están correctos.
   - Qué valor difiere y por qué (ejemplo: "El valor de f(c₂) esperado es −0.1250 pero ingresaste −0.1300").

Solo las prácticas validadas quedan en **Mi panel**; resolver en modo automático no cuenta como intento.

### 5. Notación de expresiones
La plataforma usa la sintaxis de **math.js**:

| Escribes | Significa |
|----------|-----------|
| `x^2`     | x al cuadrado |
| `sqrt(x)` | raíz cuadrada |
| `sin(x)`, `cos(x)`, `tan(x)` | trigonométricas (radianes) |
| `exp(x)`  | e^x |
| `log(x)`  | logaritmo natural |
| `abs(x)`  | valor absoluto |
| `pi`, `e` | constantes |

### 6. Validación pedagógica
Para apoyar el estudio cuasi-experimental del proyecto:
- **Pre-test**: cuestionario de 6 preguntas antes de usar la plataforma.
- **Pos-test**: el mismo cuestionario después de practicar (para medir mejora). La calificación la hace el servidor; el navegador no recibe las respuestas correctas.
- **Encuesta de opinión**: afirmaciones de utilidad, facilidad de uso y satisfacción en escala de 1 a 5, e incluye los 10 ítems de la escala SUS.

Tus resultados quedan asociados a tu cuenta para poder comparar el pre-test con el pos-test, así que no son anónimos sino seudonimizados: solo los docentes los ven, y el archivo CSV que se exporta usa un código de participante en lugar de tu nombre y correo (Ley 1581 de 2012).

---

## Para docentes

### 1. Acceso
Inicia sesión con una cuenta de tipo TEACHER o ADMIN. El registro público solo crea cuentas de estudiante.

### 2. Panel docente
El menú lateral mostrará la sección **"Docente"**:
- **Resultados piloto**: resumen agregado de pre/post-test y SUS, con exportación a CSV.
- **Resultados de opinión**: resultados agregados de la encuesta de opinión.
- **Usuarios**: lista de usuarios registrados, cambio de rol y restablecimiento de contraseña.

### 3. Exportar resultados
1. Entra a **"Resultados piloto"**.
2. En cada tabla (pre/post-test, SUS), haz clic en **"Exportar CSV"**.
3. El archivo descargado se puede abrir en Excel, SPSS o R para análisis estadístico (prueba t pareada, Wilcoxon, etc.). La columna `participante` trae un código (por ejemplo `P-3F9A1C2B`) en lugar del nombre y el correo.

### 4. Cambiar el rol de un usuario
1. Entra a **"Usuarios"**.
2. En la fila del usuario, elige el nuevo rol (Estudiante, Docente o Administrador) y confirma.
3. Un docente no puede crear administradores ni modificar a un administrador; eso solo lo hace otro administrador.

También se pueden asignar roles desde la configuración del servidor con las variables `DOCENTE_EMAILS` y `ADMIN_EMAILS` (ver `DEPLOYMENT.md`).

### 5. Restablecer la contraseña de un estudiante
En **"Usuarios"**, usa **"Cambiar contraseña"** en la fila del estudiante. La nueva contraseña queda como temporal y la plataforma obliga a cambiarla en el siguiente ingreso.

---

## Resolución de problemas comunes

**"Credenciales inválidas"**
- Verifica que el usuario (o el correo) y la contraseña sean los correctos.
- Si hay dos cuentas con el mismo usuario en dominios distintos, escribe el correo completo.
- En una instalación local de desarrollo existe la cuenta demo estudiante@uts.edu.co / Estudiante123!

**"f(a)·f(b) ≥ 0"**
- En Bisección, el intervalo debe contener un cambio de signo. Prueba con `[1, 2]` para `x^3 − x − 2`.

**"Simpson 1/3 requiere n par"**
- Cambia n a un número par (2, 4, 6…).

**El reproductor no avanza**
- Asegúrate de que el método ya haya sido resuelto.

---

## Créditos

Plataforma desarrollada como Trabajo de Grado **BAN-00311** para Ingeniería de Sistemas — Unidades Tecnológicas de Santander (UTS).

- **Estudiantes**: Oscar Javier Jiménez Celis · Anderson David Suárez Bernal
- **Director**: David Fernando Santamaría Maldonado
- **Línea de investigación**: Arquitectura y Diseño de Software
