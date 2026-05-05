const DocenteAPI = {
  async post(endpoint, payload = {}) {
    const baseUrl = window.APP_CONFIG.apiBaseUrl;

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = null;

      try {
        data = await response.json();
      } catch (error) {
        data = {
          ok: false,
          message: "La respuesta del servidor no tiene formato JSON.",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          message:
            data?.message ||
            `Error del servidor: ${response.status} ${response.statusText}`,
          raw: data,
        };
      }

      return data;
    } catch (error) {
      console.error("Error de conexión con backend:", error);

      return {
        ok: false,
        message:
          "No se pudo conectar con el backend. Puede que el endpoint todavía no exista.",
        error,
      };
    }
  },

  async validarDocente(idToken) {
    return this.post("/docente/auth", {
      idToken,
    });
  },

  async obtenerResultados({ idToken, grupo, actividadSlug, modoIntento }) {
    return this.post("/docente/resultados", {
      idToken,
      grupo: grupo || null,
      actividadSlug: actividadSlug || null,
      modoIntento: modoIntento || "ultimo",
    });
  },

  async obtenerDetalleIntento({ idToken, intentoId }) {
    return this.post("/docente/intento/detalle", {
      idToken,
      intentoId,
    });
  },

  async obtenerAnalisisActividad({ idToken, grupo, actividadSlug }) {
    return this.post("/docente/actividad/analisis", {
      idToken,
      grupo: grupo || null,
      actividadSlug,
    });
  },
};