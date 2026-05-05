const AuthService = {
  idToken: null,
  docente: null,

  init() {
    this.idToken = sessionStorage.getItem(window.APP_CONFIG.storageKey);

    this.bindLogout();

    if (this.idToken) {
      this.intentarRestaurarSesion();
    }

    this.initGoogleLogin();
  },

  initGoogleLogin() {
    const container = document.getElementById("googleLoginContainer");

    if (!container) return;

    if (!window.google || !window.google.accounts) {
      this.setMessage(
        "Cargando servicios de Google... Si demora, recargá la página.",
        "info",
      );

      setTimeout(() => this.initGoogleLogin(), 600);
      return;
    }

    const clientId = window.APP_CONFIG.googleClientId;

    if (!clientId || clientId.includes("PEGAR_AQUI")) {
      this.setMessage(
        "Falta configurar el Google Client ID en config.js.",
        "error",
      );
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this.handleGoogleResponse(response),
    });

    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 280,
    });
  },

  async intentarRestaurarSesion() {
    const payload = this.decodeJwt(this.idToken);

    if (!payload?.email) {
      this.logout();
      return;
    }

    const autorizado = this.esDocenteAutorizado(payload.email);

    if (!autorizado) {
      this.logout();
      return;
    }

    this.docente = {
      email: payload.email,
      nombre: payload.name || payload.given_name || "Docente",
    };

    this.mostrarPanel();
  },

  async handleGoogleResponse(response) {
    const idToken = response?.credential;

    if (!idToken) {
      this.setMessage("No se recibió credencial de Google.", "error");
      return;
    }

    this.setMessage("Validando acceso docente...", "info");

    const payload = this.decodeJwt(idToken);

    if (!payload?.email) {
      this.setMessage("No se pudo leer el correo de la cuenta.", "error");
      return;
    }

    /*
      Primero intentamos validar contra backend.
      Como todavía no creamos el endpoint docente, puede fallar.
    */
    const backendValidation = await DocenteAPI.validarDocente(idToken);

    if (backendValidation.ok) {
      this.idToken = idToken;
      this.docente = backendValidation.docente || {
        email: payload.email,
        nombre: payload.name || payload.given_name || "Docente",
      };

      sessionStorage.setItem(window.APP_CONFIG.storageKey, idToken);

      this.setMessage("Acceso autorizado.", "success");
      this.mostrarPanel();
      return;
    }

    /*
      Modo desarrollo:
      permite avanzar visualmente mientras creamos el backend docente.
    */
    if (window.APP_CONFIG.desarrolloSinBackendDocente) {
      const autorizado = this.esDocenteAutorizado(payload.email);

      if (autorizado) {
        console.warn(
          "Acceso docente validado solo en frontend. Falta endpoint backend real.",
        );

        this.idToken = idToken;
        this.docente = {
          email: payload.email,
          nombre: payload.name || payload.given_name || "Docente",
        };

        sessionStorage.setItem(window.APP_CONFIG.storageKey, idToken);

        this.setMessage("Acceso autorizado en modo desarrollo.", "success");
        this.mostrarPanel();
        return;
      }
    }

    this.setMessage(
      "No estás autorizado para acceder al panel docente.",
      "error",
    );
  },

  esDocenteAutorizado(email) {
    const docentes = window.APP_CONFIG.docentesAutorizados || [];

    return docentes.some(
      (docenteEmail) =>
        docenteEmail.trim().toLowerCase() === email.trim().toLowerCase(),
    );
  },

  mostrarPanel() {
    const loginView = document.getElementById("loginView");
    const dashboardView = document.getElementById("dashboardView");
    const userArea = document.getElementById("userArea");
    const userEmail = document.getElementById("userEmail");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginView) loginView.hidden = true;
    if (dashboardView) dashboardView.hidden = false;

    if (userArea) userArea.hidden = false;
    if (logoutBtn) logoutBtn.hidden = false;

    if (userEmail && this.docente?.email) {
      userEmail.textContent = this.docente.email;
    }

    if (window.App) {
      window.App.initAfterLogin();
    }
  },

  logout() {
    this.idToken = null;
    this.docente = null;

    sessionStorage.removeItem(window.APP_CONFIG.storageKey);

    const loginView = document.getElementById("loginView");
    const dashboardView = document.getElementById("dashboardView");
    const userArea = document.getElementById("userArea");
    const userEmail = document.getElementById("userEmail");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginView) loginView.hidden = false;
    if (dashboardView) dashboardView.hidden = true;

    if (userArea) userArea.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (userEmail) userEmail.textContent = "";

    this.setMessage("", "info");
  },

  bindLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
      this.logout();
    });
  },

  setMessage(text, type = "info") {
    const message = document.getElementById("loginMessage");

    if (!message) return;

    message.textContent = text || "";
    message.className = "message";

    if (type === "error") message.classList.add("error");
    if (type === "success") message.classList.add("success");
  },

  decodeJwt(token) {
    try {
      const payloadBase64 = token.split(".")[1];

      const payloadJson = atob(
        payloadBase64.replace(/-/g, "+").replace(/_/g, "/"),
      );

      return JSON.parse(decodeURIComponent(escape(payloadJson)));
    } catch (error) {
      console.error("No se pudo decodificar el token:", error);
      return null;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  AuthService.init();
});