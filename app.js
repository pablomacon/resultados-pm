const App = {
  resultadosOriginales: [],
  resultadosFiltrados: [],
  sortKey: "fecha_intento",
  sortDirection: "desc",
  initialized: false,
  cuestionariosCargados: new Map(),
  entregasOriginales: [],
  entregas: [],

  urlsCuestionarios: {
    "iterativas-java-03":
      "https://actividades.profemacon.net/2026/pi/iterativas/03/quiz-data.js",
    "iterativas-java-04":
      "https://actividades.profemacon.net/2026/pi/iterativas/04/quiz-data.js",
  },

  initAfterLogin() {
    if (this.initialized) {
      this.cargarResultados();
      this.cargarEntregas();
      return;
    }

    this.initialized = true;

    this.bindEvents();
    this.cargarResultados();
    this.cargarEntregas();
  },

  bindEvents() {
    const refreshBtn = document.getElementById("refreshBtn");
    const groupFilter = document.getElementById("groupFilter");
    const activityFilter = document.getElementById("activityFilter");
    const attemptModeFilter = document.getElementById("attemptModeFilter");
    const studentSearch = document.getElementById("studentSearch");
    const loadAnalysisBtn = document.getElementById("loadAnalysisBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const attemptModal = document.getElementById("attemptModal");
    const refreshDeliveriesBtn = document.getElementById("refreshDeliveriesBtn");
    const deliveryFilters = ["deliveryActivityFilter", "deliveryGroupFilter", "deliveryBlockFilter", "deliveryStudentFilter"];

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.cargarResultados());
    }

    if (refreshDeliveriesBtn) refreshDeliveriesBtn.addEventListener("click", () => this.cargarEntregas());
    deliveryFilters.forEach((id) => document.getElementById(id)?.addEventListener("change", () => this.aplicarFiltrosEntregas()));

    if (groupFilter) {
      groupFilter.addEventListener("change", () => this.cargarResultados());
    }

    if (activityFilter) {
      activityFilter.addEventListener("change", () => this.cargarResultados());
    }

    if (attemptModeFilter) {
      attemptModeFilter.addEventListener("change", () =>
        this.cargarResultados(),
      );
    }

    if (studentSearch) {
      studentSearch.addEventListener("input", () => {
        this.aplicarFiltroLocal();
        this.render();
      });
    }

    if (loadAnalysisBtn) {
      loadAnalysisBtn.addEventListener("click", () =>
        this.cargarAnalisisPorPregunta(),
      );
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => this.cerrarModal());
    }

    if (attemptModal) {
      attemptModal.addEventListener("click", (event) => {
        if (event.target === attemptModal) {
          this.cerrarModal();
        }
      });
    }

    document.querySelectorAll(".sort-button").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.sort;
        this.ordenarPor(sortKey);
      });
    });
  },

  getFiltros() {
    return {
      grupo: document.getElementById("groupFilter")?.value || "",
      actividadSlug: document.getElementById("activityFilter")?.value || "",
      modoIntento:
        document.getElementById("attemptModeFilter")?.value || "ultimo",
      busqueda: document.getElementById("studentSearch")?.value || "",
    };
  },

  async cargarResultados() {
    const tableStatus = document.getElementById("tableStatus");

    if (tableStatus) {
      tableStatus.textContent = "Cargando resultados...";
    }

    const filtros = this.getFiltros();

    const response = await DocenteAPI.obtenerResultados({
      idToken: AuthService.idToken,
      grupo: filtros.grupo,
      actividadSlug: filtros.actividadSlug,
      modoIntento: filtros.modoIntento,
    });

    if (!response.ok) {
      console.warn("No se pudieron cargar resultados:", response.message);

      this.resultadosOriginales = [];

      if (tableStatus) {
        tableStatus.textContent =
          "Todavía no hay datos cargados desde backend docente.";
      }

      this.aplicarFiltroLocal();
      this.render();
      return;
    }

    this.resultadosOriginales = response.resultados || [];

    this.cargarOpcionesDeFiltros();
    this.aplicarFiltroLocal();
    this.render();
  },

  cargarOpcionesDeFiltros() {
    const groupFilter = document.getElementById("groupFilter");
    const activityFilter = document.getElementById("activityFilter");

    if (!groupFilter || !activityFilter) return;

    const grupoActual = groupFilter.value;
    const actividadActual = activityFilter.value;

    const grupos = [
      ...new Set(
        this.resultadosOriginales
          .map((item) => item.grupo)
          .filter(Boolean)
          .sort(),
      ),
    ];

    const actividadesMap = new Map();

    this.resultadosOriginales.forEach((item) => {
      if (item.actividad_slug) {
        actividadesMap.set(item.actividad_slug, item.actividad_titulo);
      }
    });

    groupFilter.innerHTML = `<option value="">Todos los grupos</option>`;

    grupos.forEach((grupo) => {
      const option = document.createElement("option");
      option.value = grupo;
      option.textContent = grupo;
      groupFilter.appendChild(option);
    });

    groupFilter.value = grupoActual;

    activityFilter.innerHTML = `<option value="">Todas las actividades</option>`;

    [...actividadesMap.entries()]
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .forEach(([slug, titulo]) => {
        const option = document.createElement("option");
        option.value = slug;
        option.textContent = titulo || slug;
        activityFilter.appendChild(option);
      });

    activityFilter.value = actividadActual;
  },

  aplicarFiltroLocal() {
    const { busqueda } = this.getFiltros();
    const busquedaNormalizada = this.normalizarTexto(busqueda);

    this.resultadosFiltrados = this.resultadosOriginales.filter((item) => {
      if (!busquedaNormalizada) return true;

      const nombreCompleto = this.normalizarTexto(
        `${item.nombre || ""} ${item.apellido || ""}`,
      );

      return nombreCompleto.includes(busquedaNormalizada);
    });

    this.aplicarOrden();
  },

  ordenarPor(sortKey) {
    if (this.sortKey === sortKey) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortKey = sortKey;
      this.sortDirection = "asc";
    }

    this.aplicarOrden();
    this.render();
  },

  aplicarOrden() {
    const direction = this.sortDirection === "asc" ? 1 : -1;

    this.resultadosFiltrados.sort((a, b) => {
      const valueA = a[this.sortKey];
      const valueB = b[this.sortKey];

      if (this.sortKey === "porcentaje" || this.sortKey === "numero_intento") {
        return (Number(valueA || 0) - Number(valueB || 0)) * direction;
      }

      if (this.sortKey === "fecha_intento") {
        return (
          (new Date(valueA || 0).getTime() -
            new Date(valueB || 0).getTime()) *
          direction
        );
      }

      return (
        String(valueA || "").localeCompare(String(valueB || ""), "es") *
        direction
      );
    });
  },

  render() {
    this.renderTabla();
    this.renderResumen();
  },

  renderTabla() {
    const tbody = document.getElementById("resultsTableBody");
    const tableStatus = document.getElementById("tableStatus");

    if (!tbody) return;

    if (!this.resultadosFiltrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">
            No hay resultados para mostrar.
          </td>
        </tr>
      `;

      if (tableStatus) {
        tableStatus.textContent =
          "No hay resultados cargados o no coinciden con los filtros.";
      }

      return;
    }

    tbody.innerHTML = this.resultadosFiltrados
      .map((item) => this.renderFilaResultado(item))
      .join("");

    tbody.querySelectorAll("[data-intento-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const intentoId = button.dataset.intentoId;
        this.abrirDetalleIntento(intentoId);
      });
    });

    if (tableStatus) {
      tableStatus.textContent = `${this.resultadosFiltrados.length} resultado(s) mostrado(s).`;
    }
  },

  renderFilaResultado(item) {
    const porcentaje = Number(item.porcentaje || 0);
    const scoreClass = this.getScoreClass(porcentaje);
    const rowClass = this.getRowClass(porcentaje);

    return `
      <tr class="${rowClass}">
        <td>${this.escapeHtml(item.nombre || "")}</td>
        <td>${this.escapeHtml(item.apellido || "")}</td>
        <td>${this.escapeHtml(item.grupo || "")}</td>
        <td>${this.escapeHtml(item.actividad_titulo || item.actividad_slug || "")}</td>
        <td>${this.escapeHtml(item.numero_intento || "")}</td>
        <td>
          <span class="score-pill ${scoreClass}">
            ${porcentaje.toFixed(0)}%
          </span>
        </td>
        <td>${this.escapeHtml(item.juicio || "")}</td>
        <td>${this.formatearFecha(item.fecha_intento)}</td>
        <td>
          <button class="detail-button" data-intento-id="${item.intento_id}">
            Ver
          </button>
        </td>
      </tr>
    `;
  },

  renderResumen() {
    const averageValue = document.getElementById("averageValue");
    const attemptsValue = document.getElementById("attemptsValue");
    const greenValue = document.getElementById("greenValue");
    const yellowValue = document.getElementById("yellowValue");
    const redValue = document.getElementById("redValue");

    const resultados = this.resultadosFiltrados;

    if (!resultados.length) {
      if (averageValue) averageValue.textContent = "--";
      if (attemptsValue) attemptsValue.textContent = "0";
      if (greenValue) greenValue.textContent = "0";
      if (yellowValue) yellowValue.textContent = "0";
      if (redValue) redValue.textContent = "0";
      return;
    }

    const porcentajes = resultados.map((item) => Number(item.porcentaje || 0));

    const promedio =
      porcentajes.reduce((acc, value) => acc + value, 0) / porcentajes.length;

    const verdes = porcentajes.filter((value) => value >= 60).length;
    const amarillos = porcentajes.filter(
      (value) => value >= 40 && value < 60,
    ).length;
    const rojos = porcentajes.filter((value) => value < 40).length;

    if (averageValue) averageValue.textContent = `${promedio.toFixed(0)}%`;
    if (attemptsValue) attemptsValue.textContent = String(resultados.length);
    if (greenValue) greenValue.textContent = String(verdes);
    if (yellowValue) yellowValue.textContent = String(amarillos);
    if (redValue) redValue.textContent = String(rojos);
  },

  async cargarEntregas() {
    const status = document.getElementById("deliveriesStatus");
    if (status) status.textContent = "Cargando entregas...";
    const response = await DocenteAPI.obtenerEntregas({ idToken: AuthService.idToken });
    if (!response.ok) {
      this.entregasOriginales = [];
      this.entregas = [];
      if (status) status.textContent = response.message || "No se pudieron cargar las entregas.";
      this.renderEntregas();
      return;
    }
    this.entregasOriginales = response.entregas || [];
    this.cargarOpcionesEntregas();
    this.aplicarFiltrosEntregas();
  },

  cargarOpcionesEntregas() {
    const activitySelect = document.getElementById("deliveryActivityFilter");
    const groupSelect = document.getElementById("deliveryGroupFilter");
    const blockSelect = document.getElementById("deliveryBlockFilter");
    const studentSelect = document.getElementById("deliveryStudentFilter");
    if (!activitySelect || !groupSelect || !blockSelect || !studentSelect) return;

    const current = {
      activity: activitySelect.value,
      group: groupSelect.value,
      block: blockSelect.value,
      student: studentSelect.value,
    };
    const activities = new Map();
    const students = new Map();
    this.entregasOriginales.forEach((item) => {
      if (item.actividad_slug) activities.set(item.actividad_slug, item.actividad_titulo || item.actividad_slug);
      if (item.estudiante_id) students.set(String(item.estudiante_id), `${item.apellido || ""}, ${item.nombre || ""}${item.grupo ? ` · ${item.grupo}` : ""}`);
    });

    this.cargarSelectEntrega(activitySelect, "Todas las actividades", [...activities.entries()].sort((a, b) => a[1].localeCompare(b[1])), current.activity);
    this.cargarSelectEntrega(groupSelect, "Todos los grupos", [...new Set(this.entregasOriginales.map((item) => item.grupo).filter(Boolean))].sort().map((value) => [value, value]), current.group);
    this.cargarSelectEntrega(blockSelect, "Todos los bloques", [...new Set(this.entregasOriginales.map((item) => Number(item.bloque)).filter(Number.isFinite))].sort((a, b) => a - b).map((value) => [String(value), `Bloque ${value}`]), current.block);
    this.cargarSelectEntrega(studentSelect, "Todos los estudiantes", [...students.entries()].sort((a, b) => a[1].localeCompare(b[1])), current.student);
  },

  cargarSelectEntrega(select, allLabel, entries, selectedValue) {
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = allLabel;
    select.appendChild(allOption);
    entries.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = entries.some(([value]) => String(value) === String(selectedValue)) ? selectedValue : "";
  },

  aplicarFiltrosEntregas() {
    const activity = document.getElementById("deliveryActivityFilter")?.value || "";
    const group = document.getElementById("deliveryGroupFilter")?.value || "";
    const block = document.getElementById("deliveryBlockFilter")?.value || "";
    const student = document.getElementById("deliveryStudentFilter")?.value || "";
    this.entregas = this.entregasOriginales.filter((item) =>
      (!activity || item.actividad_slug === activity) &&
      (!group || item.grupo === group) &&
      (!block || String(item.bloque) === block) &&
      (!student || String(item.estudiante_id) === student)
    );
    this.renderEntregas();
  },

  renderEntregas() {
    const body = document.getElementById("deliveriesTableBody");
    const status = document.getElementById("deliveriesStatus");
    if (!body) return;
    if (!this.entregas.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty-cell">No hay entregas para los filtros seleccionados.</td></tr>';
      if (status) status.textContent = this.entregasOriginales.length ? "No hay entregas que coincidan con los filtros seleccionados." : "No hay entregas registradas.";
      return;
    }
    body.innerHTML = this.entregas.map((item) => `<tr>
      <td>${this.escapeHtml(`${item.apellido || ""}, ${item.nombre || ""}`)}</td>
      <td>${this.escapeHtml(item.grupo || "")}</td>
      <td>${this.escapeHtml(item.actividad_titulo || item.actividad_slug || "")}</td>
      <td>${this.escapeHtml(item.numero_ejercicio)}</td>
      <td>${this.escapeHtml(item.bloque)}</td>
      <td>${this.escapeHtml(item.numero_version)}</td>
      <td><span class="delivery-type ${item.tipo_evidencia === "texto" ? "text" : ""}">${item.tipo_evidencia === "texto" ? "Código escrito" : "Archivo"}</span></td>
      <td>${this.formatearFecha(item.fecha_entrega)}</td>
      <td><button class="detail-button" data-delivery-id="${item.entrega_id}">Ver</button></td>
    </tr>`).join("");
    body.querySelectorAll("[data-delivery-id]").forEach((button) => button.addEventListener("click", () => this.abrirDetalleEntrega(button.dataset.deliveryId)));
    if (status) status.textContent = `${this.entregas.length} entrega(s) mostrada(s).`;
  },

  abrirDetalleEntrega(id) {
    const item = this.entregas.find((delivery) => String(delivery.entrega_id) === String(id));
    const modal = document.getElementById("attemptModal");
    const title = document.getElementById("modalTitle");
    const subtitle = document.getElementById("modalSubtitle");
    const content = document.getElementById("attemptDetailContent");
    if (!item || !modal || !content) return;
    if (title) title.textContent = `Entrega · Ejercicio ${item.numero_ejercicio}`;
    if (subtitle) subtitle.textContent = `${item.apellido}, ${item.nombre} · ${item.actividad_titulo || item.actividad_slug} · Bloque ${item.bloque} · Versión ${item.numero_version}`;
    const drive = item.drive_file_id ? `<p><strong>Archivo:</strong> ${this.escapeHtml(item.nombre_original || "")} · <a class="drive-link" target="_blank" rel="noopener" href="https://drive.google.com/open?id=${encodeURIComponent(item.drive_file_id)}">Abrir en Drive</a></p>` : "";
    const code = item.codigo_texto ? `<h3>Código escrito</h3><pre class="code-preview">${this.escapeHtml(item.codigo_texto)}</pre>` : "";
    content.innerHTML = `<section class="detail-summary"><article class="detail-summary-item"><span>Actividad</span><strong>${this.escapeHtml(item.actividad_titulo || item.actividad_slug)}</strong></article><article class="detail-summary-item"><span>Grupo</span><strong>${this.escapeHtml(item.grupo)}</strong></article><article class="detail-summary-item"><span>Fecha</span><strong>${this.formatearFecha(item.fecha_entrega)}</strong></article><article class="detail-summary-item"><span>Evidencia</span><strong>${this.escapeHtml(item.tipo_evidencia)}</strong></article></section><section class="answer-list">${drive}${code}<h3>Respuesta para explicar</h3><p>${this.escapeHtml(item.respuesta_explicacion)}</p></section>`;
    modal.hidden = false;
  },

  async abrirDetalleIntento(intentoId) {
    const modal = document.getElementById("attemptModal");
    const content = document.getElementById("attemptDetailContent");

    if (!modal || !content) return;

    modal.hidden = false;

    content.innerHTML = `
      <p class="empty-state">Cargando detalle...</p>
    `;

    const response = await DocenteAPI.obtenerDetalleIntento({
      idToken: AuthService.idToken,
      intentoId,
    });

    if (!response.ok) {
      content.innerHTML = `
        <p class="empty-state">
          Todavía no se pudo cargar el detalle desde backend docente.
        </p>
      `;
      return;
    }

    const preguntas = await this.cargarCuestionario(
      response.intento?.actividad_slug,
    );

    content.innerHTML = this.renderDetalleIntento(response, preguntas);
  },

  cargarCuestionario(slug) {
    const url = this.urlsCuestionarios[slug];

    if (!url) return Promise.resolve([]);
    if (this.cuestionariosCargados.has(slug)) {
      return this.cuestionariosCargados.get(slug);
    }

    const carga = new Promise((resolve) => {
      const script = document.createElement("script");
      const datosPrevios = window.QUIZ_DATA;

      script.src = url;
      script.onload = () => {
        const preguntas = Array.isArray(window.QUIZ_DATA?.preguntas)
          ? window.QUIZ_DATA.preguntas
          : [];
        window.QUIZ_DATA = datosPrevios;
        script.remove();
        resolve(preguntas);
      };
      script.onerror = () => {
        window.QUIZ_DATA = datosPrevios;
        script.remove();
        resolve([]);
      };
      document.head.appendChild(script);
    });

    this.cuestionariosCargados.set(slug, carga);
    return carga;
  },

  textoRespuesta(preguntas, numeroPregunta, respuesta) {
    const pregunta = preguntas.find(
      (item) => Number(item.numero) === Number(numeroPregunta),
    );
    const valores = String(respuesta || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!pregunta || !valores.length) return respuesta || "";

    const textos = valores
      .map((valor) =>
        (pregunta.opciones || []).find((opcion) => opcion.valor === valor)
          ?.texto,
      )
      .filter(Boolean);

    return textos.length === valores.length ? textos.join(" · ") : respuesta || "";
  },

  renderDetalleIntento(data, preguntas = []) {
    const intento = data.intento || {};
    const respuestas = data.respuestas || [];

    const porcentaje = Number(intento.porcentaje || 0);
    const scoreClass = this.getScoreClass(porcentaje);

    const respuestasHtml = respuestas.length
      ? respuestas
          .map((respuesta) => this.renderRespuesta(respuesta, preguntas))
          .join("")
      : `<p class="empty-state">No hay respuestas registradas para este intento.</p>`;

    return `
      <section class="detail-summary">
        <article class="detail-summary-item">
          <span>Estudiante</span>
          <strong>${this.escapeHtml(`${intento.nombre || ""} ${intento.apellido || ""}`)}</strong>
        </article>

        <article class="detail-summary-item">
          <span>Grupo</span>
          <strong>${this.escapeHtml(intento.grupo || "")}</strong>
        </article>

        <article class="detail-summary-item">
          <span>Resultado</span>
          <strong>
            <span class="score-pill ${scoreClass}">
              ${porcentaje.toFixed(0)}%
            </span>
          </strong>
        </article>

        <article class="detail-summary-item">
          <span>Fecha</span>
          <strong>${this.formatearFecha(intento.fecha_intento || intento.fecha)}</strong>
        </article>
      </section>

      <section class="answer-list">
        ${respuestasHtml}
      </section>
    `;
  },

  renderRespuesta(respuesta, preguntas) {
    const correcta = Boolean(respuesta.es_correcta);

    return `
      <article class="answer-card ${correcta ? "correct" : "incorrect"}">
        <h3>Pregunta ${this.escapeHtml(respuesta.numero_pregunta || "")}</h3>

        <p>
          <strong>Enunciado:</strong>
          ${this.escapeHtml(respuesta.enunciado_pregunta || "")}
        </p>

        <p>
          <strong>Respuesta dada:</strong>
          ${this.escapeHtml(
            this.textoRespuesta(
              preguntas,
              respuesta.numero_pregunta,
              respuesta.respuesta_dada,
            ),
          )}
        </p>

        <p>
          <strong>Respuesta correcta:</strong>
          ${this.escapeHtml(
            this.textoRespuesta(
              preguntas,
              respuesta.numero_pregunta,
              respuesta.respuesta_correcta,
            ),
          )}
        </p>

        <p>
          <strong>Estado:</strong>
          ${correcta ? "Correcta" : "Incorrecta"}
        </p>
      </article>
    `;
  },

  cerrarModal() {
    const modal = document.getElementById("attemptModal");

    if (modal) {
      modal.hidden = true;
    }
  },

  async cargarAnalisisPorPregunta() {
    const container = document.getElementById("questionAnalysisContainer");
    const filtros = this.getFiltros();

    if (!container) return;

    if (!filtros.actividadSlug) {
      container.innerHTML = `
        <p class="empty-state">
          Primero seleccioná una actividad.
        </p>
      `;
      return;
    }

    container.innerHTML = `
      <p class="empty-state">Cargando análisis por pregunta...</p>
    `;

    const response = await DocenteAPI.obtenerAnalisisActividad({
      idToken: AuthService.idToken,
      grupo: filtros.grupo,
      actividadSlug: filtros.actividadSlug,
    });

    if (!response.ok) {
      container.innerHTML = `
        <p class="empty-state">
          Todavía no se pudo cargar el análisis desde backend docente.
        </p>
      `;
      return;
    }

    const preguntas = response.preguntas || [];

    if (!preguntas.length) {
      container.innerHTML = `
        <p class="empty-state">
          No hay datos de preguntas para esta actividad.
        </p>
      `;
      return;
    }

    container.innerHTML = preguntas
      .map((pregunta) => this.renderAnalisisPregunta(pregunta))
      .join("");
  },

  renderAnalisisPregunta(pregunta) {
    const porcentaje = Number(pregunta.porcentaje_acierto || 0);
    const barColorClass = this.getQuestionBarClass(porcentaje);

    return `
      <article class="question-row">
        <div class="question-title">
          Pregunta ${this.escapeHtml(pregunta.numero_pregunta || "")}
        </div>

        <div class="question-bar">
          <div
            class="question-bar-fill ${barColorClass}"
            style="width: ${Math.max(0, Math.min(100, porcentaje))}%"
          ></div>
        </div>

        <div class="question-percent">
          ${porcentaje.toFixed(0)}%
        </div>
      </article>
    `;
  },

  getScoreClass(porcentaje) {
    if (porcentaje < 40) return "score-red";
    if (porcentaje < 60) return "score-yellow";
    if (porcentaje < 80) return "score-green";
    return "score-strong-green";
  },

  getRowClass(porcentaje) {
    if (porcentaje < 40) return "row-red";
    if (porcentaje < 60) return "row-yellow";
    if (porcentaje < 80) return "row-green";
    return "row-strong-green";
  },

  getQuestionBarClass(porcentaje) {
    if (porcentaje < 40) return "bar-red";
    if (porcentaje < 60) return "bar-yellow";
    return "bar-green";
  },

  formatearFecha(fecha) {
    if (!fecha) return "";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("es-UY", {
      dateStyle: "short",
      timeStyle: "short",
    });
  },

  normalizarTexto(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  },

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },
};

window.App = App;
