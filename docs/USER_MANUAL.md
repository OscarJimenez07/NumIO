# Manual de Usuario — NumIO

## Para estudiantes

### 1. Acceso
1. Abre http://localhost:8080 en tu navegador.
2. Si no tienes cuenta, haz clic en **"Regístrate"** y crea una con tu correo institucional.
3. Inicia sesión con tus credenciales.

### 2. Navegación
La barra lateral izquierda agrupa los módulos:

- **Análisis Numérico**
  - Bisección, Newton-Raphson (raíces)
  - Lagrange, Newton-DD (interpolación)
  - Trapecio, Simpson 1/3, Simpson 3/8 (integración)
- **Investigación de Operaciones**
  - Símplex, Transporte, Asignación
- **Validación**: Pre-test, Pos-test, Encuesta SUS
- **Mi panel**: historial personal de intentos

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
1. Resuelve primero el ejercicio en modo automático.
2. Selecciona la pestaña **"Practicar paso a paso"**.
3. Llena los valores de cada iteración (a, b, c, f(c)…).
4. Haz clic en **"Validar mis pasos"**.
5. El panel de **Retroalimentación** te indicará:
   - Cuántos pasos están correctos.
   - Qué valor difiere y por qué (ejemplo: "El valor de f(c₂) esperado es −0.1250 pero ingresaste −0.1300").

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
- **Pos-test**: el mismo cuestionario después de practicar (para medir mejora).
- **Encuesta SUS**: 10 ítems Likert para evaluar usabilidad.

Tus respuestas se guardan de forma anónima para análisis estadístico (Ley 1581 de 2012).

---

## Para docentes

### 1. Acceso
Inicia sesión con una cuenta de tipo TEACHER o ADMIN.

### 2. Panel docente
El menú lateral mostrará la sección **"Docente"**:
- **Resultados piloto**: resumen agregado de pre/post-test y SUS, con exportación a CSV.
- **Estudiantes**: lista de usuarios registrados.

### 3. Exportar resultados
1. Entra a **"Resultados piloto"**.
2. En cada tabla (pre/post-test, SUS), haz clic en **"Exportar CSV"**.
3. El archivo descargado se puede abrir en Excel, SPSS o R para análisis estadístico (prueba t pareada, Wilcoxon, etc.).

### 4. Promover usuarios a docente
Por seguridad, esta operación se realiza directamente en la base de datos con un usuario ADMIN:

```sql
UPDATE "User" SET role = 'TEACHER' WHERE email = 'profesor@uts.edu.co';
```

O usando Prisma Studio:
```bash
cd backend
npx prisma studio
```

---

## Resolución de problemas comunes

**"Credenciales inválidas"**
- Verifica que el correo y contraseña coincidan con los del registro.
- Usa la cuenta demo: estudiante@uts.edu.co / Estudiante123!

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
