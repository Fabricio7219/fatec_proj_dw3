// Dados em memória (simulando banco de dados)
let users = [
  { id: 1, name: "Fabricio", email: "fabricio@example.com" },
  { id: 2, name: "João", email: "joao@example.com" }
];

// Listar todos os usuários
const getAllUsers = (req, res) => {
  res.json(users);
};

// Adicionar usuário
const addUser = (req, res) => {
  const { name, email } = req.body;
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
};

module.exports = { getAllUsers, addUser };
