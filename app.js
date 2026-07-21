// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyC97fkEWWkIjBLDpwvVxN2euhk8N7FNA40",
    authDomain: "SRM-Daniela.firebaseapp.com",
    projectId: "SRM-Daniela",
    storageBucket: "SRM-Daniela.appspot.com",
    messagingSenderId: "976335690387",
    appId: "1:976335690387:web:d01c0bf7815b379162cb66"
};

// Inicializar Firebase si aún no ha sido cargado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Inicializar Firestore y Autenticación
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. CREDENCIALES Y CONFIGURACIÓN DE EMAILJS
// ==========================================

const EMAILJS_SERVICE_ID = 'service_qhs126c';
const EMAILJS_TEMPLATE_ID = 'template_acyhfbb';
const EMAILJS_PUBLIC_KEY = 'ju9VOg1iEFoz2ny8u';

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ==========================================
// 3. REFERENCIAS Y VARIABLES GLOBALES
// ==========================================

const clientesRef = db.collection("clientes");

let clienteSeleccionadoId = null;
let datosClienteActual = null;

// ==========================================
// 4. AUTENTICACIÓN (LOGIN / LOGOUT)
// ==========================================

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginFormBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const loginError = document.getElementById('login-error');

// Control del estado de la sesión en tiempo real
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario autenticado: ocultar pantalla de login y mostrar el sistema
        if (loginContainer) loginContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
    } else {
        // Usuario no autenticado: mostrar pantalla de login y ocultar el sistema
        if (loginContainer) loginContainer.style.display = 'block';
        if (appContainer) appContainer.style.display = 'none';
    }
});

// Evento de Iniciar Sesión
if (loginFormBtn) {
    loginFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            loginError.innerText = "Por favor, ingresa correo y contraseña.";
            loginError.style.display = 'block';
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                loginError.style.display = 'none';
            })
            .catch((error) => {
                console.error("Error al iniciar sesión:", error);
                loginError.innerText = "Correo o contraseña incorrectos.";
                loginError.style.display = 'block';
            });
    });
}

// Evento de Cerrar Sesión
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}

// ==========================================
// 5. LÓGICA DE REGISTRO Y NOTIFICACIONES
// ==========================================

const registroForm = document.getElementById('registroForm');

if (registroForm) {
    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const placa = document.getElementById('placa').value.trim().toUpperCase();
        const cliente = document.getElementById('cliente').value.trim();
        const correo = document.getElementById('correo').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const vehiculo = document.getElementById('vehiculo').value.trim();
        const servicio = document.getElementById('servicio').value.trim();
        const estado = document.getElementById('estado').value;

        const nuevoRegistro = {
            placa: placa,
            cliente: cliente,
            correo: correo,
            telefono: telefono,
            vehiculo: vehiculo,
            servicio: servicio,
            estado: estado,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Guardar registro en Firestore
        clientesRef.add(nuevoRegistro)
            .then((docRef) => {
                console.log("Registro guardado con ID:", docRef.id);
                
                // Enviar notificación por correo con EmailJS
                const templateParams = {
                    to_name: cliente,
                    to_email: correo,
                    placa: placa,
                    vehiculo: vehiculo,
                    servicio: servicio,
                    estado: estado
                };

                return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
            })
            .then((response) => {
                console.log('¡Correo enviado con éxito!', response.status, response.text);
                alert("Trabajo registrado y correo de notificación enviado con éxito.");
                registroForm.reset();
            })
            .catch((error) => {
                console.error("Error en el proceso:", error);
                alert("El registro se guardó, pero hubo un detalle al enviar el correo o conectar a la BD.");
            });
    });
}
