import test from "node:test";
import assert from "node:assert/strict";

const elements = {
  deliveryActivityFilter: { value: "" },
  deliveryGroupFilter: { value: "" },
  deliveryBlockFilter: { value: "" },
  deliveryStudentFilter: { value: "" },
  deliveriesStatus: { textContent: "" },
  deliveriesTableBody: { innerHTML: "", querySelectorAll: () => [] },
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
