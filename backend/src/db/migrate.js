const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');

const ensureMetaTable = async (queryInterface) => {
  await queryInterface.createTable('SequelizeMeta', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }).catch((err) => {
    if (!String(err.message).includes('already exists')) throw err;
  });
};

const getRanMigrations = async () => {
  const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta');
  return new Set(rows.map((row) => row.name));
};

const markMigrationRan = async (name, transaction) => {
  await sequelize.getQueryInterface().bulkInsert('SequelizeMeta', [{
    name,
    createdAt: new Date(),
  }], { transaction });
};

const run = async () => {
  const queryInterface = sequelize.getQueryInterface();
  await sequelize.authenticate();
  await ensureMetaTable(queryInterface);

  const ran = await getRanMigrations();
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const file of files) {
    if (ran.has(file)) {
      console.log(`Skipping migration already applied: ${file}`);
      continue;
    }

    const migrationPath = path.join(migrationsDir, file);
    const migration = require(migrationPath);

    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${file} does not export up()`);
    }

    console.log(`Running migration: ${file}`);
    await sequelize.transaction(async (transaction) => {
      await migration.up({ queryInterface, Sequelize: sequelize.Sequelize, DataTypes, transaction });
      await markMigrationRan(file, transaction);
    });
    console.log(`Finished migration: ${file}`);
  }

  await sequelize.close();
  console.log('All migrations complete.');
};

run().catch(async (err) => {
  console.error('Migration failed:', err);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
