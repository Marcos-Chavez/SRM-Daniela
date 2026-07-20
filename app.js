// =================================================================
// 1. CREDENCIALES GLOBALES DE EMAILJS Y CONFIGURACIÓN GENERAL
// =================================================================
const EMAILJS_SERVICE_ID = 'service_qhsl26c';
const EMAILJS_TEMPLATE_ID = 'template_acyhfbb';
const EMAILJS_PUBLIC_KEY = 'ju9VOg1iEFoz2ny8u';

// La variable 'db' ya viene creada globalmente desde firebaseConfig.js
const clientesRef = db.collection("clientes");

// Variables globales para el control del modal
let clienteSeleccionadoId = null;
let datosClienteActual = null; 

// Colocar por defecto la fecha de hoy en el formulario para ahorrar tiempo al mecánico
document.getElementById('fechaMantenimiento').value = new Date().toISOString().split('T')[0];
// Variable global temporal para guardar los datos del último registro procesado para el PDF
let ultimoRegistroProcesado = null;

// =================================================================
// DETECTION: Buscar placa en tiempo real y auto-completar
// =================================================================
document.getElementById("placa").addEventListener("input", async (e) => {
    const placaIngresada = e.target.value.trim().toUpperCase();
    
    if (placaIngresada.length >= 3) { // Buscar cuando tenga al menos 3 caracteres
        try {
            const snapshot = await clientesRef.where("placa", "==", placaIngresada).get();
            
            if (!snapshot.empty) {
                const datos = snapshot.docs[0].data();
                
                // Auto-rellenar campos
                document.getElementById("nombre").value = datos.nombre;
                document.getElementById("correo").value = datos.correo;
                document.getElementById("whatsapp").value = datos.whatsapp;
                document.getElementById("vehiculo").value = datos.vehiculo;
                
                // Deshabilitar campos para que el mecánico no los modifique por error
                document.getElementById("nombre").disabled = true;
                document.getElementById("correo").disabled = true;
                document.getElementById("whatsapp").disabled = true;
                document.getElementById("vehiculo").disabled = true;
                
                // Cambiar estilo visual para denotar bloqueo seguro
                document.getElementById("nombre").style.backgroundColor = "#e1e8ed";
                document.getElementById("correo").style.backgroundColor = "#e1e8ed";
                document.getElementById("whatsapp").style.backgroundColor = "#e1e8ed";
                document.getElementById("vehiculo").style.backgroundColor = "#e1e8ed";
            } else {
                // Si se borra o la placa no existe, liberar los campos para registro nuevo
                liberarCamposFormulario();
            }
        } catch (error) {
            console.error("Error al buscar placa en tiempo real:", error);
        }
    } else {
        liberarCamposFormulario();
    }
});

function liberarCamposFormulario() {
    document.getElementById("nombre").disabled = false;
    document.getElementById("correo").disabled = false;
    document.getElementById("whatsapp").disabled = false;
    document.getElementById("vehiculo").disabled = false;
    
    document.getElementById("nombre").style.backgroundColor = "#fff";
    document.getElementById("correo").style.backgroundColor = "#fff";
    document.getElementById("whatsapp").style.backgroundColor = "#fff";
    document.getElementById("vehiculo").style.backgroundColor = "#fff";
}

// =================================================================
// 2. EVENTO: Cuando el mecánico envía el formulario de registro
// =================================================================
document.getElementById("registroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const placa = document.getElementById("placa").value.trim().toUpperCase();
    const vehiculo = document.getElementById("vehiculo").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const fechaFormulario = document.getElementById("fechaMantenimiento").value;
    const tipoServicio = document.getElementById("tipoServicio").value;
    const comentario = document.getElementById("comentarioServicio").value.trim();

    // Formatear la nota estructurada con la fecha elegida
    const fechaEspanol = new Date(fechaFormulario + 'T00:00:00').toLocaleDateString('es-ES');
    const nuevaNota = `[${fechaEspanol} - ${tipoServicio.toUpperCase()}]: ${comentario}`;

    try {
        const snapshot = await clientesRef.where("placa", "==", placa).get();
        let datosFinalesParaPDF = null;

        if (!snapshot.empty) {
            // 🔄 LA PLACA YA EXISTE: Mantenemos sus fechas originales si es reparación
            const docId = snapshot.docs[0].id;
            const datosExistentes = snapshot.docs[0].data();
            
            let historialActualizado = nuevaNota;
            if (datosExistentes.descripcion) {
                historialActualizado = nuevaNota + "\n\n" + datosExistentes.descripcion;
            }

            let datosAEnviar = {
                descripcion: historialActualizado
            };

            if (tipoServicio === "Mantenimiento") {
                // Si es mantenimiento, SÍ recalculamos la alerta (ej: 105 días)
                const fechaBase = new Date(fechaFormulario);
                fechaBase.setDate(fechaBase.getDate() + 105); // Modifica aquí los días de conteo si lo deseas
                const nuevaFechaAlerta = fechaBase.toISOString().split('T')[0];

                datosAEnviar.fechaMantenimiento = fechaFormulario;
                datosAEnviar.fechaAlerta = nuevaFechaAlerta;
                datosAEnviar.notificado = false;
            } else {
                // Si es REPARACIÓN, dejamos intactas las fechas y alertas previas
                datosAEnviar.fechaMantenimiento = datosExistentes.fechaMantenimiento;
                datosAEnviar.fechaAlerta = datosExistentes.fechaAlerta;
                datosAEnviar.notificado = datosExistentes.notificado;
            }

            await clientesRef.doc(docId).update(datosAEnviar);
            
            datosFinalesParaPDF = {
                nombre: datosExistentes.nombre,
                vehiculo: datosExistentes.vehiculo,
                placa: placa,
                whatsapp: datosExistentes.whatsapp,
                descripcion: historialActualizado
            };

            alert(`✅ ¡Trabajo registrado con éxito en el historial de la placa [${placa}]!`);

        } else {
            // 🆕 LA PLACA NO EXISTE: Registro de cliente completamente nuevo
            let fechaAlertaFinal = "";
            let esNotificado = false;

            if (tipoServicio === "Mantenimiento") {
                const fechaBase = new Date(fechaFormulario);
                fechaBase.setDate(fechaBase.getDate() + 105); // Modifica aquí los días de conteo si lo deseas
                fechaAlertaFinal = fechaBase.toISOString().split('T')[0];
                esNotificado = false;
            } else {
                fechaAlertaFinal = "2099-12-31"; // Sin alertas activas si entra directo por reparación
                esNotificado = true; 
            }

            const nuevoCliente = {
                placa: placa,
                vehiculo: vehiculo,
                nombre: nombre,
                correo: correo,
                whatsapp: whatsapp,
                descripcion: nuevaNota,
                fechaMantenimiento: fechaFormulario,
                fechaAlerta: fechaAlertaFinal, 
                notificado: esNotificado
            };

            await clientesRef.add(nuevoCliente);
            datosFinalesParaPDF = nuevoCliente;

            alert(`✅ ¡Cliente y vehículo registrados con éxito en el sistema!`);
        }

        // Guardar en la variable global para la ejecución del PDF
        ultimoRegistroProcesado = datosFinalesParaPDF;

        // Preguntar automáticamente si desea el PDF de comprobante
        if (confirm("¿Deseas descargar el historial actualizado en formato PDF ahora mismo?")) {
            ejecutarDescargaPDFDirecta();
        }

        // Limpiar el formulario y reestablecer estados normales
        document.getElementById("registroForm").reset();
        document.getElementById('fechaMantenimiento').value = new Date().toISOString().split('T')[0];
        document.getElementById('tipoServicio').value = "Mantenimiento";
        liberarCamposFormulario();

    } catch (error) {
        console.error("Error al procesar la operación: ", error);
        alert("Hubo un error al conectar con la base de datos.");
    }
});

// Función interna adaptada para generar el PDF desde el formulario principal
function ejecutarDescargaPDFDirecta() {
    if (!ultimoRegistroProcesado) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text("HISTORIAL DE MANTENIMIENTO AUTOMOTRIZ", 14, 20);

    doc.setDrawColor(241, 196, 15);
    doc.setLineWidth(1);
    doc.line(14, 24, 196, 24);

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    
    doc.text(`Cliente:`, 14, 34);
    doc.setFont("helvetica", "normal");
    doc.text(`${ultimoRegistroProcesado.nombre}`, 45, 34);

    doc.setFont("helvetica", "bold");
    doc.text(`Vehículo:`, 14, 41);
    doc.setFont("helvetica", "normal");
    doc.text(`${ultimoRegistroProcesado.vehiculo}`, 45, 41);

    doc.setFont("helvetica", "bold");
    doc.text(`Placa / Matrícula:`, 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${ultimoRegistroProcesado.placa}`, 45, 48);

    doc.setFont("helvetica", "bold");
    doc.text(`WhatsApp:`, 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${ultimoRegistroProcesado.whatsapp}`, 45, 55);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 62, 196, 62);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text("ÚLTIMOS TRABAJOS REALIZADOS EN EL TALLER", 14, 71);

    const todasLasNotas = ultimoRegistroProcesado.descripcion.split("\n\n");
    const ultimas5Notas = todasLasNotas.slice(0, 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    let ejeY = 82;
    ultimas5Notas.forEach((nota, index) => {
        const lineasTexto = doc.splitTextToSize(`${index + 1}. ${nota}`, 180);
        doc.text(lineasTexto, 14, ejeY);
        ejeY += (lineasTexto.length * 6) + 6; 
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 275, 196, 275);
    doc.setFontSize(9);
    doc.setTextColor(127, 135, 143);
    doc.text(`Documento oficial de control interno - Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 282);

    doc.save(`Historial_${ultimoRegistroProcesado.placa}.pdf`);
}
// =================================================================
// 3. FUNCIÓN: Cargar y Escuchar la base de datos en tiempo real (TABLA)
// =================================================================
clientesRef.onSnapshot((snapshot) => {
    const tabla = document.getElementById("tablaClientes");
    tabla.innerHTML = ""; 

    if(snapshot.empty) {
        tabla.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay clientes registrados aún.</td></tr>`;
        return;
    }

    snapshot.forEach((doc) => {
        const cliente = doc.data();
        const id = doc.id;

        const fechaUltimo = new Date(cliente.fechaMantenimiento);
        const fechaProxima = new Date(fechaUltimo);
        fechaProxima.setDate(fechaProxima.getDate() + 105); 

        const fechaHoy = new Date();
        const diferenciaTiempo = fechaProxima - fechaHoy;
        const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

        let badgeClass = "badge-green";
        let estadoTexto = `Al día (${diasRestantes} días rest.)`;

        if (diasRestantes <= 0) {
            badgeClass = "badge-red";
            estadoTexto = "⚠️ Tiempo Cumplido (Alerta)";

            if (cliente.notificado === false && cliente.correo) {
                clientesRef.doc(id).update({ notificado: true });
                enviarRecordatorioCliente(cliente.nombre, cliente.correo, cliente.vehiculo, cliente.placa);
            }
        } else if (diasRestantes <= 15) {
            badgeClass = "badge-yellow";
            estadoTexto = "⏳ Próximo a vencer";
        }

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><strong>${cliente.nombre}</strong></td>
            <td><span style="background: #f1c40f; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #ccc;">${cliente.placa || 'S/P'}</span><br><small style="color:#555">${cliente.vehiculo}</small></td>
            <td>${cliente.whatsapp}<br><small style="color:#777">${cliente.correo}</small></td>
            <td>${cliente.fechaMantenimiento}</td>
            <td>${fechaProxima.toISOString().split('T')[0]}</td>
            <td><span class="badge ${badgeClass}">${estadoTexto}</span></td>
            <td>
                <button class="btn-action" onclick="abrirModalHistorial('${id}', '${cliente.placa}')" style="background-color: #3498db;" title="Ver notas o bitácora de este auto">📝 Notas</button>
                <button class="btn-action" onclick="renovarVisita('${id}')" title="Reiniciar conteo hoy">➕ Visita</button>
                <a href="https://wa.me/${cliente.whatsapp}" target="_blank">
                    <button class="btn-action btn-ws" title="Abrir chat de WhatsApp">💬 Chat</button>
                </a>
                <button class="btn-action" onclick="eliminarRegistro('${id}', '${cliente.placa}')" style="background-color: #e74c3c;" title="Eliminar registro mal hecho">🗑️ Borrar</button>
            </td>
        `;
        tabla.appendChild(fila);
    });
});

// =================================================================
// 4. FUNCIONES CONTROLADORAS: Panel de Control del Historial (Modal)
// =================================================================
window.abrirModalHistorial = function(id, placa) {
    clienteSeleccionadoId = id;
    document.getElementById("modalPlaca").innerText = placa;
    document.getElementById("nuevaNotaInput").value = "";
    
    clientesRef.doc(id).get().then((doc) => {
        if (doc.exists) {
            datosClienteActual = doc.data(); 
            const contenedor = document.getElementById("notasContenedor");
            contenedor.innerText = datosClienteActual.descripcion || "No hay notas previas registradas para este vehículo.";
        }
        document.getElementById("modalHistorial").style.display = "flex";
    }).catch((error) => {
        console.error("Error al cargar notas: ", error);
    });
}

window.cerrarModalHistorial = function() {
    document.getElementById("modalHistorial").style.display = "none";
    clienteSeleccionadoId = null;
    datosClienteActual = null;
}

document.getElementById("btnGuardarNota").addEventListener("click", async () => {
    const textoNota = document.getElementById("nuevaNotaInput").value.trim();
    if (!textoNota) {
        alert("Por favor, escribe una anotación antes de guardar.");
        return;
    }

    const hoy = new Date().toLocaleDateString('es-ES');
    const contenedorActual = document.getElementById("notasContenedor").innerText;
    
    let nuevoHistorial = `[${hoy}]: ${textoNota}`;
    if (contenedorActual && contenedorActual !== "No hay notas previas registradas para este vehículo.") {
        nuevoHistorial = nuevoHistorial + "\n\n" + contenedorActual;
    }

    try {
        await clientesRef.doc(clienteSeleccionadoId).update({
            descripcion: nuevoHistorial
        });
        alert("📝 Nota agregada correctamente a la bitácora del vehículo.");
        cerrarModalHistorial();
    } catch (error) {
        console.error("Error al actualizar la nota en Firebase: ", error);
        alert("No se pudo guardar la nota.");
    }
});

// 👈 CONFIGURACIÓN MODIFICADA: Generación y descarga en formato PDF profesional
document.getElementById("btnDescargarHistorial").addEventListener("click", () => {
    if (!datosClienteActual || !datosClienteActual.descripcion) {
        alert("No hay historial disponible para descargar.");
        return;
    }

    // Instanciar jsPDF usando la sintaxis global de la versión 2.x
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Encabezado del Taller
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); // Color azul oscuro
    doc.text("HISTORIAL DE MANTENIMIENTO AUTOMOTRIZ", 14, 20);

    // Línea divisoria decorativa
    doc.setDrawColor(241, 196, 15); // Color amarillo mecánico
    doc.setLineWidth(1);
    doc.line(14, 24, 196, 24);

    // 2. Ficha Técnica del Vehículo y Cliente
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    
    doc.text(`Cliente:`, 14, 34);
    doc.setFont("helvetica", "normal");
    doc.text(`${datosClienteActual.nombre}`, 45, 34);

    doc.setFont("helvetica", "bold");
    doc.text(`Vehículo:`, 14, 41);
    doc.setFont("helvetica", "normal");
    doc.text(`${datosClienteActual.vehiculo}`, 45, 41);

    doc.setFont("helvetica", "bold");
    doc.text(`Placa / Matrícula:`, 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${datosClienteActual.placa}`, 45, 48);

    doc.setFont("helvetica", "bold");
    doc.text(`WhatsApp:`, 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${datosClienteActual.whatsapp}`, 45, 55);

    // Otra línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 62, 196, 62);

    // 3. Título de los Mantenimientos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text("TRABAJOS REALIZADOS EN EL TALLER", 14, 71);

    // 4. Procesar y acomodar las últimas 5 notas en el lienzo PDF
    const todasLasNotas = datosClienteActual.descripcion.split("\n\n");
    const ultimas5Notas = todasLasNotas.slice(0, 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    let ejeY = 82; // Posición vertical inicial para el texto de las notas

    ultimas5Notas.forEach((nota, index) => {
        // splitTextToSize divide el texto automáticamente si es más largo que el ancho de la página (180mm)
        const lineasTexto = doc.splitTextToSize(`${index + 1}. ${nota}`, 180);
        
        doc.text(lineasTexto, 14, ejeY);
        
        // Calculamos el espacio dinámico que ocupó la nota para bajar el puntero del eje Y
        ejeY += (lineasTexto.length * 6) + 6; 
    });

    // 5. Pie de página con fecha de impresión
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 275, 196, 275);
    doc.setFontSize(9);
    doc.setTextColor(127, 135, 143);
    doc.text(`Documento oficial de control interno - Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 282);

    // Descarga directa del archivo PDF en el ordenador o móvil
    doc.save(`Historial_${datosClienteActual.placa}.pdf`);
});

// =================================================================
// 5. FUNCIÓN: Botón rápido para renovar visita al día de hoy
// =================================================================
window.renovarVisita = function(id) {
    const hoy = new Date().toISOString().split('T')[0];
    
    if(confirm("¿Confirmas que este vehículo está realizando un nuevo mantenimiento hoy? Esto reiniciará el conteo y habilitará futuras alertas.")) {
        clientesRef.doc(id).update({
            fechaMantenimiento: hoy,
            notificado: false 
        })
        .then(() => {
            alert("🔄 Conteo reiniciado con éxito para este vehículo.");
        })
        .catch((error) => {
            console.error("Error al actualizar la visita: ", error);
        });
    }
}

// =================================================================
// 6. FUNCIÓN: Buscador en tiempo real de la tabla
// =================================================================
window.filtrarTabla = function() {
    const buscarTexto = document.getElementById("buscador").value.toLowerCase();
    const filas = document.getElementById("tablaClientes").getElementsByTagName("tr");

    for (let i = 0; i < filas.length; i++) {
        const celdaTexto = filas[i].innerText.toLowerCase();
        if (celdaTexto.includes(buscarTexto)) {
            filas[i].style.display = "";
        } else {
            filas[i].style.display = "none";
        }
    }
}

// =================================================================
// 7. FUNCIÓN: Botón para eliminar el registro de Firebase por completo
// =================================================================
window.eliminarRegistro = function(id, placa) {
    if (confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente el vehículo con placa [${placa}]? Esta acción no se puede deshacer.`)) {
        
        clientesRef.doc(id).delete()
        .then(() => {
            alert(`🗑️ El registro con placa ${placa} ha sido eliminado correctamente de la base de datos.`);
        })
        .catch((error) => {
            console.error("Error al eliminar el documento de Firebase: ", error);
            alert("No se pudo eliminar el registro. Revisa la consola.");
        });
    }
}

// =================================================================
// 8. FUNCIÓN INTERNA: Envío de correo electrónico vía EmailJS
// =================================================================
function enviarRecordatorioCliente(nombre, correo, vehiculo, placa) {
    const templateParams = {
        nombre: nombre,
        correo: correo,
        vehiculo: vehiculo,
        placa: placa
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
        .then(function(response) {
            console.log('¡Correo enviado con éxito!', response.status, response.text);
        }, function(error) {
            console.error('Error al enviar el correo:', error);
        });
}



// ==========================================
// CONFIGURACIÓN DE AUTENTICACIÓN (LOGIN)
// ==========================================

// Inicializar el servicio de autenticación de Firebase
const auth = firebase.auth();

// Referencias a los elementos de la interfaz
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginFormBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const loginError = document.getElementById('login-error');

// Escuchar cambios en la sesión en tiempo real
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario conectado: Muestra la app y oculta la pantalla de Login
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        // Usuario desconectado: Muestra la pantalla de Login y oculta la app
        loginContainer.style.display = 'block';
        appContainer.style.display = 'none';
    }
});

// Evento para Iniciar Sesión al hacer clic en el botón
loginFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
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

// Evento para Cerrar Sesión
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}
