const Usuario = require("../models/datosUsuarioModel");
//validaciones con joi
const Joi = require("joi"); //importamos joi para validaciones
const env = require("dotenv").config(); //cargamos las variables de entorno

const mostrarLogin = (req, res) => res.render("login");
const mostrarRegistro = (req, res) => res.render("registro");

const registrar = async (req, res) => {
  const { email, password, nombre, telefono } = req.body;

  const registroSchema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "El email debe ser válido",
      "string.empty": "El email es obligatorio",
    }),
    password: Joi.string().min(8).required().messages({
      "string.min": "La contraseña debe tener al menos 8 caracteres",
      "string.empty": "La contraseña es obligatoria",
    }),
    nombre: Joi.string().required().messages({
      "string.empty": "El nombre es obligatorio",
    }),
    telefono: Joi.string().required().messages({
      "string.empty": "El teléfono es obligatorio",
    }),
  });

  const { error } = registroSchema.validate(
    { email, password, nombre, telefono },
    { abortEarly: false }
  );
  if (error) {
    const mensajes = error.details.map((e) => e.message);
    return res.render("registro", { error: mensajes.join(". ") });
  }

  try {
    const existente = await Usuario.findOne({ email });

    if (existente)
      return res.render("registro", { error: "Email ya registrado" });

    const nuevoUsuario = new Usuario({ email, password, nombre, telefono });
    await nuevoUsuario.save();

    //Enviar email de bienvenida
    const nodemailer = require("nodemailer");

    // Create a test account or replace with real credentials.
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GOOGLE_CLIENT,
        pass: process.env.GOOGLE_SECRET,
      },
    });

    // Wrap in an async IIFE so we can use await.
    (async () => {
      const info = await transporter.sendMail({
        from: '"Eli Nails Salón" <paloma15@gmail.com>',
        to: email,
        subject: "Biienvenida ✔",
        text: "Hello world?", // plain‑text body
        html: `<h1>¡Bienvenido ${nombre} a Eli Nails Salón!</h1>
       <p>Gracias por registrarte. Estamos emocionados de tenerte con nosotros.</p>`,
      });

      console.log("Message sent:", info.messageId);
    })();



    req.session.usuarioId = nuevoUsuario._id;
    req.session.nombreUsuario = nuevoUsuario.nombre; //guardar el nombre en la sesion
    res.redirect("/");
  } catch (err) {
    res.status(500).render("registro", { error: "Error al registrar" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });

    const loginSchema = Joi.object({
      email: Joi.string().email().required().messages({
        "string.email": "El email debe ser válido",
        "string.empty": "El email es obligatorio",
      }),
      password: Joi.string().min(8).required().messages({
        "string.min": "La contraseña debe tener al menos 8 caracteres",
        "string.empty": "La contraseña es obligatoria",
      }),
    });

    const { error } = loginSchema.validate(
      { email, password },
      { abortEarly: false }
    );
    if (error) {
      const mensajes = error.details.map((e) => e.message);
      return res.render("login", { error: mensajes.join(". ") });
    }

    if (!usuario) {
      return res.render("login", { error: "El usuario no existe" });
    }

    const valido = await usuario.validarPassword(password);

    if (!valido) {
      return res.render("login", { error: "Contraseña incorrecta" });
    }

    req.session.usuarioId = usuario._id;
    req.session.nombreUsuario = usuario.nombre;

    res.redirect("/");
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).render("login", { error: "Error interno en el login" });
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

module.exports = {
  mostrarLogin,
  mostrarRegistro,
  registrar,
  login,
  logout,
};
