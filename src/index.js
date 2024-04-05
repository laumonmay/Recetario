// 1. IMPORTACIÓN DE BIBLIOTECAS //
//================================
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

// 2. CREACIÓN DEL SERVIDOR //
//===========================
const server = express();

// 3. CONFIGURACIÓN DEL SERVIDOR //
//================================
server.use(express.json({ limit: "25mb" }));
server.use(cors());

// 4. ARRANCAMOS EL SERVIDOR EN UN PUERTO //
//=========================================
const port = 3000;

server.listen(port, () => {
  console.log(`El servidor esta iniciado en <http://localhost:${port}>`);
});

// 5. CREACIÓN DE LA CONEXIÓN A MYSQL //
//=====================================

async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_SCHEMA,
  });

  await connection.connect();
  console.log(
    `conexión establecida con la base de datos (identificador =${connection.threadId})`
  );

  return connection;
}

// 6. ENDPOINTS //
//=============================

// mensaje de error si algun campo no existe o esta vacio

const errorResponse = (message) => {
  return {
    success: false,
    error: message,
  };
};

// A) Endpoint para OBTENER el listado de todas las recetas (GET /api/recetas)

server.get("/api/recetas", async (req, res) => {
  try {
    //intenta este codigo
    const conn = await getConnection();

    const queryGetAllRecipes = `
        SELECT *
        FROM recetas
        WHERE nombre 
        LIKE ?;`;

    const [results] = await conn.query(queryGetAllRecipes, [
      req.query.search ? `%${req.query.search}%` : "%",
    ]);

    conn.end();

    res.json({
      info: { count: results.length },
      nombre: results,
    });
  } catch (error) {
    // y si no puedes, me salras este error
    res.status(400).json(errorResponse("¡Oops! 🙊 ¡Vuelve a intentarlo! 💪"));
  }
});

// B) Endpoint para OBTENER una receta por su ID (GET /api/recetas/:id)

server.get("/api/recetas/:id", async (req, res) => {
  const recipeId = req.params.id;

  if (isNaN(parseInt(recipeId))) {
    // si req.params.id no es un numero salta el error
    return res
      .status(400)
      .json(
        errorResponse("¡🚫 Error culinario! ¡El id debe ser un número! 🧐")
      );
  }

  try {
    const conn = await getConnection();

    const queryGetOneRecipe = `
            SELECT *
            FROM recetas
            WHERE id LIKE ?;`;

    const [results] = await conn.query(queryGetOneRecipe, [req.params.id]);

    conn.end();

    if (results.length === 0) {
      // el array esta vacio me salta el error
      return res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Este id no existe! 😥"));
    }

    res.json({
      success: true,
      receta: results[0],
    });
  } catch (error) {
    res.status(400).json(errorResponse("¡Oops! 🙊 ¡Vuelve a intentarlo! 💪"));
  }
});

// C) Endpoint para CREAR una nueva receta (POST /api/recetas)

server.post("/api/recetas", async (req, res) => {
  try {
    if (
      !req.body.nombre ||
      req.body.nombre === "" ||
      !req.body.ingredientes ||
      req.body.ingredientes === "" ||
      !req.body.instrucciones ||
      req.body.instrucciones === ""
    ) {
      res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Revisa los detalles! 🧐"));
      return;
    }

    const conn = await getConnection();

    // Query de comprobacion de si existe una receta con el mismo nombre
    const queryRepeatRecipe = ` 
            SELECT nombre 
            FROM recetas
            WHERE nombre = ?`;

    const [repeatResult] = await conn.query(queryRepeatRecipe, [
      req.body.nombre,
    ]);
    console.log(repeatResult);

    if (repeatResult.length > 0) {
      // si el array no esta vacio es que ya hay una receta con ese nombre asi que me saltas el error
      res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Esta receta ya existe! 🧐"));
      return; // y si no, continuas con el proceso
    }

    const queryInsertRecipe = `
        INSERT INTO recetas (nombre, ingredientes, instrucciones)
        VALUES (?,?,?);`;

    const [insertResult] = await conn.execute(queryInsertRecipe, [
      req.body.nombre,
      req.body.ingredientes,
      req.body.instrucciones,
    ]);

    conn.end();

    res.json({
      success: true,
      message: "¡Receta creada! 🎉 A cocinar se ha dicho. 🍳",
      id: insertResult.insertId,
    });
  } catch (error) {
    res.status(400).json(errorResponse("¡Oops! 🙊 ¡Vuelve a intentarlo! 💪"));
  }
});

// D) Endpoint para ACTUALIZAR una receta existente (PUT /api/recetas/:id)

server.put("/api/recetas/:id", async (req, res) => {
  const recipeId = req.params.id;

  if (isNaN(parseInt(recipeId))) {
    // si req.params.id no es un numero salta el error
    return res
      .status(400)
      .json(
        errorResponse("¡🚫 Error culinario! ¡El id debe ser un número! 🧐")
      );
  }

  try {
    if (
      !req.body.nombre ||
      req.body.nombre === "" ||
      !req.body.ingredientes ||
      req.body.ingredientes === "" ||
      !req.body.instrucciones ||
      req.body.instrucciones === ""
    ) {
      res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Revisa los detalles! 🧐"));
      return;
    }

    const conn = await getConnection();

    // Query de comprobacion de si el id existe

    const queryCheckId = `
        SELECT *
        FROM recetas
        WHERE id LIKE ?;`;

    const [checkIdResult] = await conn.query(queryCheckId, [recipeId]);

    if (checkIdResult.length === 0) {
      // si el array esta vacio es que el id no existe asique me saltas el error
      res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Este id no existe! 🧐"));
      return;
    }

    const queryUpdateRecipe = `
            UPDATE recetas
            SET nombre = ?, ingredientes = ?, instrucciones = ?
            WHERE id = ?`;

    const [updateResults] = await conn.execute(queryUpdateRecipe, [
      req.body.nombre,
      req.body.ingredientes,
      req.body.instrucciones,
      req.params.id,
    ]);

    conn.end();

    res.json({
      success: true,
      message: "¡Receta mejorada! 🎉¡A disfrutar cocinando! 🍳",
    });
  } catch (error) {
    res.status(400).json(errorResponse("¡Oops! 🙊 ¡Vuelve a intentarlo! 💪"));
  }
});

// E) Endpoint para BORRAR una receta (DELETE /api/recetas/:id)

server.delete("/api/recetas/:id", async (req, res) => {
  const recipeId = req.params.id;

  if (isNaN(parseInt(recipeId))) {
    // si req.params.id no es un numero salta el error
    return res
      .status(400)
      .json(
        errorResponse("¡🚫 Error culinario! ¡El id debe ser un número! 🧐")
      );
  }

  try {
    const conn = await getConnection();

    const queryCheckId = `
        SELECT *
        FROM recetas
        WHERE id LIKE ?;`;

    const [checkIdResult] = await conn.query(queryCheckId, [recipeId]);

    if (checkIdResult.length === 0) {
      res
        .status(400)
        .json(errorResponse("¡🚫 Error culinario! ¡Este id no existe! 🧐"));
      return;
    }

    const queryDeleteRecipe = `
        DELETE FROM recetas
            WHERE id = ?`;

    const [deleteResults] = await conn.execute(queryDeleteRecipe, [
      req.params.id,
    ]);

    conn.end();

    res.json({
      success: true,
      message: "Receta evaporada con éxito 🗑️",
    });
  } catch (error) {
    res.status(400).json(errorResponse("¡Oops! 🙊 ¡Vuelve a intentarlo! 💪"));
  }
});
