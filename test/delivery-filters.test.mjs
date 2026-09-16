import test from "node:test";
import assert from "node:assert/strict";

const elements = {
  deliveryActivityFilter: { value: "" },
  deliveryGroupFilter: { value: "" },
  deliveryBlockFilter: { value: "" },
  deliveryStudentFilter: { value: "" },
  deliveriesStatus: { textContent: "" },
  deliveriesTableBody: { innerHTML: "", querySelectorAll: () => [] },
  tableStatus: { textContent: "" },
  resultsTableBody: { innerHTML: "", querySelectorAll: () => [] },
};

globalThis.window = {};
globalThis.document = { getElementById: (id) => elements[id] || null };
await import("../app.js");

const deliveries = [
  { entrega_id: 1, estudiante_id: 10, nombre: "Ana", apellido: "Pérez", grupo: "1MG", actividad_slug: "arreglos", actividad_titulo: "Arreglos", bloque: 1, numero_ejercicio: 1, numero_version: 1, tipo_evidencia: "texto", fecha_entrega: "2026-09-15T20:00:00Z" },
  { entrega_id: 2, estudiante_id: 10, nombre: "Ana", apellido: "Pérez", grupo: "1MG", actividad_slug: "arreglos", actividad_titulo: "Arreglos", bloque: 2, numero_ejercicio: 11, numero_version: 1, tipo_evidencia: "archivo", fecha_entrega: "2026-09-15T21:00:00Z" },
  { entrega_id: 3, estudiante_id: 20, nombre: "Luis", apellido: "Gómez", grupo: "1MF", actividad_slug: "strings", actividad_titulo: "Strings", bloque: 1, numero_ejercicio: 3, numero_version: 1, tipo_evidencia: "texto", fecha_entrega: "2026-09-15T22:00:00Z" },
];

test("combines activity, group, block and student filters", () => {
  window.App.entregasOriginales = deliveries;
  elements.deliveryActivityFilter.value = "arreglos";
  elements.deliveryGroupFilter.value = "1MG";
  elements.deliveryBlockFilter.value = "2";
  elements.deliveryStudentFilter.value = "10";

  window.App.aplicarFiltrosEntregas();

  assert.deepEqual(window.App.entregas.map((item) => item.entrega_id), [2]);
  assert.match(elements.deliveriesStatus.textContent, /1 entrega/);
});

test("shows every delivery when filters are cleared", () => {
  Object.values(elements).slice(0, 4).forEach((element) => { element.value = ""; });
  window.App.aplicarFiltrosEntregas();
  assert.equal(window.App.entregas.length, 3);
});

test("shows 25 result rows by default and can show all", () => {
  window.App.resultadosFiltrados = Array.from({ length: 263 }, (_, index) => ({
    intento_id: index + 1,
    nombre: `Estudiante ${index + 1}`,
    apellido: "Prueba",
    grupo: "1MG",
    actividad_titulo: "Actividad",
    numero_intento: 1,
    porcentaje: 80,
    juicio: "Logrado",
    fecha_intento: "2026-09-16T12:00:00Z",
  }));
  window.App.rowLimit = 25;

  window.App.renderTabla();

  assert.equal((elements.resultsTableBody.innerHTML.match(/<tr/g) || []).length, 25);
  assert.equal(elements.tableStatus.textContent, "Mostrando 25 de 263 resultados.");

  window.App.rowLimit = Infinity;
  window.App.renderTabla();
  assert.equal((elements.resultsTableBody.innerHTML.match(/<tr/g) || []).length, 263);
  assert.equal(elements.tableStatus.textContent, "263 resultado(s) mostrado(s).");
});
