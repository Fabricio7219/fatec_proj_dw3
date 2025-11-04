const express = require("express");
const router = express.Router();
const docenteController = require("../controllers/docenteController");

console.log("✅ docenteRoutes carregado com sucesso!");

// ✅ Rota de teste (precisa vir antes de /:email)
router.get("/teste", (req, res) => {
  res.json({ ok: "Rota /api/docentes/teste funcionando ✅" });
});

// 🔹 Rotas principais
router.get("/", docenteController.listar);
router.post("/", docenteController.criar);
router.get("/:email", docenteController.buscarPorEmail);
router.put("/:id", docenteController.atualizar);
router.delete("/:id", docenteController.remover);
router.get("/teste", (req, res) => {
  res.json({ ok: "Rota /api/docentes/teste funcionando ✅" });
});


module.exports = router;
