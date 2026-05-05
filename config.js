window.APP_CONFIG = {
  apiBaseUrl: "https://backend-ejercicios-pm.vercel.app/api",

  // Usar el mismo Client ID de Google que ya usás en las actividades.
  googleClientId:
    "593049746670-phfmkb7ed6dbr48bpo268r8agc41jj6h.apps.googleusercontent.com",

  // Cuenta docente autorizada.
  docentesAutorizados: ["pablomacon@gmail.com"],

  // Clave para guardar sesión docente en el navegador.
  storageKey: "pm_docente_id_token",

  /*
    Mientras todavía no creamos los endpoints docentes en el backend,
    permitimos validar provisoriamente del lado del frontend.

    IMPORTANTE:
    Esto sirve solo para desarrollo visual y pruebas iniciales.
    La seguridad real la vamos a hacer luego en backend.
  */
  desarrolloSinBackendDocente: false,
};
