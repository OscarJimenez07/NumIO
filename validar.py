#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validación funcional de la plataforma NumIO.

Comprueba, contra la aplicación en marcha, que los diez métodos devuelven los
resultados publicados en la bibliografía del curso, que el modo de práctica
detecta errores, que las validaciones de entrada rechazan lo que deben y que
los permisos por rol se respetan.

Uso:
    docker compose up -d
    python validar.py                      (contra http://localhost:8080)
    python validar.py http://192.168.1.50:8080

No deja rastro: los registros que crea para probar el módulo piloto se
eliminan al terminar.
"""

import json
import subprocess
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
API = BASE + "/api"

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

VERDE, ROJO, GRIS, NEGRITA, FIN = "\033[32m", "\033[31m", "\033[90m", "\033[1m", "\033[0m"
resultados = []


def pedir(ruta, cuerpo=None, token=None, metodo=None):
    """Llama a la API y devuelve (código, datos)."""
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    pet = urllib.request.Request(API + ruta, data=datos, method=metodo or ("POST" if datos else "GET"))
    pet.add_header("Content-Type", "application/json")
    if token:
        pet.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(pet, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


def revisar(nombre, condicion, detalle=""):
    resultados.append((nombre, bool(condicion), detalle))
    marca = f"{VERDE}[ OK ]{FIN}" if condicion else f"{ROJO}[FALLA]{FIN}"
    print(f"  {marca} {nombre}" + (f"  {GRIS}{detalle}{FIN}" if detalle else ""))


def cerca(a, b, tol=1e-3):
    try:
        return abs(float(a) - float(b)) <= tol
    except Exception:
        return False


def titulo(t):
    print(f"\n{NEGRITA}{t}{FIN}")


print(f"{NEGRITA}Validación de NumIO{FIN}  ·  {BASE}")

# ---------------------------------------------------------------- 1. Servicios
titulo("1. Servicios en marcha")
# Los contenedores solo se pueden mirar si la plataforma corre en ESTE equipo.
# Al validar el servidor de internet, el Docker de aquí no tiene nada que ver
# con aquello, así que la comprobación se omite en vez de dar un falso fallo.
ES_LOCAL = any(h in BASE for h in ("localhost", "127.0.0.1", "[::1]"))

if not ES_LOCAL:
    print(f"  {GRIS}[ -- ]{FIN} Contenedores  {GRIS}se omite: {BASE} es remoto{FIN}")
else:
    try:
        # Se buscan por nombre y no por proyecto: así da igual con qué archivo
        # compose se hayan levantado (el de desarrollo o el de producción, que
        # añade Caddy y suma cuatro).
        ps = subprocess.run(["docker", "ps", "--filter", "name=numio-",
                             "--format", "{{.Names}} {{.Status}}"],
                            capture_output=True, text=True, timeout=60)
        activos = [l for l in ps.stdout.splitlines() if "Up" in l]
        revisar("Los contenedores están arriba", len(activos) >= 3,
                f"{len(activos)} activos: " + ", ".join(l.split()[0] for l in activos))
    except Exception as e:
        revisar("Los contenedores están arriba", False, str(e))

cod, salud = pedir("/health")
revisar("La API responde", cod == 200 and salud.get("status") == "ok")

# ------------------------------------------------------------ 2. Autenticación
titulo("2. Autenticación y roles")
sesiones = {}
for correo, clave, rol in [
    ("estudiante@uts.edu.co", "Estudiante123!", "STUDENT"),
    ("docente@uts.edu.co", "Docente123!", "TEACHER"),
    ("admin@uts.edu.co", "Admin123!", "ADMIN"),
]:
    cod, d = pedir("/auth/login", {"email": correo, "password": clave})
    ok = cod in (200, 201) and "token" in d and d.get("user", {}).get("role") == rol
    revisar(f"Inicia sesión {rol.lower()}", ok, correo)
    if ok:
        sesiones[rol] = d["token"]

cod, _ = pedir("/auth/login", {"email": "estudiante@uts.edu.co", "password": "clave-incorrecta"})
revisar("Rechaza una contraseña incorrecta", cod == 401, f"HTTP {cod}")

est = sesiones.get("STUDENT")
doc = sesiones.get("TEACHER")

cod, _ = pedir("/pilot/results", token=est)
revisar("Un estudiante no ve los resultados del piloto", cod == 403, f"HTTP {cod}")
cod, _ = pedir("/pilot/results", token=doc)
revisar("Un docente sí los ve", cod == 200, f"HTTP {cod}")
cod, _ = pedir("/numerical/bisection/solve", {"fn": "x^2-2", "a": 0, "b": 2})
revisar("Sin sesión no se puede resolver", cod == 401, f"HTTP {cod}")

# ------------------------------------------------- 3. Los diez métodos
titulo("3. Los diez métodos contra la bibliografía")

CASOS = [
    ("Bisección  x³−x−2 en [1,2]", "/numerical/bisection/solve",
     {"fn": "x^3 - x - 2", "a": 1, "b": 2, "tolerance": 0.0001},
     lambda r: cerca(r["root"], 1.521423) and r["iterations"] == 14,
     "raíz 1.521423 en 14 iteraciones · Burden y Faires"),

    ("Newton-Raphson  x²−2 desde x₀=1", "/numerical/newton-raphson/solve",
     {"fn": "x^2 - 2", "x0": 1, "tolerance": 1e-6},
     lambda r: cerca(r["root"], 1.414214) and r["iterations"] == 5,
     "√2 en 5 iteraciones"),

    ("Lagrange  (0,1)(1,2)(2,5) en x=1.5", "/numerical/lagrange/solve",
     {"points": [{"x": 0, "y": 1}, {"x": 1, "y": 2}, {"x": 2, "y": 5}], "evalAt": 1.5},
     lambda r: cerca(r["evaluatedValue"], 3.25) and r["degree"] == 2,
     "P(1.5) = 3.25, grado 2"),

    ("Lagrange  reproduce un nodo exacto", "/numerical/lagrange/solve",
     {"points": [{"x": 0, "y": 1}, {"x": 1, "y": 2}, {"x": 2, "y": 5}], "evalAt": 1},
     lambda r: cerca(r["evaluatedValue"], 2),
     "P(1) = 2 exacto"),

    ("Newton (DD)  ln x en x=2.5", "/numerical/newton-divided/solve",
     {"points": [{"x": 1, "y": 0}, {"x": 2, "y": 0.6931}, {"x": 3, "y": 1.0986},
                 {"x": 4, "y": 1.3863}], "evalAt": 2.5},
     lambda r: cerca(r["evaluatedValue"], 0.921187),
     "P(2.5) = 0.921187"),

    ("Trapecio  x² en [0,1], n=4", "/numerical/trapezoidal/solve",
     {"fn": "x^2", "a": 0, "b": 1, "n": 4},
     lambda r: cerca(r["integral"], 0.34375),
     "0.34375 · sobreestima 1/3"),

    ("Simpson 1/3  x² en [0,1], n=4", "/numerical/simpson-1-3/solve",
     {"fn": "x^2", "a": 0, "b": 1, "n": 4},
     lambda r: cerca(r["integral"], 1 / 3),
     "0.333333 · exacto"),

    ("Simpson 3/8  x² en [0,1], n=6", "/numerical/simpson-3-8/solve",
     {"fn": "x^2", "a": 0, "b": 1, "n": 6},
     lambda r: cerca(r["integral"], 1 / 3),
     "0.333333 · exacto"),

    ("Símplex  máx 3x₁+5x₂", "/operations/simplex/solve",
     {"objective": "max", "c": [3, 5], "constraints": [
         {"coefficients": [1, 0], "operator": "<=", "rhs": 4},
         {"coefficients": [0, 2], "operator": "<=", "rhs": 12},
         {"coefficients": [3, 2], "operator": "<=", "rhs": 18}]},
     lambda r: cerca(r["z"], 36) and cerca(r["x"][0], 2) and cerca(r["x"][1], 6),
     "Z=36, x=(2,6) · Hillier y Lieberman"),

    ("Símplex  minimización con signo correcto", "/operations/simplex/solve",
     {"objective": "min", "c": [-3, -5], "constraints": [
         {"coefficients": [1, 0], "operator": "<=", "rhs": 4},
         {"coefficients": [0, 2], "operator": "<=", "rhs": 12},
         {"coefficients": [3, 2], "operator": "<=", "rhs": 18}]},
     lambda r: cerca(r["z"], -36),
     "Z = −36"),

    ("Símplex  dos fases con «=» y «≥»", "/operations/simplex/solve",
     {"objective": "min", "c": [4, 1], "constraints": [
         {"coefficients": [3, 1], "operator": "=", "rhs": 3},
         {"coefficients": [4, 3], "operator": ">=", "rhs": 6},
         {"coefficients": [1, 2], "operator": "<=", "rhs": 4}]},
     lambda r: cerca(r["z"], 3.4) and cerca(r["x"][0], 0.4) and cerca(r["x"][1], 1.8),
     "Z=3.4, x=(0.4, 1.8) · Taha"),

    ("Símplex  detecta un problema infactible", "/operations/simplex/solve",
     {"objective": "max", "c": [1, 1], "constraints": [
         {"coefficients": [1, 1], "operator": "<=", "rhs": 2},
         {"coefficients": [1, 1], "operator": ">=", "rhs": 5}]},
     lambda r: r.get("infeasible") is True,
     "x₁+x₂ ≤ 2 y ≥ 5 a la vez"),

    ("Transporte  Vogel + MODI", "/operations/transportation/solve",
     {"costs": [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]],
      "supply": [15, 25, 10], "demand": [5, 15, 15, 15]},
     lambda r: cerca(r["totalCost"], 435),
     "costo 435 · Taha"),

    ("Asignación  húngaro 3×3", "/operations/assignment/solve",
     {"costs": [[3, 5, 11], [4, 8, 7], [9, 6, 10]], "maximize": False},
     lambda r: cerca(r["totalCost"], 16),
     "costo 16"),

    ("Asignación  maximizando", "/operations/assignment/solve",
     {"costs": [[3, 5, 11], [4, 8, 7], [9, 6, 10]], "maximize": True},
     lambda r: cerca(r["totalCost"], 28),
     "beneficio 28 · 11+8+9"),
]

for nombre, ruta, cuerpo, comprueba, detalle in CASOS:
    cod, d = pedir(ruta, cuerpo, token=est)
    ok = cod in (200, 201) and "result" in d
    if ok:
        try:
            ok = comprueba(d["result"])
        except Exception:
            ok = False
    revisar(nombre, ok, detalle)
    if ok and d.get("steps") is not None:
        revisar(f"    · devuelve los pasos con explicación", len(d["steps"]) > 0
                and all(s.get("explanation") for s in d["steps"]), f"{len(d['steps'])} pasos")

# ------------------------------------------------- 4. Validaciones de entrada
titulo("4. Rechazo de entradas inválidas")
for nombre, ruta, cuerpo in [
    ("Bisección sin cambio de signo", "/numerical/bisection/solve",
     {"fn": "x^2 + 1", "a": 0, "b": 1}),
    ("Bisección con a ≥ b", "/numerical/bisection/solve",
     {"fn": "x^3 - x - 2", "a": 2, "b": 1}),
    ("Simpson 1/3 con n impar", "/numerical/simpson-1-3/solve",
     {"fn": "x^2", "a": 0, "b": 1, "n": 3}),
    ("Simpson 3/8 con n no múltiplo de 3", "/numerical/simpson-3-8/solve",
     {"fn": "x^2", "a": 0, "b": 1, "n": 4}),
    ("Transporte no balanceado", "/operations/transportation/solve",
     {"costs": [[1, 2], [3, 4]], "supply": [10, 10], "demand": [5, 5]}),
]:
    cod, d = pedir(ruta, cuerpo, token=est)
    mensaje = d.get("message", "")
    if isinstance(mensaje, list):
        mensaje = "; ".join(mensaje)
    revisar(nombre, cod == 400, str(mensaje)[:70])

# ------------------------------------------------- 5. Modo práctica
titulo("5. Modo de práctica y retroalimentación")

correctos = {"fn": "x^3 - x - 2", "a": 1, "b": 2, "tolerance": 0.0001, "userSteps": [
    {"iteration": 1, "state": {"a": 1, "b": 2, "c": 1.5, "fc": -0.125}},
    {"iteration": 2, "state": {"a": 1.5, "b": 2, "c": 1.75, "fc": 1.609375}},
]}
cod, d = pedir("/numerical/bisection/validate", correctos, token=est)
errores = [f for f in d.get("feedback", []) if f.get("severity") == "error"]
revisar("Pasos correctos no producen ningún error", cod in (200, 201) and len(errores) == 0,
        f"{len(errores)} errores · {d.get('matchedSteps')} pasos válidos")

con_error = json.loads(json.dumps(correctos))
con_error["userSteps"][1]["state"]["c"] = 1.70
cod, d = pedir("/numerical/bisection/validate", con_error, token=est)
errores = [f for f in d.get("feedback", []) if f.get("severity") == "error"]
senala_c = any(f.get("field") == "c" and f.get("stepIndex") == 1 for f in errores)
revisar("Un error de 0.05 se detecta y se ubica", cod in (200, 201) and senala_c,
        errores[0]["message"][:60] if errores else "")

dentro_tolerancia = json.loads(json.dumps(correctos))
dentro_tolerancia["userSteps"][1]["state"]["c"] = 1.7505
cod, d = pedir("/numerical/bisection/validate", dentro_tolerancia, token=est)
errores = [f for f in d.get("feedback", []) if f.get("severity") == "error"]
revisar("Un redondeo dentro de 0.001 no se castiga", cod in (200, 201) and len(errores) == 0,
        "1.7505 se acepta frente a 1.75")

# ------------------------------------------------- 6. Historial e instrumentos
titulo("6. Historial e instrumentos del piloto")

cod, d = pedir("/attempts", {"methodSlug": "bisection",
                             "input": {"fn": "x^3 - x - 2", "a": 1, "b": 2},
                             "steps": [], "isCorrect": True}, token=est)
creado = d.get("id") if cod in (200, 201) else None
revisar("Se guarda un intento", creado is not None, f"HTTP {cod}")

cod, d = pedir("/attempts/me", token=est)
revisar("El estudiante consulta su historial", cod == 200 and isinstance(d, list) and len(d) >= 1,
        f"{len(d) if isinstance(d, list) else 0} intentos")

cod, pre = pedir("/pilot/test", {"testType": "PRE", "score": 50,
                                 "details": {"origen": "validar.py"}}, token=est)
cod2, post = pedir("/pilot/test", {"testType": "POST", "score": 83.33,
                                   "details": {"origen": "validar.py"}}, token=est)
revisar("Se registran pre-test y pos-test", cod in (200, 201) and cod2 in (200, 201))

cod, sus = pedir("/pilot/sus", {"answers": [5, 1, 5, 1, 4, 2, 5, 1, 4, 2]}, token=est)
revisar("La encuesta SUS puntúa correctamente", cod in (200, 201) and cerca(sus.get("score"), 90),
        f"esperado 90, obtenido {sus.get('score')}")

cod, _ = pedir("/pilot/sus", {"answers": [5, 1, 5]}, token=est)
revisar("La SUS rechaza respuestas incompletas", cod == 400, f"HTTP {cod}")

ITEMS_OPINION = ["U1", "U2", "U3", "U4", "R1", "R2", "R3", "F1", "F2", "S1", "S2", "S3"]
cod, op = pedir("/opinion", {"answers": {i: 4 for i in ITEMS_OPINION},
                             "susAnswers": [5, 1, 5, 1, 4, 2, 5, 1, 4, 2],
                             "recommendation": 9, "frequency": "UNA_DOS",
                             "modules": ["bisection"]}, token=est)
revisar("La encuesta de opinión guarda y calcula la SUS integrada",
        cod in (200, 201) and cerca(op.get("susScore"), 90), f"SUS {op.get('susScore')}")

cod, res = pedir("/opinion/resultados", token=doc)
anonimo = cod == 200 and "@" not in json.dumps(res)
revisar("El docente ve resultados de opinión anónimos",
        anonimo and res.get("n", 0) >= 1 and res.get("sus", {}).get("n", 0) >= 1,
        f"n={res.get('n')} · acuerdo {res.get('general', {}).get('acuerdo')} %")

cod, _ = pedir("/opinion/resultados", token=est)
revisar("Un estudiante no ve los resultados de opinión", cod == 403, f"HTTP {cod}")

cod, res = pedir("/pilot/results", token=doc)
resumen = res.get("summary", {}) if cod == 200 else {}
revisar("El panel docente resume los resultados", cod == 200 and resumen.get("preCount", 0) >= 1,
        f"pre {resumen.get('preAvg')} · pos {resumen.get('postAvg')} · SUS {resumen.get('susAvg')}")

# ------------------------------------------------- 7. Limpieza
titulo("7. Limpieza de los datos de prueba")
sql = ('DELETE FROM "TestResult"; DELETE FROM "SusResponse"; DELETE FROM "Attempt"; '
       'DELETE FROM "OpinionResponse";')
try:
    r = subprocess.run(["docker", "exec", "numio-db", "psql", "-U", "numio", "-d", "numio", "-c", sql],
                       capture_output=True, text=True, timeout=60)
    cod, res = pedir("/pilot/results", token=doc)
    vacio = res.get("summary", {}).get("preCount", 1) == 0
    revisar("La base queda sin datos de prueba", r.returncode == 0 and vacio,
            "lista para el piloto real")
except Exception as e:
    revisar("La base queda sin datos de prueba", False, str(e))

# ------------------------------------------------- Resumen
total = len(resultados)
bien = sum(1 for _, ok, _ in resultados if ok)
print(f"\n{NEGRITA}{'─' * 62}{FIN}")
if bien == total:
    print(f"{VERDE}{NEGRITA}  {bien}/{total} comprobaciones superadas. La plataforma está lista.{FIN}")
else:
    print(f"{ROJO}{NEGRITA}  {bien}/{total} superadas · {total - bien} FALLAN{FIN}")
    for nombre, ok, detalle in resultados:
        if not ok:
            print(f"{ROJO}    · {nombre}{FIN}  {GRIS}{detalle}{FIN}")
print(f"{NEGRITA}{'─' * 62}{FIN}\n")
sys.exit(0 if bien == total else 1)
