const { server, initServer } = require('../server');

module.exports = async (req, res) => {
  await initServer();
  server.emit('request', req, res);
};