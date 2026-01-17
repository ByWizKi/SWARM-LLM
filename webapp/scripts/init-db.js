#!/usr/bin/env node
/**
 * Script d'initialisation de la base de données
 * Crée les tables Prisma et un utilisateur par défaut
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initialisation de la base de données...');

    // Vérifier si l'utilisateur admin existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { name: 'admin' }
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'admin',
          password: hashedPassword,
        }
      });
      console.log('[INIT_DB] Utilisateur par défaut créé:');
      console.log('  Nom d\'utilisateur: admin');
      console.log('  Mot de passe: admin123');
      console.log('');
      console.log('[INIT_DB] IMPORTANT: Changez le mot de passe après la première connexion!');
    } else {
      console.log('[INIT_DB] Utilisateur admin existe déjà');
    }

    console.log('[INIT_DB] Base de données initialisée avec succès');
  } catch (error) {
    console.error('[INIT_DB] Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();

