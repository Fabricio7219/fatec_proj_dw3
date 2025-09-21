const express = require("express");
const router = express.Router();
const { getAllUsers, addUser } = require("../controllers/userController");

// Rota de teste simples
router.get("/", (req, res) => res.send("API funcionando!"));

// Rotas de usuários
router.get("/users", getAllUsers);
router.post("/users", addUser);

module.exports = router;
