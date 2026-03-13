const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recouvra';

// Connexion à MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(` Serveur démarré sur http://localhost:${PORT}`);
      console.log(` Documentation disponible sur http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error(' Erreur de connexion à MongoDB:', error);
    process.exit(1);
  });

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Connexion MongoDB fermée');
  process.exit(0);
});