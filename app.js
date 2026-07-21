// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyC97fkEWWkIjBLDpwvVxN2euhk8N7FNA40",
    authDomain: "srm-daniela.firebaseapp.com",
    projectId: "srm-daniela",
    storageBucket: "srm-daniela.firebasestorage.app",
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

if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ==========================================
// 3. REFERENCIAS Y VARIABLES GLOBALES
// ==========================================

const clientesRef = db.collection("clientes");

let clienteSeleccionadoId = null;
let datosClienteActual = null;
let ultimoRegistroProcesado = null;

// Protección para la fecha en el formulario si el campo existe en HTML
const campoFecha = document.getElementById('fechaMantenimiento');
if (campoFecha) {
    campoFecha.value = new Date().toISOString().split('T')[0];
}

// ==========================================
// 4. AUTENTICACIÓN Y CONTROL DE VISTAS (LOGIN / LOGOUT)
// ==========================================

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginFormBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const loginError = document.getElementById('login-error');

// Monitoreo de sesión de usuario en tiempo real
auth.onAuthStateChanged((user) => {
    if (user) {
        if (loginContainer) loginContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
    } else {
        if (loginContainer) loginContainer.style.display = 'block';
        if (appContainer) appContainer.style.display = 'none';
    }
});

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

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}

// ==========================================
// 5. REGISTRO DE TRABAJOS Y ENVÍO DE NOTIFICACIONES
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

        clientesRef.add(nuevoRegistro)
            .then((docRef) => {
                console.log("Registro guardado con ID:", docRef.id);
                
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
                if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];
            })
            .catch((error) => {
                console.error("Error en el proceso:", error);
                alert("El registro se guardó, pero hubo un detalle al enviar el correo.");
            });
    });
}

// ==========================================
// 6. BÚSQUEDA POR PLACA E HISTORIAL
// ==========================================

const btnBuscar = document.getElementById('btnBuscarPlaca');
if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
        const placaBuscar = document.getElementById('buscarPlaca').value.trim().toUpperCase();
        const contenedorResultado = document.getElementById('resultadoBusqueda');

        if (!placaBuscar) {
            alert("Ingresa una placa para buscar.");
            return;
        }

        clientesRef.where("placa", "==", placaBuscar)
            .orderBy("fechaRegistro", "desc")
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    contenedorResultado.innerHTML = `<p style="color: #dc2626; font-weight: bold;">No se encontraron registros para la placa ${placaBuscar}.</p>`;
                    return;
                }

                let html = `<h3>Historial de Mantenimientos - Placa: ${placaBuscar}</h3>`;
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const fecha = data.fechaRegistro ? new Date(data.fechaRegistro.toDate()).toLocaleDateString('es-PA') : 'Reciente';

                    html += `
                        <div style="border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; margin-bottom: 10px; background: #f9fafb;">
                            <p><strong>Cliente:</strong> ${data.cliente}</p>
                            <p><strong>Vehículo:</strong> ${data.vehiculo}</p>
                            <p><strong>Servicio:</strong> ${data.servicio}</p>
                            <p><strong>Estado:</strong> <span style="font-weight: bold; color: #2563eb;">${data.estado}</span></p>
                            <p><strong>Fecha:</strong> ${fecha}</p>
                            <button onclick="abrirModalActualizacion('${doc.id}', '${data.cliente}', '${data.correo}', '${data.placa}', '${data.vehiculo}', '${data.servicio}', '${data.estado}')" style="width: auto; padding: 6px 12px; font-size: 13px; margin-top: 5px;">Actualizar Estado</button>
                        </div>
                    `;
                });

                contenedorResultado.innerHTML = html;
            })
            .catch((error) => {
                console.error("Error al buscar vehículo:", error);
                alert("Ocurrió un error al realizar la búsqueda.");
            });
    });
}

// ==========================================
// 7. MODAL Y ACTUALIZACIÓN DE ESTADO CON NOTIFICACIÓN
// ==========================================

window.abrirModalActualizacion = function(id, cliente, correo, placa, vehiculo, servicio, estadoActual) {
    clienteSeleccionadoId = id;
    datosClienteActual = { cliente, correo, placa, vehiculo, servicio };

    const selectEstadoModal = document.getElementById('nuevoEstadoModal');
    if (selectEstadoModal) {
        selectEstadoModal.value = estadoActual;
    }

    const modal = document.getElementById('modalActualizar');
    if (modal) {
        modal.style.display = 'block';
    }
};

window.cerrarModal = function() {
    const modal = document.getElementById('modalActualizar');
    if (modal) {
        modal.style.display = 'none';
    }
};

const btnGuardarModal = document.getElementById('btnGuardarEstadoModal');
if (btnGuardarModal) {
    btnGuardarModal.addEventListener('click', () => {
        const nuevoEstado = document.getElementById('nuevoEstadoModal').value;

        if (!clienteSeleccionadoId) return;

        clientesRef.doc(clienteSeleccionadoId).update({
            estado: nuevoEstado,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            const templateParams = {
                to_name: datosClienteActual.cliente,
                to_email: datosClienteActual.correo,
                placa: datosClienteActual.placa,
                vehiculo: datosClienteActual.vehiculo,
                servicio: datosClienteActual.servicio,
                estado: nuevoEstado
            };

            return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        })
        .then(() => {
            alert("Estado actualizado y notificación enviada al cliente.");
            cerrarModal();
            const btnBuscar = document.getElementById('btnBuscarPlaca');
            if (btnBuscar) btnBuscar.click(); // Refrescar la búsqueda
        })
        .catch((error) => {
            console.error("Error al actualizar estado:", error);
            alert("Se actualizó el estado pero hubo un problema enviando la notificación.");
        });
});
