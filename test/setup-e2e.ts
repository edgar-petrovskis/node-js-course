const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5433',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'change_me',
  DATABASE_NAME: 'node_course',
  JWT_SECRET: 'change_me',
  JWT_REFRESH_SECRET: 'change_me',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'eu-central-1',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  STORAGE_BUCKET: 'node-course-files',
  STORAGE_FORCE_PATH_STYLE: 'true',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
