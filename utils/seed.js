const mongoose = require('mongoose');
const Question = require('../models/question');
require('dotenv').config();

if (!/localhost|127\.0\.0\.1/.test(process.env.MONGODB_URI || '')) {
  console.error('El seed borra todas las preguntas; solo se permite contra una base local.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI);

const questions = [
    {
        text: "¿Cuál es la ruta correcta para acceder al módulo de reportes de ventas en el ERP?",
        type: "opcion_multiple",
        options: [
            { text: "MENU/CONFIGURACIÓN/REPORTES", correct: false },
            { text: "MENU/VENTAS/REPORTES DE VENTAS", correct: true },
            { text: "MENU/CLIENTES/REPORTES", correct: false },
            { text: "MENU/AYUDA/REPORTES", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Para registrar una nueva venta, es obligatorio capturar los datos básicos de contacto del cliente.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Qué dato no es obligatorio al momento de registrar una venta?",
        type: "opcion_multiple",
        options: [
            { text: "Número de contacto del cliente", correct: false },
            { text: "Nombre completo del cliente", correct: false },
            { text: "Fecha de nacimiento del cliente", correct: true },
            { text: "Dirección de entrega", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente solicita factura, ¿qué información adicional debe registrarse?",
        type: "opcion_multiple",
        options: [
            { text: "Solo su dirección de entrega", correct: false },
            { text: "Su número de identificación oficial", correct: false },
            { text: "Sus datos fiscales", correct: true },
            { text: "El teléfono de su empresa", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Los descuentos en el sistema siempre se aplican automáticamente, sin intervención del asesor.",
        type: "verdadero_falso",
        correctAnswer: false,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Al aplicar un descuento, ¿qué elemento siempre debe registrarse en el sistema?",
        type: "opcion_multiple",
        options: [
            { text: "El motivo del descuento", correct: true },
            { text: "La cantidad total de productos vendidos", correct: false },
            { text: "La forma de pago utilizada", correct: false },
            { text: "El nombre del gerente de zona", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Para cancelar una venta realizada el mismo día, ¿qué paso no es necesario?",
        type: "opcion_multiple",
        options: [
            { text: "Consultar el listado de ventas del día", correct: false },
            { text: "Verificar el motivo de la cancelación con el cliente", correct: false },
            { text: "Solicitar autorización directa a Recursos Humanos", correct: true },
            { text: "Registrar la cancelación en el sistema", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente desea cambiar un artículo adquirido en días anteriores, la solicitud debe canalizarse por correo al área correspondiente.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Cuáles son las modalidades de pago generalmente aceptadas en el sistema?",
        type: "opcion_multiple",
        options: [
            { text: "Pago de contado, tarjeta a meses y crédito interno", correct: true },
            { text: "Solo contado y transferencia bancaria", correct: false },
            { text: "Solo crédito interno y tarjetas de débito", correct: false },
            { text: "Únicamente pagos en efectivo", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente elige pagar a meses con tarjeta, se debe usar el precio de lista en lugar del precio de oferta.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "En el módulo de promociones, ¿cómo se identifican las promociones exclusivas para pagos de contado?",
        type: "opcion_multiple",
        options: [
            { text: "Ofertas especiales", correct: false },
            { text: "Descuentos acumulables", correct: false },
            { text: "Promociones de contado", correct: true },
            { text: "Bonificaciones", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un producto es elegible para garantía extendida, el sistema la agrega automáticamente a la venta sin confirmación.",
        type: "verdadero_falso",
        correctAnswer: false,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Qué funcionalidad adicional ofrece el módulo de ventas en el ERP?",
        type: "opcion_multiple",
        options: [
            { text: "Registro de la sucursal desde donde se opera", correct: true },
            { text: "Edición de contratos de compra-venta", correct: false },
            { text: "Creación automática de nuevos clientes", correct: false },
            { text: "Registro de costos de importación", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Las comisiones de los asesores no tienen un tope máximo establecido.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Dónde se puede consultar el desglose de comisiones y bonos ganados por un asesor?",
        type: "opcion_multiple",
        options: [
            { text: "En la sección de Listado de Ventas", correct: false },
            { text: "En el perfil del usuario dentro del sistema", correct: false },
            { text: "En el módulo de Recursos Humanos", correct: false },
            { text: "En MENU/REPORTES/VENTAS/LISTADO DE VENTAS", correct: true }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Dónde puedes cambiar tu contraseña dentro del ERP?",
        type: "opcion_multiple",
        options: [
            { text: "En la sección 'Cambiar contraseña' del menú desplegable", correct: true },
            { text: "En el módulo de ventas", correct: false },
            { text: "Desde la pantalla de inicio de sesión", correct: false },
            { text: "No se puede cambiar la contraseña", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    },
    {
        text: "Si olvidaste tu contraseña, ¿qué debes hacer?",
        type: "opcion_multiple",
        options: [
            { text: "Contactar a soporte técnico", correct: true },
            { text: "Crear una nueva cuenta", correct: false },
            { text: "Esperar a que el sistema te envíe una nueva contraseña", correct: false },
            { text: "No puedes recuperarla", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    },
    {
        text: "Para cerrar sesión en el ERP, debes:",
        type: "opcion_multiple",
        options: [
            { text: "Hacer clic en 'Cerrar sesión' en el botón superior derecho", correct: true },
            { text: "Apagar la computadora", correct: false },
            { text: "Esperar a que el sistema cierre automáticamente", correct: false },
            { text: "Desconectar el internet", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    },
    {
        text: "¿Por qué es importante cerrar sesión al terminar de usar el ERP?",
        type: "opcion_multiple",
        options: [
            { text: "Para evitar accesos no autorizados", correct: true },
            { text: "Para liberar espacio en el servidor", correct: false },
            { text: "Para que el sistema guarde automáticamente los cambios", correct: false },
            { text: "No es necesario cerrar sesión", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    },
    {
        text: "Si usas un equipo compartido, ¿qué precaución debes tomar al cerrar sesión?",
        type: "opcion_multiple",
        options: [
            { text: "Verificar que tu sesión realmente se cerró", correct: true },
            { text: "Apagar la computadora", correct: false },
            { text: "Cerrar el navegador", correct: false },
            { text: "No es necesario tomar precauciones", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    }
];

const loadQuestions = async () => {
    try {
        await Question.deleteMany({});
        await Question.insertMany(questions);
        console.log("Preguntas insertadas correctamente.");
    } catch (error) {
        console.error("Error insertando preguntas:", error);
    } finally {
        mongoose.connection.close();
    }
};

loadQuestions();