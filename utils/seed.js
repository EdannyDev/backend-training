const mongoose = require('mongoose');
const Question = require('../models/question');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const questions = [
    {
        text: "¿Cuál es la ruta correcta para acceder al módulo de ventas de menudeo en el sistema Nyx?",
        type: "opcion_multiple",
        options: [
            { text: "MENU/REPORTES/VENTAS", correct: false },
            { text: "MENU/VENTAS/VENTAS DE MENUDEO", correct: true },
            { text: "MENU/CONFIGURACIÓN/VENTAS", correct: false },
            { text: "MENU/CLIENTES/VENTAS", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Para realizar una venta en Nyx, es obligatorio registrar los datos del cliente, como nombre, dirección y correo electrónico.",
        type: "verdadero_falso",
        correctAnswer: true
    },
    {
        text: "¿Qué dato no es obligatorio registrar para procesar una venta?",
        type: "opcion_multiple",
        options: [
            { text: "Número de teléfono del cliente", correct: false },
            { text: "Nombre completo del cliente", correct: false },
            { text: "Fecha de nacimiento del cliente", correct: true },
            { text: "Dirección de entrega", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente desea factura, ¿qué información adicional se debe registrar?",
        type: "opcion_multiple",
        options: [
            { text: "Solo su dirección de entrega", correct: false },
            { text: "Su número de identificación oficial", correct: false },
            { text: "Sus datos fiscales", correct: true },
            { text: "El número de teléfono de su empresa", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Los descuentos en Nyx siempre se aplican automáticamente sin intervención del vendedor.",
        type: "verdadero_falso",
        correctAnswer: false,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Al aplicar un descuento en Nyx, ¿qué elemento siempre debe registrarse?",
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
            { text: "Enviar un correo electrónico al gerente de zona", correct: false },
            { text: "Consultar el listado de ventas en el sistema", correct: false },
            { text: "Enviar un correo a creditocobranza@ultrahogar.net", correct: true },
            { text: "Seguir el proceso de cancelación de días anteriores", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente desea cambiar un artículo comprado en días anteriores, la cancelación de la venta se solicita mediante correo electrónico a crédito y cobranza.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Cuáles son las modalidades de pago aceptadas en Ultrahogar?",
        type: "opcion_multiple",
        options: [
            { text: "Pago de contado, tarjeta parcializada y Ultracrédito", correct: true },
            { text: "Solo contado y transferencia bancaria", correct: false },
            { text: "Solo Ultracrédito y tarjetas de crédito", correct: false },
            { text: "Todas las tarjetas de crédito, incluyendo American Express", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un cliente elige pagar con tarjeta parcializada a 12 meses, se debe usar el precio lista en vez del precio oferta.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "En el módulo de promociones, ¿cómo se llaman las promociones aplicadas a pagos de contado?",
        type: "opcion_multiple",
        options: [
            { text: "Ofertas especiales", correct: false },
            { text: "Descuentos acumulables", correct: false },
            { text: "Ultraespeciales", correct: true },
            { text: "Bonificaciones", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "Si un producto es elegible para venta con póliza de garantía extendida, el sistema automáticamente la incluirá en la venta.",
        type: "verdadero_falso",
        correctAnswer: false,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Qué funcionalidad adicional ofrece el módulo de ventas en Nyx?",
        type: "opcion_multiple",
        options: [
            { text: "Registro de sucursal desde donde se opera", correct: true },
            { text: "Edición de contratos de compra-venta", correct: false },
            { text: "Creación de nuevos clientes automáticamente", correct: false },
            { text: "Registro de costos de importación de productos", correct: false }
        ],
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "En Ultrahogar, las comisiones de los vendedores no tienen tope máximo.",
        type: "verdadero_falso",
        correctAnswer: true,
        roles: ["asesor", "asesorJR"]
    },
    {
        text: "¿Dónde se puede consultar el desglose de comisiones y bonos ganados por un vendedor?",
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
        text: "¿Dónde puedes cambiar tu contraseña en el sistema Nyx?",
        type: "opcion_multiple",
        options: [
            { text: "En la sección 'Cambiar contraseña' en el menú despegable", correct: true },
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
        text: "Para cerrar sesión en Nyx, debes:",
        type: "opcion_multiple",
        options: [
            { text: "Hacer clic en 'Cerrar sesión' en el botón del lado derecho superior", correct: true },
            { text: "Apagar la computadora", correct: false },
            { text: "Esperar a que el sistema cierre automáticamente", correct: false },
            { text: "Desconectar el internet", correct: false }
        ],
        roles: ["asesor", "asesorJR", "gerente_sucursal", "gerente_zona"]
    },
    {
        text: "¿Por qué es importante cerrar sesión cuando terminas de usar Nyx?",
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