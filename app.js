// Importar dependencias
const express = require("express");
const session = require("express-session");
const mysql = require("mysql");
const path = require("path");
const bcrypt = require("bcrypt");
const { render } = require("ejs");
// Configuración de Express
const app = express();
const port = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "concesionario";
const DB_PORT = process.env.DB_PORT || "3306";

app.use(
  session({
    secret: "secret-key", // Cambia esto por una cadena de caracteres aleatoria y segura
    resave: false,
    saveUninitialized: true,
  })
);

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// Agregar middleware para analizar el cuerpo de las peticiones como JSON
app.use(bodyParser.json());

// Configuración de la base de datos
const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT
});

// Conexión a la base de datos
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Conexión exitosa a la base de datos MySQL");
});

// Configurar EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rutas
app.get("/", (req, res) => {
  // Obtener datos de vehículos de la base de datos
  db.query("SELECT * FROM vehiculos", (err, results) => {
    if (err) {
      throw err;
    }
    // Obtener el usuario de la sesión
    const usuario = req.session.usuario;

    // Renderizar la vista index.ejs y pasar los datos de los vehículos y el usuario
    res.render("index", { usuario: usuario, vehiculos: results });
  });
});

app.get("/search", (req, res) => {
  const searchTerm = req.query.term;
  // Realiza la búsqueda en la base de datos según el término de búsqueda
  // y envía los resultados como respuesta en formato JSON
});

app.get("/vehiculo", (req, res) => {
  // Obtener datos de vehículos de la base de datos
  db.query("SELECT * FROM vehiculos", (err, results) => {
    if (err) {
      res.status(500).send("Error interno del servidor");
    } else {
      // Obtener el usuario de la sesión
      const usuario = req.session.usuario;

      // Renderizar la vista de vehículos y pasar los datos de los vehículos y el usuario
      res.render("vehiculo", { vehiculos: results, usuario: usuario });
    }
  });
});

app.post("/cotizacion", (req, res) => {
  const { nombre, email, telefono, mensaje, vehiculoId } = req.body;
  // Aquí puedes enviar los datos de la cotización a través de WhatsApp
});

// Ruta para la página de registro
app.get("/registro", (req, res) => {
  res.render("registro"); // Renderizar la vista de registro
});

// Ruta para el registro de usuarios
app.post("/registro", async (req, res) => {
  const {
    nombre,
    email,
    contraseña,
    rol,
    passwordAdmin,
    montoVendedorInput,
    aceptarTerminos,
  } = req.body;

  if (rol === "admin") {
    const contraseñaAdminCorrecta = "12345"; // Aquí debes colocar la contraseña de administrador correcta
    if (passwordAdmin !== contraseñaAdminCorrecta) {
      return res.status(400).send(`
      <script>
        alert("Contraseña de administrador incorrecta");
        window.location.href = "/registro"; // Redirige al usuario de nuevo a la página de registro
      </script>
    `);
    }
  } else if (rol === "vendedor") {
    const costoVendedor = 500000;
    if (!montoVendedorInput || montoVendedorInput < costoVendedor) {
      return res.status(400).send(`
        <script>
          alert("El monto ingresado debe ser mayor a ${costoVendedor}");
          window.location.href = "/registro"; // Redirige al usuario de nuevo a la página de registro
        </script> ${costoVendedor}`);
    }
  } else if (!aceptarTerminos) {
    return res.status(400).send(`
      <script>
        alert("Debe aceptar los términos y condiciones para registrarse");
        window.location.href = "/registro"; // Redirige al usuario de nuevo a la página de registro
      </script>
    `);
  }
  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Verificar si el correo electrónico ya está en uso
    db.query(
      "SELECT * FROM usuarios WHERE email = ? OR nombre = ?",
      [email, nombre],
      (error, resultados) => {
        if (error) {
          res.status(500).send("Error interno del servidor");
        } else if (resultados.length > 0) {
          res.status(400).send(`
  <script>
    alert("El correo electrónico o el nombre de usuario ya están en uso");
    window.location.href = "/registro"; // Redirige al usuario de nuevo a la página de registro
  </script>
  `);
        } else {
          // Guardar el nuevo usuario en la base de datos con la contraseña hasheada
          db.query(
            "INSERT INTO usuarios (nombre, email, contraseña, rol) VALUES (?, ?, ?, ?)",
            [nombre, email, hashedPassword, rol],
            (error, resultado) => {
              if (error) {
                return res
                  .status(500)
                  .send("Error interno del servidor al guardar datos");
              }
              res.redirect("/inicio-sesion");
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error al hashear la contraseña:", error);
    res.status(500).send("Error interno del servidor al hashear la contraseña");
  }
});

app.get("/vehiculo", (req, res) => {
  // Verificar si el usuario ha iniciado sesión
  if (req.session.usuario) {
    // Obtener los vehículos de alguna fuente, por ejemplo, desde la base de datos
    const vehiculos = obtenerVehiculos(); // Aquí debes implementar tu lógica para obtener los vehículos

    // Obtener el usuario de la sesión
    const usuario = req.session.usuario;

    // Renderizar la vista vehiculo.ejs y pasar los vehículos y el usuario
    res.render("vehiculo", { vehiculos: vehiculos, usuario: usuario });
  } else {
    // Si el usuario no ha iniciado sesión, redirigir a la página de inicio de sesión
    res.redirect("/inicio-sesion");
  }
});

// Ruta para la página de inicio de sesión
app.get("/inicio-sesion", (req, res) => {
  // Verificar si el usuario ha iniciado sesión
  if (req.session.usuario) {
    // Si el usuario ha iniciado sesión, redirigir a vehiculo.ejs
    res.redirect("/vehiculo");
  } else {
    // Si el usuario no ha iniciado sesión, renderizar la página de inicio de sesión
    res.render("inicio-sesion");
  }
});

// Ruta para el inicio de sesión de usuarios
app.post("/inicio-sesion", (req, res) => {
  const { email, contraseña } = req.body;
  // Buscar al usuario en la base de datos por su correo electrónico
  db.query(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    async (error, resultados) => {
      if (error) {
        res.status(500).send("Error interno del servidor");
      } else if (resultados.length === 0) {
        res.status(401).send(`
              <script>
                  alert("El correo electrónico o la contraseña son incorrectas, por favor vuelve a intentarlo");
                  window.location.href = "/inicio-sesion"; // Redirige al usuario de nuevo a la página de inicio de sesion
              </script>
              `);
      } else {
        // Verificar la contraseña utilizando bcrypt
        const contraseñaHash = resultados[0].contraseña;
        const contraseñaValida = await bcrypt.compare(
          contraseña,
          contraseñaHash
        );
        if (!contraseñaValida) {
          res.status(401).send(`
                  <script>
                      alert("El correo electrónico o la contraseña son incorrectas, por favor vuelve a intentarlo");
                      window.location.href = "/inicio-sesion"; // Redirige al usuario de nuevo a la página de inicio de sesion
                  </script>
                  `);
        } else {
          // Obtener el rol del usuario
          const rol = resultados[0].rol;
          // Iniciar sesión y guardar el nombre de usuario y el rol en la sesión
          req.session.usuario = { nombre: resultados[0].nombre, rol: rol };
          res.redirect("/vehiculo"); // Redirige a la página principal o a donde desees
        }
      }
    }
  );
});

app.post("/inicio-sesion", (req, res) => {
  // Verificar las credenciales del usuario y obtener el nombre de usuario
  const nombreDeUsuario = obtenerNombreDeUsuarioAlAutenticar(
    req.body.email,
    req.body.contraseña
  ); // Esta función debería verificar las credenciales y devolver el nombre de usuario

  // Guardar el nombre de usuario en la sesión
  req.session.usuario = { nombre: nombreDeUsuario };

  // Redirigir al usuario a la página principal después de iniciar sesión
  res.redirect("/vehiculo");
});

app.post("/agregar-vehiculo", (req, res) => {
  const { marca, modelo, descripcion, certificacion, precio, imagen } =
    req.body;
  const nombreDeUsuario = req.session.usuario.nombre; // Obtener el nombre de usuario de la sesión

  // Realizar la inserción en la base de datos con el nombre de usuario
  db.query(
    "INSERT INTO vehiculos (marca, nombre, descripcion, certificacion, precio, imagen, UsuarioAgrego) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      marca,
      modelo,
      descripcion,
      certificacion,
      precio,
      imagen,
      nombreDeUsuario,
    ],
    (err, result) => {
      if (err) {
        console.error("Error al agregar vehículo:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        res.redirect("/vehiculo");
      }
    }
  );
});

// Ruta para cerrar sesión
app.get("/cerrar-sesion", (req, res) => {
  // Destruir la sesión del usuario
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      res.status(500).send("Error interno del servidor al cerrar sesión");
    } else {
      // Redirigir al usuario a la página de inicio de sesión u otra página
      res.redirect("/");
    }
  });
});

app.get("/inicio-sesion", (req, res) => {
  // Verificar si hay una sesión activa
  if (req.session.usuario) {
    // El usuario ha iniciado sesión
    // Puedes acceder al nombre de usuario usando req.session.usuario.nombre
    res.render("vehiculo", { usuario: req.session.usuario.nombre });
  } else {
    // El usuario no ha iniciado sesión
    res.render("/", { usuario: null });
  }
});
// Middleware para verificar el rol del usuario
function verificarRol(rolPermitido) {
  return (req, res, next) => {
    if (
      req.session &&
      req.session.usuario &&
      req.session.usuario.rol === rolPermitido
    ) {
      next(); // El usuario tiene el rol adecuado, continuar con la siguiente ruta
    } else {
      res.status(403).send("Acceso denegado"); // El usuario no tiene permiso para acceder
    }
  };
}

// Ruta para agregar un vehículo
app.post("/agregar-vehiculo", (req, res) => {
  // Lógica para agregar un vehículo a la base de datos
  const { marca, nombre, descripcion, certificacion, precio, imagen } =
    req.body;
  const usuarioAgrego = req.session.usuario.nombre; // Obtener el nombre del usuario que inició sesión
  // Agregar el vehículo a la base de datos
  res.redirect("/vehiculos"); // Redireccionar a la página de gestión de vehículos
});

app.get("/vehiculo", (req, res) => {
  // Obtener el usuario de la sesión
  const usuario = req.session.usuario;

  // Obtener los vehículos del usuario actual
  const vehiculosDelUsuario = obtenerVehiculos(usuario);

  // Renderizar la vista vehiculo.ejs y pasar los vehículos y el usuario
  res.render("vehiculo", { vehiculos: vehiculosDelUsuario, usuario: usuario });
});

app.get("/vehiculo", (req, res) => {
  // Obtener datos de vehículos de la base de datos
  db.query("SELECT * FROM vehiculos", (err, results) => {
    if (err) {
      res.status(500).send("Error interno del servidor");
    } else {
      // Renderizar la vista de vehículos y pasar los datos de los vehículos y el usuario
      res.render("vehiculo", { vehiculos: results, usuarios: req.user });
    }
  });
});

//Ruta para editar y eliminar vehiculos

// Ruta para editar un vehículo
app.get("/editar-vehiculo/:id", (req, res) => {
  const vehiculoId = req.params.id;
  // Obtener información del vehículo con el ID proporcionado
  db.query(
    "SELECT * FROM vehiculos WHERE id = ?",
    [vehiculoId],
    (err, result) => {
      if (err) {
        console.error("Error al obtener información del vehículo:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar el formulario de edición de vehículo y pasar los datos del vehículo
        res.render("editar-vehiculo", {
          vehiculo: result[0],
          usuario: req.session.usuario,
        });
      }
    }
  );
});

// Ruta para procesar la edición de un vehículo
app.post("/editar-vehiculo/:id", (req, res) => {
  const vehiculoId = req.params.id;
  const { marca, nombre, descripcion, certificacion, precio, imagen } =
    req.body;
  // Actualizar la información del vehículo en la base de datos
  db.query(
    "UPDATE vehiculos SET marca = ?, nombre = ?, descripcion = ?, certificacion = ?, precio = ?, imagen = ? WHERE id = ?",
    [marca, nombre, descripcion, certificacion, precio, imagen, vehiculoId],
    (err, result) => {
      if (err) {
        console.error("Error al editar vehículo:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        res.redirect("/vehiculo"); // Redirigir a la página de vehículos después de editar
      }
    }
  );
});

// Ruta para borrar un vehículo
app.post("/borrar-vehiculo/:id", (req, res) => {
  const vehiculoId = req.params.id;
  // Eliminar el vehículo de la base de datos
  db.query(
    "DELETE FROM vehiculos WHERE id = ?",
    [vehiculoId],
    (err, result) => {
      if (err) {
        console.error("Error al borrar vehículo:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        res.redirect("/vehiculo"); // Redirigir a la página de vehículos después de borrar
      }
    }
  );
});

// RUTAS PARA LOS VEHICULOS NUEVOS

//Ruta para 'toyota-nuevo' en Express
app.get("/toyota-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Toyota",
    "nuevo",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/toyota-nuevo", { vehiculos });
      }
    }
  );
});

//Ruta para 'toyota-usado' en Express
app.get("/toyota-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "usado"
  obtenerVehiculosPorMarcaYCertificacion(
    "Toyota",
    "usado",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-usado' y pasar los vehículos como datos
        res.render("marcas/toyota-usado", { vehiculos });
      }
    }
  );
});

//Ruta para 'bmw-nuevo' en Express
app.get("/bmw-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion("BMW", "nuevo", (err, vehiculos) => {
    if (err) {
      // Manejar el error si ocurre
      console.error("Error al obtener vehículos:", err);
      res.status(500).send("Error interno del servidor");
    } else {
      // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
      res.render("marcas/bmw-nuevo", { vehiculos });
    }
  });
});

//Ruta para 'bmw-usado' en Express
app.get("/bmw-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion("BMW", "usado", (err, vehiculos) => {
    if (err) {
      // Manejar el error si ocurre
      console.error("Error al obtener vehículos:", err);
      res.status(500).send("Error interno del servidor");
    } else {
      // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
      res.render("marcas/bmw-usado", { vehiculos });
    }
  });
});

//Ruta para 'chevrolet-nuevo' en Express
app.get("/chevrolet-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Chevrolet",
    "nuevo",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/chevrolet-nuevo", { vehiculos });
      }
    }
  );
});

//Ruta para 'chevrolet-usado' en Express
app.get("/chevrolet-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Chevrolet",
    "usado",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/chevrolet-usado", { vehiculos });
      }
    }
  );
});

//Ruta para 'mercedez-benz-nuevo' en Express
app.get("/mercedez-benz-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Mercedez-Benz",
    "nuevo",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/mercedez-benz-nuevo", { vehiculos });
      }
    }
  );
});

//Ruta para 'mercedez-benz-usado' en Express
app.get("/mercedez-benz-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Mercedez-Benz",
    "usado",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/mercedez-benz-usado", { vehiculos });
      }
    }
  );
});

//Ruta para 'nissan-nuevo' en Express
app.get("/nissan-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Nissan",
    "nuevo",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/Nissan-nuevo", { vehiculos });
      }
    }
  );
});

//Ruta para 'nissan-usado' en Express
app.get("/nissan-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Nissan",
    "usado",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/Nissan-usado", { vehiculos });
      }
    }
  );
});

//Ruta para 'renault-nuevo' en Express
app.get("/renault-nuevo", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Renault",
    "nuevo",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/renault-nuevo", { vehiculos });
      }
    }
  );
});

//Ruta para 'renault-usado' en Express
app.get("/renault-usado", (req, res) => {
  // Obtener los vehículos de Toyota con la certificación "nuevo"
  obtenerVehiculosPorMarcaYCertificacion(
    "Renault",
    "usado",
    (err, vehiculos) => {
      if (err) {
        // Manejar el error si ocurre
        console.error("Error al obtener vehículos:", err);
        res.status(500).send("Error interno del servidor");
      } else {
        // Renderizar la vista 'toyota-nuevo' y pasar los vehículos como datos
        res.render("marcas/renault-usado", { vehiculos });
      }
    }
  );
});

// Escuchar en el puerto
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});

function obtenerVehiculosPorMarcaYCertificacion(
  marca,
  certificacion,
  callback
) {
  // Consulta SQL para obtener los vehículos según la marca y la certificación
  const sql = `SELECT * FROM vehiculos WHERE marca = ? AND certificacion = ?`;

  // Ejecutar la consulta SQL
  db.query(sql, [marca, certificacion], (err, results) => {
    if (err) {
      console.error("Error al obtener vehículos:", err);
      return callback(err, null);
    }

    // Devolver los resultados de la consulta
    callback(null, results);
  });
}

function obtenerVehiculos(usuario, callback) {
  // Consulta SQL para obtener los vehículos del usuario actual
  const sql = `SELECT * FROM vehiculos WHERE usuarioAgrego = ?`;

  // Ejecutar la consulta SQL
  db.query(sql, [usuario.nombre], (err, results) => {
    if (err) {
      console.error("Error al obtener vehículos:", err);
      return callback(err, null);
    }

    // Devolver los resultados de la consulta
    callback(null, results);
  });

  const vehiculosDelUsuario = vehiculos.filter(
    (vehiculo) => vehiculo.UsuarioAgrego === usuario.nombre
  );

  return vehiculosDelUsuario;
}